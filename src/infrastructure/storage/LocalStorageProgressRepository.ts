import type {
  PersistedSession,
  PersistedTrainingPhase,
  PlayerProgressV3,
  ProgressRepository,
  RunSummary,
} from '../../application/progress/ProgressRepository'
import type { NodeMastery } from '../../domain/mastery/NodeMastery'
import type { RunState } from '../../domain/run/RunEngine'

interface StoragePort {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

interface LegacyProgressV1 {
  schemaVersion: 1
  activeLessonId: string
  phase: string
  completedLessonIds: readonly string[]
}

interface LegacySessionV2 {
  currentNodeId: string
  fen: string
  moveHistory: readonly string[]
  learnerMovesCompleted: number
  currentHintsUsed: number
  recoveredAfterError: boolean
}

interface LegacyProgressV2 {
  schemaVersion: 2
  phase: Exclude<PersistedTrainingPhase, 'run-over'>
  activeStageIndex: number
  completedStageIds: readonly string[]
  masteryByNodeId: Readonly<Record<string, NodeMastery>>
  randomSeed: number
  directorDecisionIndex: number
  runsCompleted: number
  deepestRun: number
  session: LegacySessionV2 | null
}

const STORAGE_KEY = 'chess-openings-trainer.progress'
const DEFAULT_SEED = 73_941

const phases = new Set<PersistedTrainingPhase>([
  'discovering',
  'checkpoint-ready',
  'checkpoint',
  'stage-complete',
  'adaptive-ready',
  'adaptive-run',
  'run-complete',
  'run-over',
])

const lessonToNode: Readonly<Record<string, string>> = {
  'lesson-e4': 'italian-start',
  'lesson-nf3': 'italian-after-e4-e5',
  'lesson-bc4': 'italian-after-nc6',
  'lesson-d3': 'italian-after-bc5',
  'lesson-castle': 'italian-after-nf6',
  'lesson-c3': 'italian-after-d6',
}

function parseProgress(serialized: string): PlayerProgressV3 {
  const value: unknown = JSON.parse(serialized)

  if (!value || typeof value !== 'object') {
    throw new Error('La sauvegarde ne contient pas un objet valide.')
  }

  const schemaVersion = (value as { schemaVersion?: unknown }).schemaVersion

  if (schemaVersion === 1) {
    return migrateLegacyProgress(value as LegacyProgressV1)
  }

  if (schemaVersion === 2) {
    return migrateV2Progress(value as LegacyProgressV2)
  }

  if (schemaVersion !== 3) {
    throw new Error('Version de sauvegarde non prise en charge.')
  }

  const candidate = value as Partial<PlayerProgressV3>

  if (
    !candidate.phase ||
    !phases.has(candidate.phase) ||
    !Number.isInteger(candidate.activeStageIndex) ||
    !Array.isArray(candidate.completedStageIds) ||
    !candidate.completedStageIds.every((id) => typeof id === 'string') ||
    !isMasteryRecord(candidate.masteryByNodeId) ||
    !Number.isInteger(candidate.randomSeed) ||
    !Number.isInteger(candidate.directorDecisionIndex) ||
    !Number.isInteger(candidate.runsCompleted) ||
    !Number.isInteger(candidate.deepestRun) ||
    !Number.isInteger(candidate.goldBalance) ||
    !Number.isInteger(candidate.bestStreak) ||
    !Number.isInteger(candidate.hintDrawIndex) ||
    (candidate.bossVictories !== undefined &&
      !Number.isInteger(candidate.bossVictories)) ||
    !isRunSummary(candidate.lastRun) ||
    !isSession(candidate.session)
  ) {
    throw new Error('La sauvegarde est incomplète ou corrompue.')
  }

  return {
    schemaVersion: 3,
    phase: candidate.phase,
    activeStageIndex: candidate.activeStageIndex as number,
    completedStageIds: [...new Set(candidate.completedStageIds)],
    masteryByNodeId: cloneMastery(candidate.masteryByNodeId),
    randomSeed: candidate.randomSeed as number,
    directorDecisionIndex: candidate.directorDecisionIndex as number,
    runsCompleted: candidate.runsCompleted as number,
    deepestRun: candidate.deepestRun as number,
    goldBalance: candidate.goldBalance as number,
    bestStreak: candidate.bestStreak as number,
    hintDrawIndex: candidate.hintDrawIndex as number,
    lastRun: candidate.lastRun ? { ...candidate.lastRun } : null,
    session: candidate.session ? { ...candidate.session } : null,
    ...(candidate.bossVictories === undefined
      ? {}
      : { bossVictories: candidate.bossVictories }),
  }
}

function migrateLegacyProgress(value: LegacyProgressV1): PlayerProgressV3 {
  if (
    typeof value.activeLessonId !== 'string' ||
    !Array.isArray(value.completedLessonIds) ||
    !value.completedLessonIds.every((id) => typeof id === 'string')
  ) {
    throw new Error('La sauvegarde v0.2 est incomplète ou corrompue.')
  }

  const completedLessons = [...new Set(value.completedLessonIds)]
  const masteryByNodeId: Record<string, NodeMastery> = {}

  for (const lessonId of completedLessons) {
    const nodeId = lessonToNode[lessonId]

    if (nodeId) {
      masteryByNodeId[nodeId] = {
        nodeId,
        score: 60,
        attempts: 2,
        successes: 2,
        currentStreak: 2,
        hintsUsed: 0,
        lastReviewedAt: null,
        nextReviewAt: 0,
      }
    }
  }

  const completed = new Set(completedLessons)
  const stage0Complete = ['lesson-e4', 'lesson-nf3', 'lesson-bc4'].every((id) =>
    completed.has(id),
  )
  const stage1Complete =
    stage0Complete &&
    ['lesson-d3', 'lesson-castle', 'lesson-c3'].every((id) => completed.has(id))

  return {
    schemaVersion: 3,
    phase: stage1Complete ? 'adaptive-ready' : 'discovering',
    activeStageIndex: stage0Complete ? 1 : 0,
    completedStageIds: [
      ...(stage0Complete ? ['italian-stage-0'] : []),
      ...(stage1Complete ? ['italian-stage-1'] : []),
    ],
    masteryByNodeId,
    randomSeed: DEFAULT_SEED,
    directorDecisionIndex: 0,
    runsCompleted: 0,
    deepestRun: 0,
    goldBalance: 15,
    bestStreak: 0,
    hintDrawIndex: 0,
    lastRun: null,
    session: null,
    bossVictories: 0,
  }
}

function migrateV2Progress(value: LegacyProgressV2): PlayerProgressV3 {
  if (
    !value.phase ||
    !phases.has(value.phase) ||
    !Number.isInteger(value.activeStageIndex) ||
    !Array.isArray(value.completedStageIds) ||
    !value.completedStageIds.every((id) => typeof id === 'string') ||
    !isMasteryRecord(value.masteryByNodeId) ||
    !Number.isInteger(value.randomSeed) ||
    !Number.isInteger(value.directorDecisionIndex) ||
    !Number.isInteger(value.runsCompleted) ||
    !Number.isInteger(value.deepestRun) ||
    !isLegacySession(value.session)
  ) {
    throw new Error('La sauvegarde v0.3 est incomplète ou corrompue.')
  }

  return {
    schemaVersion: 3,
    phase: value.phase,
    activeStageIndex: value.activeStageIndex,
    completedStageIds: [...new Set(value.completedStageIds)],
    masteryByNodeId: cloneMastery(value.masteryByNodeId),
    randomSeed: value.randomSeed,
    directorDecisionIndex: value.directorDecisionIndex,
    runsCompleted: value.runsCompleted,
    deepestRun: value.deepestRun,
    goldBalance: 15,
    bestStreak: 0,
    hintDrawIndex: 0,
    lastRun: null,
    session: value.session
      ? {
          ...value.session,
          currentHintQuality: null,
          seenHintTexts: [],
          runState: value.phase === 'adaptive-run' ? createMigratedRunState() : null,
          improvedNodeIds: [],
          branchLabels: [],
        }
      : null,
    bossVictories: 0,
  }
}

function isMasteryRecord(
  value: unknown,
): value is Readonly<Record<string, NodeMastery>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false

