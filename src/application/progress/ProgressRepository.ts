import type { NodeMastery } from '../../domain/mastery/NodeMastery'

export type PersistedTrainingPhase =
  | 'discovering'
  | 'checkpoint-ready'
  | 'checkpoint'
  | 'stage-complete'
  | 'adaptive-ready'
  | 'adaptive-run'
  | 'run-complete'

export interface PersistedSession {
  currentNodeId: string
  fen: string
  moveHistory: readonly string[]
  learnerMovesCompleted: number
  currentHintsUsed: number
  recoveredAfterError: boolean
}

export interface PlayerProgressV2 {
  schemaVersion: 2
  phase: PersistedTrainingPhase
  activeStageIndex: number
  completedStageIds: readonly string[]
  masteryByNodeId: Readonly<Record<string, NodeMastery>>
  randomSeed: number
  directorDecisionIndex: number
  runsCompleted: number
  deepestRun: number
  session: PersistedSession | null
}

export interface ProgressRepository {
  load(): PlayerProgressV2 | null
  save(progress: PlayerProgressV2): void
  reset(): void
  exportData(): string | null
  importData(serialized: string): PlayerProgressV2
}
