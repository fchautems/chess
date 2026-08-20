import type { NodeMastery } from '../mastery/NodeMastery'
import type { OpeningGraph } from '../opening/OpeningGraph'
import type { OpeningMove } from '../opening/OpeningMove'
import type { OpponentBranchNode } from '../opening/OpeningNode'
import { seededUnit } from './SeededRandom'

export type SessionStrategy = 'targeted' | 'consolidation' | 'surprise'

export interface DirectedMove {
  move: OpeningMove
  strategy: SessionStrategy
}

export class SessionDirector {
  constructor(private readonly graph: OpeningGraph) {}

  choose(
    node: OpponentBranchNode,
    masteryByNodeId: ReadonlyMap<string, NodeMastery>,
    now: number,
    seed: number,
    decisionIndex: number,
  ): DirectedMove {
    if (node.opponentMoves.length === 0) {
      throw new Error(`Opponent node ${node.id} has no reply`)
    }

    if (node.opponentMoves.length === 1) {
      return { move: node.opponentMoves[0], strategy: 'consolidation' }
    }

    const roll = seededUnit(seed, decisionIndex)
    const strategy: SessionStrategy =
      roll < 0.7 ? 'targeted' : roll < 0.9 ? 'consolidation' : 'surprise'
    const moves = [...node.opponentMoves]

    if (strategy === 'consolidation') {
      return { move: moves[0], strategy }
    }

    moves.sort((left, right) => {
      const leftMastery = masteryByNodeId.get(left.targetNodeId)
      const rightMastery = masteryByNodeId.get(right.targetNodeId)

      if (strategy === 'targeted') {
        const dueDifference = duePriority(leftMastery, now) - duePriority(rightMastery, now)
        return dueDifference || masteryScore(leftMastery) - masteryScore(rightMastery)
      }

      return masteryAttempts(leftMastery) - masteryAttempts(rightMastery)
    })

    return { move: moves[0], strategy }
  }

  targetTitle(move: OpeningMove): string {
    return this.graph.getNode(move.targetNodeId).prompt
  }
}

function masteryScore(mastery: NodeMastery | undefined): number {
  return mastery?.score ?? -1
}

function masteryAttempts(mastery: NodeMastery | undefined): number {
  return mastery?.attempts ?? 0
}

function duePriority(mastery: NodeMastery | undefined, now: number): number {
  return !mastery || mastery.nextReviewAt <= now ? 0 : 1
}
