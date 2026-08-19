import type { OpeningMove } from './OpeningMove'

export type OpeningNodeType =
  | 'learner-decision'
  | 'opponent-branch'
  | 'completion'

export type OpeningConcept =
  | 'centre'
  | 'development'
  | 'king-safety'
  | 'tempo'

export type HintQuality = 'weak' | 'medium' | 'strong' | 'exceptional'

export type HintPool = Record<HintQuality, readonly string[]>

interface OpeningNodeBase {
  id: string
  fen: string
  positionKey: string
  sideToMove: 'white' | 'black'
  curriculumStageId: string
  type: OpeningNodeType
  theoreticalImportance: number
  prompt: string
  errorExplanation: string
  hints: HintPool
  tags: readonly OpeningConcept[]
  prerequisites: readonly string[]
}

export interface LearnerDecisionNode extends OpeningNodeBase {
  type: 'learner-decision'
  acceptedLearnerMoves: readonly OpeningMove[]
  preferredTrainingMove: OpeningMove
  opponentMoves: readonly []
}

export interface OpponentBranchNode extends OpeningNodeBase {
  type: 'opponent-branch'
  acceptedLearnerMoves: readonly []
  preferredTrainingMove: null
  opponentMoves: readonly OpeningMove[]
}

export interface CompletionNode extends OpeningNodeBase {
  type: 'completion'
  acceptedLearnerMoves: readonly []
  preferredTrainingMove: null
  opponentMoves: readonly []
}

export type OpeningNode =
  | LearnerDecisionNode
  | OpponentBranchNode
  | CompletionNode
