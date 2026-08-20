import { describe, expect, it } from 'vitest'

import {
  completeRun,
  createRunState,
  recordHintPurchase,
  recordRunFailure,
  recordRunSuccess,
} from './RunEngine'

describe('RunEngine', () => {
  it('starts with three lives and charges only when asked', () => {
    const initial = createRunState()
    expect(initial.lives).toBe(3)

    const failed = recordRunFailure(initial)
    expect(failed.lives).toBe(2)
    expect(failed.streak).toBe(0)
  })

  it('ends a run at zero lives', () => {
    let state = createRunState()
    state = recordRunFailure(state)
    state = recordRunFailure(state)
    state = recordRunFailure(state)

    expect(state.status).toBe('out-of-lives')
    expect(recordRunFailure(state)).toEqual(state)
  })

  it('rewards discovery and selected clean streak milestones', () => {
    let state = createRunState()
    const rewards: number[] = []

    for (let index = 0; index < 5; index += 1) {
      const result = recordRunSuccess(state, {
        assisted: false,
        recovered: false,
        masteryBefore: 0,
        attemptsBefore: index === 0 ? 0 : 2,
      })
      state = result.state
      rewards.push(result.goldReward)
    }

    expect(rewards).toEqual([4, 1, 2, 1, 3])
    expect(state.bestStreak).toBe(5)
  })

  it('keeps an assisted streak, resets a recovery and tracks hint spend', () => {
    let state = createRunState()
    state = recordRunSuccess(state, {
      assisted: false,
      recovered: false,
      masteryBefore: 20,
      attemptsBefore: 2,
    }).state
    state = recordHintPurchase(state, 5)
    state = recordRunSuccess(state, {
      assisted: true,
      recovered: false,
      masteryBefore: 20,
      attemptsBefore: 2,
    }).state

    expect(state.streak).toBe(1)
    expect(state.goldSpent).toBe(5)

    state = recordRunSuccess(state, {
      assisted: false,
      recovered: true,
      masteryBefore: 20,
      attemptsBefore: 2,
    }).state
    expect(state.streak).toBe(0)
    expect(completeRun(state).status).toBe('completed')
  })

  it('earns roughly one to three hints in an ordinary eleven-decision run', () => {
    let state = createRunState()

    for (let index = 0; index < 11; index += 1) {
      state = recordRunSuccess(state, {
        assisted: false,
        recovered: false,
        masteryBefore: 60,
        attemptsBefore: 3,
      }).state
    }

    expect(state.goldEarned).toBe(17)
    expect(Math.floor(state.goldEarned / 5)).toBe(3)
  })
})
