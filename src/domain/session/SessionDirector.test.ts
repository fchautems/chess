import { describe, expect, it } from 'vitest'

import { italianOpeningGraph } from '../../data/openings/italian/curriculum'
import { createNodeMastery } from '../mastery/NodeMastery'
import { SessionDirector } from './SessionDirector'

describe('SessionDirector', () => {
  const director = new SessionDirector(italianOpeningGraph)
  const branch = italianOpeningGraph.getNode('italian-after-bc4')

  if (branch.type !== 'opponent-branch') {
    throw new Error('Italian branch fixture is invalid')
  }

  it('uses a reproducible 70/20/10 strategy distribution', () => {
    const counts = { targeted: 0, consolidation: 0, surprise: 0 }

    for (let index = 0; index < 10_000; index += 1) {
      counts[director.choose(branch, new Map(), 1_000, 73_941, index).strategy] += 1
    }

    expect(counts.targeted).toBeGreaterThan(6_800)
    expect(counts.targeted).toBeLessThan(7_200)
    expect(counts.consolidation).toBeGreaterThan(1_800)
    expect(counts.consolidation).toBeLessThan(2_200)
    expect(counts.surprise).toBeGreaterThan(850)
    expect(counts.surprise).toBeLessThan(1_150)
  })

  it('targets the weaker continuation deterministically', () => {
    const main = { ...createNodeMastery('italian-after-bc5'), score: 70 }
    const earlyKnight = {
      ...createNodeMastery('italian-after-nf6-early'),
      score: 15,
    }
    const mastery = new Map([
      [main.nodeId, main],
      [earlyKnight.nodeId, earlyKnight],
    ])
    let targetedIndex = 0

    while (
      director.choose(branch, mastery, 1_000, 73_941, targetedIndex).strategy !==
      'targeted'
    ) {
      targetedIndex += 1
    }

    expect(
      director.choose(branch, mastery, 1_000, 73_941, targetedIndex).move.targetNodeId,
    ).toBe('italian-after-nf6-early')
  })
})