  return Object.entries(value).every(([nodeId, mastery]) => {
    if (!mastery || typeof mastery !== 'object') return false
    const candidate = mastery as Partial<NodeMastery>
    return (
      candidate.nodeId === nodeId &&
      typeof candidate.score === 'number' &&
      typeof candidate.attempts === 'number' &&
      typeof candidate.successes === 'number' &&
      typeof candidate.currentStreak === 'number' &&
      typeof candidate.hintsUsed === 'number' &&
      (candidate.lastReviewedAt === null ||
        typeof candidate.lastReviewedAt === 'number') &&
      typeof candidate.nextReviewAt === 'number'
    )
  })
}

function isSession(value: unknown): value is PersistedSession | null {
  if (value === null) return true
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<PersistedSession>
  return (
    typeof candidate.currentNodeId === 'string' &&
    typeof candidate.fen === 'string' &&
    Array.isArray(candidate.moveHistory) &&
    candidate.moveHistory.every((move) => typeof move === 'string') &&
    typeof candidate.learnerMovesCompleted === 'number' &&
    typeof candidate.currentHintsUsed === 'number' &&
    (candidate.currentHintQuality === null ||
      candidate.currentHintQuality === 'weak' ||
      candidate.currentHintQuality === 'medium' ||
      candidate.currentHintQuality === 'strong' ||
      candidate.currentHintQuality === 'exceptional') &&
    Array.isArray(candidate.seenHintTexts) &&
    candidate.seenHintTexts.every((text) => typeof text === 'string') &&
    typeof candidate.recoveredAfterError === 'boolean' &&
    isRunState(candidate.runState) &&
    Array.isArray(candidate.improvedNodeIds) &&
    candidate.improvedNodeIds.every((id) => typeof id === 'string') &&
    Array.isArray(candidate.branchLabels) &&
    candidate.branchLabels.every((label) => typeof label === 'string')
  )
}

