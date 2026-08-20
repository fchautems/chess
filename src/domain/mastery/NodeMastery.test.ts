import { describe, expect, it } from 'vitest'

import {
  createNodeMastery,
  isMasteryDue,
  masteryReviewTier,
  recordMasteryFailure,
  recordMasterySuccess,
} from './NodeMastery'

describe('node mastery', () => {
  it('rewards unaided recall more than hinted or recovered recall', () => {
    const now = 1_000
    const clean = recordMasterySuccess(undefined, 'node', now, 0, false)
    const hinted = recordMasterySuccess(undefined, 'node', now, 2, false)
    const recovered = recordMasterySuccess(undefined, 'node', now, 0, true)

    expect(clean.score).toBeGreaterThan(hinted.score)
    expect(hinted.score).toBeGreaterThan(recovered.score)
    expect(clean.nextReviewAt).toBeGreaterThan(now)
  })

  it('makes failed positions due immediately and reduces established mastery', () => {
    const established = { ...createNodeMastery('node'), score: 64 }
    const failed = recordMasteryFailure(established, 'node', 5_000)

    expect(failed.score).toBe(46)
    expect(failed.currentStreak).toBe(0)
    expect(isMasteryDue(failed, 5_000)).toBe(true)
  })

  it('maps mastery to explicit spaced-review tiers', () => {
    expect(masteryReviewTier(20)).toBe('learning')
    expect(masteryReviewTier(50)).toBe('short')
    expect(masteryReviewTier(70)).toBe('medium')
    expect(masteryReviewTier(90)).toBe('long')
  })
})
