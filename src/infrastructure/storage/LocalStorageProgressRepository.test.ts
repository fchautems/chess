import { describe, expect, it } from 'vitest'

import type { PlayerProgressV3 } from '../../application/progress/ProgressRepository'
import { LocalStorageProgressRepository } from './LocalStorageProgressRepository'

class MemoryStorage {
  private readonly values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }
}

const progress: PlayerProgressV3 = {
  schemaVersion: 3,
  phase: 'adaptive-run',
  activeStageIndex: 1,
  completedStageIds: ['italian-stage-0', 'italian-stage-1'],
  masteryByNodeId: {},
  randomSeed: 73_941,
  directorDecisionIndex: 2,
  runsCompleted: 1,
  deepestRun: 6,
  goldBalance: 24,
  bestStreak: 5,
  hintDrawIndex: 2,
  lastRun: null,
  bossVictories: 1,
  session: {
    currentNodeId: 'italian-after-e4-e5',
    fen: 'fen',
    moveHistory: ['e4', 'e5'],
    learnerMovesCompleted: 1,
    currentHintsUsed: 0,
    currentHintQuality: null,
    seenHintTexts: [],
    recoveredAfterError: false,
    runState: {
      status: 'active',
      lives: 2,
      streak: 1,
      bestStreak: 1,
      decisions: 1,
      mistakes: 1,
      hintsPurchased: 0,
      goldEarned: 1,
      goldSpent: 0,
    },
    improvedNodeIds: ['italian-start'],
    branchLabels: ['…Nf6 en premier'],
  },
}

describe('LocalStorageProgressRepository', () => {
  it('saves, loads, exports and resets schema v3 progress', () => {
    const repository = new LocalStorageProgressRepository(new MemoryStorage())

    repository.save(progress)
    expect(repository.load()).toEqual(progress)
    expect(repository.exportData()).toContain('adaptive-run')

    repository.reset()
    expect(repository.load()).toBeNull()
  })

  it('migrates completed v0.2 lessons without losing learned decisions', () => {
    const repository = new LocalStorageProgressRepository(new MemoryStorage())
    const migrated = repository.importData(
      JSON.stringify({
        schemaVersion: 1,
        activeLessonId: 'lesson-c3',
        phase: 'curriculum-complete',
        completedLessonIds: [
          'lesson-e4',
          'lesson-nf3',
          'lesson-bc4',
          'lesson-d3',
          'lesson-castle',
          'lesson-c3',
        ],
      }),
    )

    expect(migrated.schemaVersion).toBe(3)
    expect(migrated.phase).toBe('adaptive-ready')
    expect(migrated.completedStageIds).toHaveLength(2)
    expect(migrated.masteryByNodeId['italian-start'].score).toBe(60)
    expect(migrated.goldBalance).toBe(15)
  })

  it('migrates an in-progress v0.3 run with three lives and starter gold', () => {
    const repository = new LocalStorageProgressRepository(new MemoryStorage())
    const migrated = repository.importData(
      JSON.stringify({
        schemaVersion: 2,
        phase: 'adaptive-run',
        activeStageIndex: 1,
        completedStageIds: ['italian-stage-0', 'italian-stage-1'],
        masteryByNodeId: {},
        randomSeed: 73_941,
        directorDecisionIndex: 1,
        runsCompleted: 0,
        deepestRun: 3,
        session: {
          currentNodeId: 'italian-after-e4-e5',
          fen: 'fen',
          moveHistory: ['e4', 'e5'],
          learnerMovesCompleted: 1,
          currentHintsUsed: 0,
          recoveredAfterError: false,
        },
      }),
    )

    expect(migrated.schemaVersion).toBe(3)
    expect(migrated.goldBalance).toBe(15)
    expect(migrated.session?.runState?.lives).toBe(3)
    expect(migrated.session?.branchLabels).toEqual([])
  })

  it('rejects corrupt or unsupported imported data', () => {
    const repository = new LocalStorageProgressRepository(new MemoryStorage())

    expect(() => repository.importData('{"schemaVersion":4}')).toThrow(
      'Version de sauvegarde non prise en charge',
    )
    expect(() => repository.importData('not-json')).toThrow()
  })
})
