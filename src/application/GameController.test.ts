import { beforeEach, describe, expect, it } from 'vitest'

import {
  italianCurriculum,
  italianOpeningGraph,
} from '../data/openings/italian/curriculum'
import type { ChessMoveInput } from '../domain/chess/ChessRules'
import { ChessJsAdapter } from '../domain/chess/ChessJsAdapter'
import type {
  PlayerProgressV3,
  ProgressRepository,
} from './progress/ProgressRepository'
import { GameController } from './GameController'

class MemoryProgressRepository implements ProgressRepository {
  private value: PlayerProgressV3 | null = null

  load(): PlayerProgressV3 | null {
    return this.value ? JSON.parse(JSON.stringify(this.value)) : null
  }

  save(progress: PlayerProgressV3): void {
    this.value = JSON.parse(JSON.stringify(progress))
  }

  reset(): void {
    this.value = null
  }

  exportData(): string | null {
    return this.value ? JSON.stringify(this.value) : null
  }

  importData(serialized: string): PlayerProgressV3 {
    this.value = JSON.parse(serialized)
    return this.load() as PlayerProgressV3
  }
}

const stage0Moves: readonly ChessMoveInput[] = [
  { from: 'e2', to: 'e4' },
  { from: 'g1', to: 'f3' },
  { from: 'f1', to: 'c4' },
]

const stage1Moves: readonly ChessMoveInput[] = [
  { from: 'd2', to: 'd3' },
  { from: 'e1', to: 'g1' },
  { from: 'c2', to: 'c3' },
]

const deepRunMoves: readonly ChessMoveInput[] = [
  { from: 'f1', to: 'e1' },
  { from: 'c4', to: 'b3' },
  { from: 'b1', to: 'd2' },
  { from: 'd2', to: 'f1' },
  { from: 'f1', to: 'g3' },
]

function createController(
  repository = new MemoryProgressRepository(),
  now = () => 1_000,
) {
  return new GameController(
    italianOpeningGraph,
    new ChessJsAdapter(),
    italianCurriculum,
    repository,
    { now },
  )
}

function playMoves(controller: GameController, moves: readonly ChessMoveInput[]) {
  return moves.map((move) => controller.submitLearnerMove(move)).at(-1)
}

function completeOnboarding(controller: GameController) {
  expect(playMoves(controller, stage0Moves)?.kind).toBe('checkpoint-ready')
  controller.startCheckpoint()
  expect(playMoves(controller, stage0Moves)?.kind).toBe('stage-complete')
  controller.continueAfterStage()
  expect(playMoves(controller, stage1Moves)?.kind).toBe('checkpoint-ready')
  controller.startCheckpoint()
  expect(playMoves(controller, stage1Moves)?.kind).toBe('stage-complete')
  return controller.continueAfterStage()
}

