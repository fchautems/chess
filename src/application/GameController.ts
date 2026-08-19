import type { ChessMoveInput, ChessRules } from '../domain/chess/ChessRules'
import type { OpeningGraph } from '../domain/opening/OpeningGraph'
import { toUci } from '../domain/opening/OpeningMove'
import type { OpeningNode } from '../domain/opening/OpeningNode'
import type {
  GameViewModel,
  MoveResult,
  MoveResultKind,
  TrainingStatus,
} from './GameViewModel'

export class GameController {
  private currentNodeId: string
  private status: TrainingStatus = 'awaiting-learner'
  private feedback: string | null = null
  private moveHistory: string[] = []
  private learnerMovesCompleted = 0

  constructor(
    private readonly graph: OpeningGraph,
    private readonly rules: ChessRules,
    private readonly startNodeId: string,
  ) {
    this.currentNodeId = startNodeId
    this.rules.load(this.currentNode().fen)
    this.assertPositionMatchesNode(this.currentNode())
  }

  submitLearnerMove(move: ChessMoveInput): MoveResult {
    const node = this.currentNode()

    if (this.status !== 'awaiting-learner' || node.type !== 'learner-decision') {
      return this.result('not-awaiting-move')
    }

    const previousFen = this.rules.fen()
    const appliedMove = this.rules.move(move)

    if (!appliedMove) {
      this.feedback = 'Ce déplacement n’est pas légal dans cette position.'
      return this.result('illegal')
    }

    const acceptedMove = node.acceptedLearnerMoves.find(
      (candidate) => toUci(candidate) === appliedMove.uci,
    )

    if (!acceptedMove) {
      this.rules.load(previousFen)
      this.feedback = node.errorExplanation
      return this.result('outside-training-line')
    }

    this.feedback = null
    this.moveHistory.push(appliedMove.san)
    this.learnerMovesCompleted += 1
    this.currentNodeId = acceptedMove.targetNodeId
    this.assertPositionMatchesNode(this.currentNode())
    this.playScriptedOpponentMoves()

    return this.result(
      this.currentNode().type === 'completion' ? 'complete' : 'accepted',
    )
  }

  reset(): GameViewModel {
    this.currentNodeId = this.startNodeId
    this.status = 'awaiting-learner'
    this.feedback = null
    this.moveHistory = []
    this.learnerMovesCompleted = 0
    this.rules.load(this.currentNode().fen)

    return this.getViewModel()
  }

  getViewModel(): GameViewModel {
    const node = this.currentNode()
    const stage = this.graph.getStage(node.curriculumStageId)

    return {
      fen: this.rules.fen(),
      nodeId: node.id,
      stageTitle: stage.title,
      prompt: node.prompt,
      feedback: this.feedback,
      status: this.status,
      moveHistory: [...this.moveHistory],
      learnerMovesCompleted: this.learnerMovesCompleted,
      learnerMovesTotal: stage.criticalNodeIds.length,
    }
  }

  private playScriptedOpponentMoves(): void {
    let node = this.currentNode()

    while (node.type === 'opponent-branch') {
      const reply = node.opponentMoves[0]

      if (!reply) {
        throw new Error(`Opponent node ${node.id} has no scripted reply`)
      }

      const appliedMove = this.rules.move(reply)

      if (!appliedMove) {
        throw new Error(`Scripted opponent move ${reply.san} is illegal at ${node.id}`)
      }

      this.moveHistory.push(appliedMove.san)
      this.currentNodeId = reply.targetNodeId
      node = this.currentNode()
      this.assertPositionMatchesNode(node)
    }

    if (node.type === 'completion') {
      this.status = 'complete'
    }
  }

  private currentNode(): OpeningNode {
    return this.graph.getNode(this.currentNodeId)
  }

  private assertPositionMatchesNode(node: OpeningNode): void {
    if (this.rules.positionKey() !== node.positionKey) {
      throw new Error(
        `Position mismatch at ${node.id}: expected ${node.positionKey}, received ${this.rules.positionKey()}`,
      )
    }

    if (this.rules.turn() !== node.sideToMove) {
      throw new Error(`Side-to-move mismatch at ${node.id}`)
    }
  }

  private result(kind: MoveResultKind): MoveResult {
    return { kind, view: this.getViewModel() }
  }
}
