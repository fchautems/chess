import { describe, expect, it } from 'vitest'

import { ChessJsAdapter } from '../chess/ChessJsAdapter'
import {
  italianCurriculum,
  italianOpeningGraph,
} from '../../data/openings/italian/curriculum'

describe('Italian v0.3 graph', () => {
  it('contains both stages, six trunk decisions and one branch decision', () => {
    const nodes = italianOpeningGraph.allNodes()

    expect(nodes).toHaveLength(14)
    expect(nodes.filter((node) => node.type === 'learner-decision')).toHaveLength(7)
    expect(nodes.filter((node) => node.type === 'opponent-branch')).toHaveLength(6)
    expect(nodes.filter((node) => node.type === 'completion')).toHaveLength(1)
    expect(italianCurriculum.lessons).toHaveLength(6)
    expect(italianOpeningGraph.getStage('italian-stage-0').index).toBe(0)
    expect(italianOpeningGraph.getStage('italian-stage-1').index).toBe(1)
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
