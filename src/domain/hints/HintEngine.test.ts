import { describe, expect, it } from 'vitest'

import type { HintPool } from '../opening/OpeningNode'
import { drawHint, HINT_COST } from './HintEngine'

const pool: HintPool = {
  weak: ['faible'],
  medium: ['moyen'],
  strong: ['fort'],
  exceptional: ['exceptionnel'],
}

describe('HintEngine', () => {
  it('uses the fixed five-gold price', () => {
    expect(HINT_COST).toBe(5)
  })

  it('is deterministic for a fixed seed and draw index', () => {
    expect(drawHint(pool, 0, [], 73_941, 0)).toEqual(
      drawHint(pool, 0, [], 73_941, 0),
    )
  })

  it('can draw an exceptional first hint', () => {
    const exceptionalSeed = Array.from({ length: 10_000 }, (_, seed) => seed).find(
      (seed) => drawHint(pool, 0, [], seed, 0)?.quality === 'exceptional',
    )

    expect(exceptionalSeed).toBeDefined()
  })

  it('never repeats text and eventually exhausts one encounter', () => {
    const used: string[] = []

    for (let purchase = 0; purchase < 4; purchase += 1) {
      const hint = drawHint(pool, purchase, used, 73_941, purchase)
      expect(hint).not.toBeNull()
      used.push(hint?.text ?? '')
    }

    expect(new Set(used).size).toBe(4)
    expect(drawHint(pool, 4, used, 73_941, 4)).toBeNull()
  })

  it('removes weak hints from fourth-and-later purchases', () => {
    for (let seed = 0; seed < 100; seed += 1) {
      expect(drawHint(pool, 3, [], seed, 0)?.quality).not.toBe('weak')
    }
  })

  it('improves average quality over many deterministic encounters', () => {
    const qualityValue = { weak: 0, medium: 1, strong: 2, exceptional: 3 }
    let firstTotal = 0
    let thirdTotal = 0

    for (let seed = 0; seed < 1_000; seed += 1) {
      const first = drawHint(pool, 0, [], seed, 0)
      const third = drawHint(pool, 2, [], seed, 0)
      firstTotal += qualityValue[first?.quality ?? 'weak']
      thirdTotal += qualityValue[third?.quality ?? 'weak']
    }

    expect(thirdTotal / 1_000).toBeGreaterThan(firstTotal / 1_000 + 0.7)
  })
})
