import type { NodeMastery } from '../../domain/mastery/NodeMastery'
import type { HintQuality } from '../../domain/opening/OpeningNode'
import type { RunState, RunStatus } from '../../domain/run/RunEngine'

export type PersistedTrainingPhase =
  | 'discovering'
  | 'checkpoint-ready'
  | 'checkpoint'
  | 'stage-complete'
  | 'adaptive-ready'
  | 'adaptive-run'
  | 'run-complete'
  | 'run-over'

export interface PersistedSession {
  currentNodeId: string
  fen: string
  moveHistory: readonly string[]
  learnerMovesCompleted: number
  currentHintsUsed: number
  currentHintQuality: HintQuality | null
  seenHintTexts: readonly string[]
  recoveredAfterError: boolean
  runState: RunState | null
  improvedNodeIds: readonly string[]
  branchLabels: readonly string[]
}

export interface RunSummary {
  outcome: Exclude<RunStatus, 'active'>
  decisions: number
  deepestPoint: number
  mistakes: number
  hintsPurchased: number
  goldEarned: number
  goldSpent: number
  bestStreak: number
  improvedNodeIds: readonly string[]
  branchLabels: readonly string[]
  boss?: boolean
  bossVictory?: boolean
}

export interface PlayerProgressV3 {
  schemaVersion: 3
  phase: PersistedTrainingPhase
  activeStageIndex: number
  completedStageIds: readonly string[]
  masteryByNodeId: Readonly<Record<string, NodeMastery>>
  randomSeed: number
  directorDecisionIndex: number
  runsCompleted: number
  deepestRun: number
  goldBalance: number
  bestStreak: number
  hintDrawIndex: number
  lastRun: RunSummary | null
  session: PersistedSession | null
  bossVictories?: number
}

export interface ProgressRepository {
  load(): PlayerProgressV3 | null
  save(progress: PlayerProgressV3): void
  reset(): void
  exportData(): string | null
  importData(serialized: string): PlayerProgressV3
}
