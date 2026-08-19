export type TrainingStatus = 'awaiting-learner' | 'complete'

export interface GameViewModel {
  fen: string
  nodeId: string
  stageTitle: string
  prompt: string
  feedback: string | null
  status: TrainingStatus
  moveHistory: readonly string[]
  learnerMovesCompleted: number
  learnerMovesTotal: number
}

export type MoveResultKind =
  | 'accepted'
  | 'complete'
  | 'illegal'
  | 'outside-training-line'
  | 'not-awaiting-move'

export interface MoveResult {
  kind: MoveResultKind
  view: GameViewModel
}
