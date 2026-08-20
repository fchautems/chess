import type {
  PersistedSession,
  PersistedTrainingPhase,
  PlayerProgressV2,
  ProgressRepository,
} from '../../application/progress/ProgressRepository'
import type { NodeMastery } from '../../domain/mastery/NodeMastery'

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
])

const lessonToNode: Readonly<Record<string, string>> = {
  'lesson-e4': 'italian-start',
  'lesson-nf3': 'italian-after-e4-e5',
  'lesson-bc4': 'italian-after-nc6',
  'lesson-d3': 'italian-after-bc5',
  'lesson-castle': 'italian-after-nf6',
  'lesson-c3': 'italian-after-d6',
}

function parseProgress(serialized: string): PlayerProgressV2 {
  const value: unknown = JSON.parse(serialized)

  if (!value || typeof value !== 'object') {
    throw new Error('La sauvegarde ne contient pas un objet valide.')
  }

  const schemaVersion = (value as { schemaVersion?: unknown }).schemaVersion

  if (schemaVersion === 1) {
    return migrateLegacyProgress(value as LegacyProgressV1)
  }

  if (schemaVersion !== 2) {
    throw new Error('Version de sauvegarde non prise en charge.')
  }

  const candidate = value as Partial<PlayerProgressV2>

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
    !isSession(candidate.session)
  ) {
    throw new Error('La sauvegarde est incomplète ou corrompue.')
  }

  return {
    schemaVersion: 2,
    phase: candidate.phase,
    activeStageIndex: candidate.activeStageIndex as number,
    completedStageIds: [...new Set(candidate.completedStageIds)],
    masteryByNodeId: cloneMastery(candidate.masteryByNodeId),
    randomSeed: candidate.randomSeed as number,
    directorDecisionIndex: candidate.directorDecisionIndex as number,
    runsCompleted: candidate.runsCompleted as number,
    deepestRun: candidate.deepestRun as number,
    session: candidate.session ? { ...candidate.session } : null,
  }
}

function migrateLegacyProgress(value: LegacyProgressV1): PlayerProgressV2 {
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
    schemaVersion: 2,
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
    session: null,
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
    typeof candidate.recoveredAfterError === 'boolean'
  )
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

  load(): PlayerProgressV2 | null {
    let serialized: string | null

    try {
      serialized = this.storage.getItem(this.key)
    } catch {
      return null
    }

    if (!serialized) return null

    try {
      const progress = parseProgress(serialized)

      if ((JSON.parse(serialized) as { schemaVersion?: number }).schemaVersion === 1) {
        this.save(progress)
      }

      return progress
    } catch {
      return null
    }
  }

  save(progress: PlayerProgressV2): void {
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

  importData(serialized: string): PlayerProgressV2 {
    const progress = parseProgress(serialized)
    this.save(progress)
    return progress
  }
}
