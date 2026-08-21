import { describe, expect, it } from 'vitest'

import { italianOpeningGraph } from '../../data/openings/italian/curriculum'
import { ChessJsAdapter } from '../chess/ChessJsAdapter'
import type { ChessSquare } from '../chess/ChessRules'
import { findMistakeConsequence } from './MistakeConsequences'

const cases = [
  ['italian-after-nf6', 'f3g5'],
  ['italian-after-nf6-early', 'f3e5'],
  ['italian-after-a6', 'h2h3'],
  ['italian-after-castle-a6-convergence', 'h2h3'],
] as const

describe('authored mistake consequences', () => {
  it.each(cases)('keeps both the learner move and black response legal at %s', (nodeId, uci) => {
    const node = italianOpeningGraph.getNode(nodeId)
    const consequence = findMistakeConsequence(nodeId, uci)
    const rules = new ChessJsAdapter()
    rules.load(node.fen)

    expect(rules.move({
      from: uci.slice(0, 2) as ChessSquare,
      to: uci.slice(2, 4) as ChessSquare,
    })).not.toBeNull()
    expect(consequence).not.toBeNull()
    expect(rules.move(consequence?.opponentReply ?? { from: 'a1', to: 'a1' })).not.toBeNull()
  })
})
