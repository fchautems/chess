import { describe, expect, it } from 'vitest'

import { ChessJsAdapter } from '../chess/ChessJsAdapter'
import { italianOpeningGraph } from '../../data/openings/italian/stage0'

describe('Italian Stage 0 graph', () => {
  it('contains the three learner decisions and their scripted replies', () => {
    const nodes = italianOpeningGraph.allNodes()

    expect(nodes).toHaveLength(6)
    expect(nodes.filter((node) => node.type === 'learner-decision')).toHaveLength(3)
    expect(nodes.filter((node) => node.type === 'opponent-branch')).toHaveLength(2)
    expect(nodes.filter((node) => node.type === 'completion')).toHaveLength(1)
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
