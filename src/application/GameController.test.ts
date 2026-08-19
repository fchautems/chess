import { beforeEach, describe, expect, it } from 'vitest'

import {
  italianCurriculum,
  italianOpeningGraph,
} from '../data/openings/italian/curriculum'
import type { ChessMoveInput } from '../domain/chess/ChessRules'
import { ChessJsAdapter } from '../domain/chess/ChessJsAdapter'
import type {
  PlayerProgressV1,
  ProgressRepository,
} from './progress/ProgressRepository'
import { GameController } from './GameController'

class MemoryProgressRepository implements ProgressRepository {
  private value: PlayerProgressV1 | null = null

  load(): PlayerProgressV1 | null {
    return this.value ? JSON.parse(JSON.stringify(this.value)) : null
  }

  save(progress: PlayerProgressV1): void {
    this.value = JSON.parse(JSON.stringify(progress))
  }

  reset(): void {
    this.value = null
  }

  exportData(): string | null {
    return this.value ? JSON.stringify(this.value) : null
  }

  importData(serialized: string): PlayerProgressV1 {
    this.value = JSON.parse(serialized)
    return this.load() as PlayerProgressV1
  }
}

const learnerMoves: readonly ChessMoveInput[] = [
  { from: 'e2', to: 'e4' },
  { from: 'g1', to: 'f3' },
  { from: 'f1', to: 'c4' },
  { from: 'd2', to: 'd3' },
  { from: 'e1', to: 'g1' },
  { from: 'c2', to: 'c3' },
]

function createController(repository = new MemoryProgressRepository()) {
  return new GameController(
    italianOpeningGraph,
    new ChessJsAdapter(),
    italianCurriculum,
    repository,
  )
}

function playLearnerMoves(controller: GameController, count: number) {
  let result = controller.submitLearnerMove(learnerMoves[0])

  for (let index = 1; index < count; index += 1) {
    result = controller.submitLearnerMove(learnerMoves[index])
  }

  return result
}

function completeActiveLesson(controller: GameController, moveCount: number) {
  const discovery = playLearnerMoves(controller, moveCount)
  expect(discovery.kind).toBe('lesson-discovered')
  expect(discovery.view.phase).toBe('ready-to-reproduce')

  const reproduction = controller.startReproduction()
  expect(reproduction.phase).toBe('reproduction')
  expect(reproduction.moveHistory).toEqual([])

  const completion = playLearnerMoves(controller, moveCount)
  expect(completion.kind).toBe('lesson-complete')
  expect(completion.view.phase).toBe('lesson-complete')
  return completion.view
}

describe('GameController teaching flow', () => {
  let repository: MemoryProgressRepository
  let controller: GameController

  beforeEach(() => {
    repository = new MemoryProgressRepository()
    controller = createController(repository)
  })

  it('starts with the explicit discovery of e4', () => {
    const view = controller.getViewModel()

    expect(view.lessonId).toBe('lesson-e4')
    expect(view.phase).toBe('discovery')
    expect(view.coachLabel).toBe('Nouveau concept')
    expect(view.prompt).toContain('centre')
    expect(view.completedLessons).toBe(0)
    expect(view.totalLessons).toBe(6)
  })

  it('requires discovery then a clean replay from the beginning', () => {
    const discovery = controller.submitLearnerMove({ from: 'e2', to: 'e4' })

    expect(discovery.kind).toBe('lesson-discovered')
    expect(discovery.view.phase).toBe('ready-to-reproduce')
    expect(discovery.view.lastMove).toMatchObject({ from: 'e2', to: 'e4' })
    expect(controller.legalDestinations('g1')).toEqual([])

    controller.startReproduction()
    const completion = controller.submitLearnerMove({ from: 'e2', to: 'e4' })

    expect(completion.kind).toBe('lesson-complete')
    expect(completion.view.completedLessons).toBe(1)
    expect(completion.view.result?.learnerMoveSequence).toEqual(['e4'])
  })

  it('restarts every extended lesson from the initial position', () => {
    completeActiveLesson(controller, 1)
    const nextLesson = controller.continueToNextLesson()

    expect(nextLesson.lessonId).toBe('lesson-nf3')
    expect(nextLesson.nodeId).toBe('italian-start')

    const afterE4 = controller.submitLearnerMove({ from: 'e2', to: 'e4' })
    expect(afterE4.kind).toBe('accepted')
    expect(afterE4.view.moveHistory).toEqual(['e4', 'e5'])
    expect(afterE4.view.coachLabel).toBe('Nouveau concept')

    const discoveredNf3 = controller.submitLearnerMove({ from: 'g1', to: 'f3' })
    expect(discoveredNf3.kind).toBe('lesson-discovered')
    expect(discoveredNf3.view.learnerMovesCompleted).toBe(2)

    const replay = controller.startReproduction()
    expect(replay.nodeId).toBe('italian-start')
    expect(replay.coachLabel).toBe('Sans aide')
  })

  it('rejects illegal and off-line moves without advancing the lesson', () => {
    const initialFen = controller.getViewModel().fen

    const illegal = controller.submitLearnerMove({ from: 'e2', to: 'e5' })
    expect(illegal.kind).toBe('illegal')
    expect(illegal.view.fen).toBe(initialFen)

    const offLine = controller.submitLearnerMove({ from: 'd2', to: 'd4' })
    expect(offLine.kind).toBe('outside-training-line')
    expect(offLine.view.fen).toBe(initialFen)
    expect(offLine.view.learnerMovesCompleted).toBe(0)
  })

  it('unlocks Stage 1 only after the three Stage 0 lessons', () => {
    for (let moveCount = 1; moveCount <= 3; moveCount += 1) {
      completeActiveLesson(controller, moveCount)
      const next = controller.continueToNextLesson()

      if (moveCount < 3) {
        expect(next.stageIndex).toBe(0)
      } else {
        expect(next.stageIndex).toBe(1)
        expect(next.lessonId).toBe('lesson-d3')
      }
    }
  })

  it('teaches all six decisions through c3 and shows a final result', () => {
    for (let moveCount = 1; moveCount <= 6; moveCount += 1) {
      const completed = completeActiveLesson(controller, moveCount)
      expect(completed.completedLessons).toBe(moveCount)

      const next = controller.continueToNextLesson()

      if (moveCount < 6) {
        expect(next.phase).toBe('discovery')
      } else {
        expect(next.phase).toBe('curriculum-complete')
        expect(next.result?.title).toBe('Première structure maîtrisée')
        expect(next.completedLessons).toBe(6)
      }
    }
  })

  it('restores the pedagogical phase and completed lessons after reload', () => {
    controller.submitLearnerMove({ from: 'e2', to: 'e4' })

    const restoredReady = createController(repository)
    expect(restoredReady.getViewModel().phase).toBe('ready-to-reproduce')

    restoredReady.startReproduction()
    restoredReady.submitLearnerMove({ from: 'e2', to: 'e4' })

    const restoredResult = createController(repository).getViewModel()
    expect(restoredResult.phase).toBe('lesson-complete')
    expect(restoredResult.completedLessons).toBe(1)
    expect(restoredResult.result?.title).toBe('Prendre le centre')
  })

  it('exposes legal destinations and can deliberately reset all progress', () => {
    expect(controller.legalDestinations('e2')).toEqual(['e3', 'e4'])
    completeActiveLesson(controller, 1)

    const reset = controller.resetAllProgress()
    expect(reset.lessonId).toBe('lesson-e4')
    expect(reset.phase).toBe('discovery')
    expect(reset.completedLessons).toBe(0)
    expect(repository.load()).toBeNull()
  })
})
