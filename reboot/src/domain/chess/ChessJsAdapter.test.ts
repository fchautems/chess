import { describe, expect, it } from 'vitest'

import { ChessJsAdapter } from './ChessJsAdapter'

describe('ChessJsAdapter', () => {
  it('applies a legal move and exposes SAN, UCI and the new position', () => {
    const rules = new ChessJsAdapter()

    const move = rules.move({ from: 'e2', to: 'e4' })

    expect(move).toMatchObject({ san: 'e4', uci: 'e2e4' })
    expect(rules.turn()).toBe('black')
    expect(rules.positionKey()).toBe(
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -',
    )
  })

  it('rejects an illegal move without changing the position', () => {
    const rules = new ChessJsAdapter()
    const initialFen = rules.fen()

    expect(rules.move({ from: 'e2', to: 'e5' })).toBeNull()
    expect(rules.fen()).toBe(initialFen)
  })

  it('loads and resets positions through the adapter boundary', () => {
    const rules = new ChessJsAdapter()

    rules.move({ from: 'd2', to: 'd4' })
    const afterD4 = rules.fen()
    rules.reset()
    expect(rules.fen()).not.toBe(afterD4)

    rules.load(afterD4)
    expect(rules.fen()).toBe(afterD4)
  })
})
