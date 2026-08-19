import type { ChessSquare } from '../domain/chess/ChessRules'
import type { PersistedTrainingPhase } from './progress/ProgressRepository'

export type TrainingPhase = PersistedTrainingPhase

export interface BoardMoveView {
  from: ChessSquare
  to: ChessSquare
  san: string
}

export interface LessonResultView {
  title: string
  message: string
  concept: string
  learnerMoveSequence: readonly string[]
  hasNextLesson: boolean
}

export interface GameViewModel {
  fen: string
  nodeId: string
  phase: TrainingPhase
  isBoardInteractive: boolean
  stageIndex: number
  stageTitle: string
  stageLessonsCompleted: number
  stageLessonsTotal: number
  lessonId: string
  lessonTitle: string
  lessonConcept: string
  coachLabel: string
  prompt: string
  feedback: string | null
  moveHistory: readonly string[]
  lastMove: BoardMoveView | null
  learnerMovesCompleted: number
  learnerMovesTotal: number
  completedLessons: number
  totalLessons: number
  result: LessonResultView | null
}

export type MoveResultKind =
  | 'accepted'
  | 'lesson-discovered'
  | 'lesson-complete'
  | 'illegal'
  | 'outside-training-line'
  | 'not-awaiting-move'

export interface MoveResult {
  kind: MoveResultKind
  view: GameViewModel
}
