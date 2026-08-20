import { describe, expect, it } from 'vitest'

import { ChessJsAdapter } from '../chess/ChessJsAdapter'
import {
  italianCurriculum,
  italianOpeningGraph,
} from '../../data/openings/italian/curriculum'

describe('Italian v0.4 graph', () => {
  it('contains thirteen decisions, three stages and two branch points', () => {
    const nodes = italianOpeningGraph.allNodes()

    expect(nodes).toHaveLength(26)
    expect(nodes.filter((node) => node.type === 'learner-decision')).toHaveLength(13)
    expect(nodes.filter((node) => node.type === 'opponent-branch')).toHaveLength(12)
    expect(nodes.filter((node) => node.type === 'completion')).toHaveLength(1)
    expect(
      nodes.filter(
        (node) => node.type === 'opponent-branch' && node.opponentMoves.length > 1,
      ),
    ).toHaveLength(2)
    expect(italianCurriculum.lessons).toHaveLength(6)
    expect(italianOpeningGraph.getStage('italian-stage-0').index).toBe(0)
    expect(italianOpeningGraph.getStage('italian-stage-1').index).toBe(1)
    expect(italianOpeningGraph.getStage('italian-stage-2').index).toBe(2)
  })

  it('converges castling-first and a6-first move orders to one position', () => {
    const converged = italianOpeningGraph.getNode(
      'italian-after-castle-a6-convergence',
    )
    const a6First = new ChessJsAdapter(
      italianOpeningGraph.getNode('italian-after-re1-a6-first').fen,
    )

    a6First.move({ from: 'e8', to: 'g8' })
    expect(a6First.positionKey()).toBe(converged.positionKey)
  })

  it('converges Bc5-first and Nf6-first move orders to one known position', () => {
    const converged = italianOpeningGraph.getNode('italian-after-nf6')
    const earlyOrder = new ChessJsAdapter(
      italianOpeningGraph.getNode('italian-after-nf6-early-d3').fen,
    )

    earlyOrder.move({ from: 'f8', to: 'c5' })
    expect(earlyOrder.positionKey()).toBe(converged.positionKey)
  })

  it('connects every authored move to the expected legal position', () => {
    for (const node of italianOpeningGraph.allNodes()) {
      const moves = [...node.acceptedLearnerMoves, ...node.opponentMoves]

      for (const move of moves) {
        const rules = new ChessJsAdapter(node.fen)
        const applied = rules.move(move)
        const target = italianOpeningGraph.getNode(move.targetNodeId)

        expect(applied, `${move.san} should be legal at ${node.id}`).not.toBeNull()
        expect(rules.positionKey()).toBe(target.positionKey)
        expect(rules.turn()).toBe(target.sideToMove)
      }
    }
  })
})
