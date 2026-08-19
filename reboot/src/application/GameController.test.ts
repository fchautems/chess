import { beforeEach, describe, expect, it } from 'vitest'

import { ChessJsAdapter } from '../domain/chess/ChessJsAdapter'
import {
  ITALIAN_STAGE_0_ENTRY_NODE_ID,
  italianOpeningGraph,
} from '../data/openings/italian/stage0'
import { GameController } from './GameController'

describe('GameController Stage 0 flow', () => {
  let controller: GameController

  beforeEach(() => {
    controller = new GameController(
      italianOpeningGraph,
      new ChessJsAdapter(),
      ITALIAN_STAGE_0_ENTRY_NODE_ID,
    )
  })

  it('starts at the initial learner decision without React', () => {
    const view = controller.getViewModel()

    expect(view.nodeId).toBe('italian-start')
    expect(view.status).toBe('awaiting-learner')
    expect(view.moveHistory).toEqual([])
    expect(view.learnerMovesCompleted).toBe(0)
    expect(view.learnerMovesTotal).toBe(3)
  })

  it('rejects illegal and off-line moves without advancing the board', () => {
    const initialFen = controller.getViewModel().fen

    const illegal = controller.submitLearnerMove({ from: 'e2', to: 'e5' })
    expect(illegal.kind).toBe('illegal')
    expect(illegal.view.fen).toBe(initialFen)

    const offLine = controller.submitLearnerMove({ from: 'd2', to: 'd4' })
    expect(offLine.kind).toBe('outside-training-line')
    expect(offLine.view.fen).toBe(initialFen)
    expect(offLine.view.nodeId).toBe('italian-start')
  })

  it('plays the complete e4, Nf3, Bc4 trunk with scripted black replies', () => {
    const afterE4 = controller.submitLearnerMove({ from: 'e2', to: 'e4' })
    expect(afterE4.kind).toBe('accepted')
    expect(afterE4.view.nodeId).toBe('italian-after-e4-e5')
    expect(afterE4.view.moveHistory).toEqual(['e4', 'e5'])

    const afterNf3 = controller.submitLearnerMove({ from: 'g1', to: 'f3' })
    expect(afterNf3.kind).toBe('accepted')
    expect(afterNf3.view.nodeId).toBe('italian-after-nc6')
    expect(afterNf3.view.moveHistory).toEqual(['e4', 'e5', 'Nf3', 'Nc6'])

    const afterBc4 = controller.submitLearnerMove({ from: 'f1', to: 'c4' })
    expect(afterBc4.kind).toBe('complete')
    expect(afterBc4.view.nodeId).toBe('italian-after-bc4')
    expect(afterBc4.view.status).toBe('complete')
    expect(afterBc4.view.moveHistory).toEqual([
      'e4',
      'e5',
      'Nf3',
      'Nc6',
      'Bc4',
    ])
    expect(afterBc4.view.learnerMovesCompleted).toBe(3)
  })

  it('prevents extra moves after completion and can reset cleanly', () => {
    controller.submitLearnerMove({ from: 'e2', to: 'e4' })
    controller.submitLearnerMove({ from: 'g1', to: 'f3' })
    controller.submitLearnerMove({ from: 'f1', to: 'c4' })

    expect(
      controller.submitLearnerMove({ from: 'g8', to: 'f6' }).kind,
    ).toBe('not-awaiting-move')

    const reset = controller.reset()
    expect(reset.nodeId).toBe('italian-start')
    expect(reset.status).toBe('awaiting-learner')
    expect(reset.moveHistory).toEqual([])
    expect(reset.learnerMovesCompleted).toBe(0)
  })
})
