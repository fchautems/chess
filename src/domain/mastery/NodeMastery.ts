import type { HintQuality } from '../opening/OpeningNode'

export interface NodeMastery {
  nodeId: string
  score: number
  attempts: number
  successes: number
  currentStreak: number
  hintsUsed: number
  lastReviewedAt: number | null
  nextReviewAt: number
}

export type ReviewTier = 'learning' | 'short' | 'medium' | 'long'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

export function createNodeMastery(nodeId: string): NodeMastery {
  return {
    nodeId,
    score: 0,
    attempts: 0,
    successes: 0,
    currentStreak: 0,
    hintsUsed: 0,
    lastReviewedAt: null,
    nextReviewAt: 0,
  }
}

export function recordMasteryFailure(
  current: NodeMastery | undefined,
  nodeId: string,
  now: number,
): NodeMastery {
  const mastery = current ?? createNodeMastery(nodeId)

  return {
    ...mastery,
    score: Math.max(0, mastery.score - 18),
    attempts: mastery.attempts + 1,
    currentStreak: 0,
    lastReviewedAt: now,
    nextReviewAt: now,
  }
}

export function recordMasterySuccess(
  current: NodeMastery | undefined,
  nodeId: string,
  now: number,
  hintsUsed: number,
  recoveredAfterError: boolean,
  hintQuality: HintQuality | null = null,
): NodeMastery {
  const mastery = current ?? createNodeMastery(nodeId)
  const baseGain = recoveredAfterError
    ? 5
    : hintQuality
      ? Math.max(3, hintGain(hintQuality) - Math.max(0, hintsUsed - 1) * 2)
      : ([22, 14, 9, 5, 3][hintsUsed] ?? 3)
  const score = Math.min(100, mastery.score + baseGain)

  return {
    ...mastery,
    score,
    attempts: mastery.attempts + 1,
    successes: mastery.successes + 1,
    currentStreak: recoveredAfterError ? 0 : mastery.currentStreak + 1,
    hintsUsed: mastery.hintsUsed + hintsUsed,
    lastReviewedAt: now,
    nextReviewAt: now + reviewInterval(score),
  }
}

function hintGain(quality: HintQuality): number {
  switch (quality) {
    case 'weak':
      return 16
    case 'medium':
      return 11
    case 'strong':
      return 7
    case 'exceptional':
      return 4
  }
}

export function isMasteryDue(mastery: NodeMastery | undefined, now: number): boolean {
  return !mastery || mastery.nextReviewAt <= now
}

export function masteryReviewTier(score: number): ReviewTier {
  if (score < 40) return 'learning'
  if (score < 60) return 'short'
  if (score < 80) return 'medium'
  return 'long'
}

function reviewInterval(score: number): number {
  switch (masteryReviewTier(score)) {
    case 'learning':
      return 4 * HOUR
    case 'short':
      return DAY
    case 'medium':
      return 3 * DAY
    case 'long':
      return 7 * DAY
  }
}