function isLegacySession(value: unknown): value is LegacySessionV2 | null {
  if (value === null) return true
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<LegacySessionV2>
  return (
    typeof candidate.currentNodeId === 'string' &&
    typeof candidate.fen === 'string' &&
    Array.isArray(candidate.moveHistory) &&
    candidate.moveHistory.every((move) => typeof move === 'string') &&
    typeof candidate.learnerMovesCompleted === 'number' &&
    typeof candidate.currentHintsUsed === 'number' &&
    typeof candidate.recoveredAfterError === 'boolean'
  )
}

function isRunState(value: unknown): value is RunState | null {
  if (value === null) return true
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<RunState>
  return (
    (candidate.status === 'active' ||
      candidate.status === 'completed' ||
      candidate.status === 'out-of-lives') &&
    Number.isInteger(candidate.lives) &&
    Number.isInteger(candidate.streak) &&
    Number.isInteger(candidate.bestStreak) &&
    Number.isInteger(candidate.decisions) &&
    Number.isInteger(candidate.mistakes) &&
    Number.isInteger(candidate.hintsPurchased) &&
    Number.isInteger(candidate.goldEarned) &&
    Number.isInteger(candidate.goldSpent)
  )
}

function isRunSummary(value: unknown): value is RunSummary | null {
  if (value === null) return true
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<RunSummary>
  return (
    (candidate.outcome === 'completed' || candidate.outcome === 'out-of-lives') &&
    Number.isInteger(candidate.decisions) &&
    Number.isInteger(candidate.deepestPoint) &&
    Number.isInteger(candidate.mistakes) &&
    Number.isInteger(candidate.hintsPurchased) &&
    Number.isInteger(candidate.goldEarned) &&
    Number.isInteger(candidate.goldSpent) &&
    Number.isInteger(candidate.bestStreak) &&
    Array.isArray(candidate.improvedNodeIds) &&
    candidate.improvedNodeIds.every((id) => typeof id === 'string') &&
    Array.isArray(candidate.branchLabels) &&
    candidate.branchLabels.every((label) => typeof label === 'string')
  )
}

function createMigratedRunState(): RunState {
  return {
    status: 'active',
    lives: 3,
    streak: 0,
    bestStreak: 0,
    decisions: 0,
    mistakes: 0,
    hintsPurchased: 0,
    goldEarned: 0,
    goldSpent: 0,
  }
}

function cloneMastery(
  masteryByNodeId: Readonly<Record<string, NodeMastery>>,
): Record<string, NodeMastery> {
  return Object.fromEntries(
    Object.entries(masteryByNodeId).map(([nodeId, mastery]) => [
      nodeId,
      { ...mastery },
    ]),
  )
}

export class LocalStorageProgressRepository implements ProgressRepository {
  constructor(
    private readonly storage: StoragePort,
    private readonly key = STORAGE_KEY,
  ) {}

  load(): PlayerProgressV3 | null {
    let serialized: string | null

    try {
      serialized = this.storage.getItem(this.key)
    } catch {
      return null
    }

    if (!serialized) return null

    try {
      const progress = parseProgress(serialized)

      if ((JSON.parse(serialized) as { schemaVersion?: number }).schemaVersion !== 3) {
        this.save(progress)
      }

      return progress
    } catch {
      return null
    }
  }

  save(progress: PlayerProgressV3): void {
    try {
      this.storage.setItem(this.key, JSON.stringify(progress))
    } catch {
      // Training remains usable when browser storage is unavailable.
    }
  }

  reset(): void {
    try {
      this.storage.removeItem(this.key)
    } catch {
      // Nothing else to reset when browser storage is unavailable.
    }
  }

  exportData(): string | null {
    try {
      return this.storage.getItem(this.key)
    } catch {
      return null
    }
  }

  importData(serialized: string): PlayerProgressV3 {
    const progress = parseProgress(serialized)
    this.save(progress)
    return progress
  }
}
