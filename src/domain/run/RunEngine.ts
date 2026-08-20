export const STARTING_LIVES = 3

export type RunStatus = 'active' | 'completed' | 'out-of-lives'

export interface RunState {
  status: RunStatus
  lives: number
  streak: number
  bestStreak: number
  decisions: number
  mistakes: number
  hintsPurchased: number
  goldEarned: number
  goldSpent: number
}

export interface RunSuccessContext {
  assisted: boolean
  recovered: boolean
  masteryBefore: number
  attemptsBefore: number
}

export interface RunSuccessResult {
  state: RunState
  goldReward: number
  milestone: number | null
}

export function createRunState(): RunState {
  return {
    status: 'active',
    lives: STARTING_LIVES,
    streak: 0,
    bestStreak: 0,
    decisions: 0,
    mistakes: 0,
    hintsPurchased: 0,
    goldEarned: 0,
    goldSpent: 0,
  }
}

export function recordRunFailure(state: RunState): RunState {
  if (state.status !== 'active') return state

  const lives = Math.max(0, state.lives - 1)

  return {
    ...state,
    status: lives === 0 ? 'out-of-lives' : 'active',
    lives,
    streak: 0,
    mistakes: state.mistakes + 1,
  }
}

export function recordRunSuccess(
  state: RunState,
  context: RunSuccessContext,
): RunSuccessResult {
  if (state.status !== 'active') {
    return { state, goldReward: 0, milestone: null }
  }

  const streak = context.recovered
    ? 0
    : context.assisted
      ? state.streak
      : state.streak + 1
  const milestone = !context.assisted && !context.recovered
    ? streakMilestone(streak)
    : null
  const baseReward = context.masteryBefore < 90 ? 1 : 0
  const discoveryBonus =
    context.attemptsBefore === 0 && !context.assisted && !context.recovered ? 3 : 0
  const recoveryBonus = context.recovered ? 2 : 0
  const milestoneBonus = milestone ? milestoneReward(milestone) : 0
  const goldReward = baseReward + discoveryBonus + recoveryBonus + milestoneBonus

  return {
    goldReward,
    milestone,
    state: {
      ...state,
      streak,
      bestStreak: Math.max(state.bestStreak, streak),
      decisions: state.decisions + 1,
      goldEarned: state.goldEarned + goldReward,
    },
  }
}

export function recordHintPurchase(state: RunState, cost: number): RunState {
  if (state.status !== 'active') return state

  return {
    ...state,
    hintsPurchased: state.hintsPurchased + 1,
    goldSpent: state.goldSpent + cost,
  }
}

export function completeRun(state: RunState): RunState {
  return state.status === 'active' ? { ...state, status: 'completed' } : state
}

function streakMilestone(streak: number): number | null {
  return streak === 3 || streak === 5 || streak === 10 ? streak : null
}

function milestoneReward(milestone: number): number {
  if (milestone >= 10) return 3
  if (milestone >= 5) return 2
  return 1
}