describe('GameController v0.4 flow', () => {
  let repository: MemoryProgressRepository
  let controller: GameController

  beforeEach(() => {
    repository = new MemoryProgressRepository()
    controller = createController(repository)
  })

  it('continues through the whole first block before one checkpoint', () => {
    const initial = controller.getViewModel()
    expect(initial.phase).toBe('discovering')
    expect(initial.prompt).toContain('Continue tant que')
    expect(initial.hint).toBeNull()

    expect(controller.submitLearnerMove(stage0Moves[0]).kind).toBe('accepted')
    expect(controller.submitLearnerMove(stage0Moves[1]).kind).toBe('accepted')

    const end = controller.submitLearnerMove(stage0Moves[2])
    expect(end.kind).toBe('checkpoint-ready')
    expect(end.view.moveHistory).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'])
    expect(end.view.result?.primaryLabel).toBe('Valider ce bloc sans aide')
  })

  it('reproduces once per block and continues from the current position', () => {
    playMoves(controller, stage0Moves)
    const checkpoint = controller.startCheckpoint()
    expect(checkpoint.nodeId).toBe('italian-start')

    playMoves(controller, stage0Moves)
    const continued = controller.continueAfterStage()

    expect(continued.phase).toBe('discovering')
    expect(continued.stageIndex).toBe(1)
    expect(continued.nodeId).toBe('italian-after-bc5')
    expect(continued.moveHistory.at(-1)).toBe('Bc5')
    expect(continued.learnerMovesCompleted).toBe(0)

    playMoves(controller, stage1Moves)
    const secondCheckpoint = controller.startCheckpoint()
    expect(secondCheckpoint.nodeId).toBe('italian-after-bc5')
    expect(secondCheckpoint.moveHistory).toEqual(['Bc5'])
  })

  it('shows hints only after an explicit request and discounts mastery credit', () => {
    expect(controller.getViewModel().hint).toBeNull()
    const hinted = controller.requestHint()
    expect(hinted.hint).toContain('centre')

    controller.submitLearnerMove(stage0Moves[0])
    const hintedScore = controller.getViewModel().masteryScore

    const cleanController = createController()
    cleanController.submitLearnerMove(stage0Moves[0])
    expect(cleanController.getViewModel().masteryScore).toBeGreaterThan(hintedScore)
  })

  it('teaches only after an error, then lets the learner continue in place', () => {
    const initialFen = controller.getViewModel().fen
    const wrong = controller.submitLearnerMove({ from: 'd2', to: 'd4' })

    expect(wrong.kind).toBe('outside-training-line')
    expect(wrong.view.fen).toBe(initialFen)
    expect(wrong.view.feedback).toContain('pion du roi')

    const recovered = controller.submitLearnerMove(stage0Moves[0])
    expect(recovered.kind).toBe('accepted')
    expect(recovered.view.nodeId).toBe('italian-after-e4-e5')
    expect(recovered.view.currentNodeMastery).toBe(0)
  })

  it('unlocks adaptive runs and targets the unpractised early Nf6 branch', () => {
    const ready = completeOnboarding(controller)
    expect(ready.phase).toBe('adaptive-ready')
    expect(ready.completedStages).toBe(2)

    controller.startAdaptiveRun()
    playMoves(controller, stage0Moves)
    const branch = controller.getViewModel()

    expect(branch.nodeId).toBe('italian-after-nf6-early')
    expect(branch.moveHistory.at(-1)).toBe('Nf6')
    expect(branch.lastBranchStrategy).toBe('targeted')

    expect(controller.submitLearnerMove(stage1Moves[0]).kind).toBe('accepted')
    expect(controller.getViewModel().nodeId).toBe('italian-after-nf6')
    controller.submitLearnerMove(stage1Moves[1])
    expect(controller.submitLearnerMove(stage1Moves[2]).kind).toBe('accepted')
    const completed = playMoves(controller, deepRunMoves)

    expect(completed?.kind).toBe('run-complete')
    expect(completed?.view.runsCompleted).toBe(1)
    expect(completed?.view.lastRun?.decisions).toBe(11)
    expect(completed?.view.lastRun?.outcome).toBe('completed')
    expect(completed?.view.lastRun?.branchLabels).toHaveLength(2)
    expect(completed?.view.coverageTotal).toBe(13)
  })

  it('charges one life per failed encounter and ends immediately at zero', () => {
    completeOnboarding(controller)
    controller.startAdaptiveRun()

    const firstError = controller.submitLearnerMove({ from: 'd2', to: 'd4' })
    expect(firstError.view.lives).toBe(2)
    expect(controller.submitLearnerMove({ from: 'd2', to: 'd4' }).view.lives).toBe(2)
    controller.submitLearnerMove(stage0Moves[0])

    expect(controller.submitLearnerMove({ from: 'd2', to: 'd4' }).view.lives).toBe(1)
    controller.submitLearnerMove(stage0Moves[1])

    const finalError = controller.submitLearnerMove({ from: 'd2', to: 'd4' })
    expect(finalError.kind).toBe('run-over')
    expect(finalError.view.lives).toBe(0)
    expect(finalError.view.lastRun?.mistakes).toBe(3)
    expect(finalError.view.result?.primaryLabel).toContain('trois vies')
  })

  it('spends five gold per deterministic non-repeating hint', () => {
    completeOnboarding(controller)
    controller.startAdaptiveRun()

    const first = controller.requestHint()
    const firstText = first.hint
    expect(first.goldBalance).toBe(10)
    expect(first.hintQuality).not.toBeNull()

    const second = controller.requestHint()
    expect(second.goldBalance).toBe(5)
    expect(second.hint).not.toBe(firstText)
    expect(second.runGoldSpent).toBe(10)
  })

  it('restores an in-progress continuous session after reload', () => {
    controller.submitLearnerMove(stage0Moves[0])

    const restored = createController(repository).getViewModel()
    expect(restored.phase).toBe('discovering')
    expect(restored.nodeId).toBe('italian-after-e4-e5')
    expect(restored.moveHistory).toEqual(['e4', 'e5'])
    expect(restored.learnerMovesCompleted).toBe(1)
  })

  it('exposes legal destinations and deliberately resets all v0.3 progress', () => {
    expect(controller.legalDestinations('e2')).toEqual(['e3', 'e4'])
    controller.submitLearnerMove(stage0Moves[0])

    const reset = controller.resetAllProgress()
    expect(reset.phase).toBe('discovering')
    expect(reset.nodeId).toBe('italian-start')
    expect(reset.masteryScore).toBe(0)
    expect(repository.load()).toBeNull()
  })
})
