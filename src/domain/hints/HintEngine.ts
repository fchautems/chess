import type { HintPool, HintQuality } from '../opening/OpeningNode'
import { seededUnit } from '../session/SeededRandom'

export const HINT_COST = 5

export interface DrawnHint {
  quality: HintQuality
  text: string
}

const qualities: readonly HintQuality[] = [
  'weak',
  'medium',
  'strong',
  'exceptional',
]

const distributions: readonly (readonly number[])[] = [
  [0.45, 0.35, 0.17, 0.03],
  [0.2, 0.4, 0.3, 0.1],
  [0.05, 0.25, 0.45, 0.25],
  [0, 0.1, 0.4, 0.5],
]

export function drawHint(
  pool: HintPool,
  purchaseNumber: number,
  usedTexts: readonly string[],
  seed: number,
  drawIndex: number,
): DrawnHint | null {
  const available = qualities.flatMap((quality) =>
    pool[quality]
      .filter((text) => text.trim().length > 0 && !usedTexts.includes(text))
      .map((text) => ({ quality, text })),
  )

  if (available.length === 0) return null

  const distribution = distributions[Math.min(purchaseNumber, distributions.length - 1)]
  const roll = seededUnit(seed, drawIndex)
  const requestedQuality = qualityForRoll(distribution, roll)
  const tierOrder = qualityFallbackOrder(requestedQuality)

  for (const quality of tierOrder) {
    const candidates = available.filter((hint) => hint.quality === quality)
    if (candidates.length === 0) continue

    const textRoll = seededUnit(seed, drawIndex + 10_000 + purchaseNumber)
    return candidates[Math.floor(textRoll * candidates.length)]
  }

  return available[0]
}

function qualityForRoll(
  distribution: readonly number[],
  roll: number,
): HintQuality {
  let threshold = 0

  for (let index = 0; index < distribution.length; index += 1) {
    threshold += distribution[index]
    if (roll < threshold) return qualities[index]
  }

  return 'exceptional'
}

function qualityFallbackOrder(quality: HintQuality): readonly HintQuality[] {
  const index = qualities.indexOf(quality)
  return [
    ...qualities.slice(index),
    ...qualities.slice(0, index).reverse(),
  ]
}
