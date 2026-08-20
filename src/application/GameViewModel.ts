import type { ChessSquare } from '../domain/chess/ChessRules'
import type { SessionStrategy } from '../domain/session/SessionDirector'
import type { PersistedTrainingPhase } from './progress/ProgressRepository'

export type TrainingPhase = PersistedTrainingPhase

export interface BoardMoveView {
  from: ChessSquare
  to: ChessSquare
  san: string
}

export interface TrainingResultView {
  title: string
  message: string
  concepts: readonly string[]
  learnerMoveSequence: readonly string[]
  primaryLabel: string
}

export interface GameViewModel {
  fen: string
  nodeId: string
  phase: TrainingPhase
  isBoardInteractive: boolean
  stageIndex: number
  stageTitle: string
  stageMovesCompleted: number
  stageMovesTotal: number
  coachLabel: string
  prompt: string
  feedback: string | null
  hint: string | null
  canRequestHint: boolean
  moveHistory: readonly string[]
  lastMove: BoardMoveView | null
  learnerMovesCompleted: number
  learnerMovesTotal: number
  completedStages: number
  totalStages: number
  masteryScore: number
  coverageCount: number
  coverageTotal: number
  dueCount: number
  currentNodeMastery: number
  runsCompleted: number
  deepestRun: number
  lastBranchStrategy: SessionStrategy | null
  result: TrainingResultView | null
}

export type MoveResultKind =
  | 'accepted'
  | 'checkpoint-ready'
  | 'stage-complete'
  | 'run-complete'
  | 'illegal'
  | 'outside-training-line'
  | 'not-awaiting-move'

export interface MoveResult {
  kind: MoveResultKind
  view: GameViewModel
}
