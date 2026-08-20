import { useCallback, useState } from 'react'

import { GameController } from './application/GameController'
import type { GameViewModel } from './application/GameViewModel'
import type { ChessSquare } from './domain/chess/ChessRules'
import { ChessJsAdapter } from './domain/chess/ChessJsAdapter'
import {
  italianCurriculum,
  italianOpeningGraph,
} from './data/openings/italian/curriculum'
import { LocalStorageProgressRepository } from './infrastructure/storage/LocalStorageProgressRepository'
import { BoardView } from './ui/board/BoardView'

function createController(): GameController {
  return new GameController(
    italianOpeningGraph,
    new ChessJsAdapter(),
    italianCurriculum,
    new LocalStorageProgressRepository(window.localStorage),
  )
}

export default function App() {
  const [controller] = useState(createController)
  const [view, setView] = useState(() => controller.getViewModel())
  const [selectedSquare, setSelectedSquare] = useState<ChessSquare | null>(null)
  const [legalDestinations, setLegalDestinations] = useState<
    readonly ChessSquare[]
  >([])

  const applyView = useCallback((nextView: GameViewModel) => {
    setView(nextView)
    setSelectedSquare(null)
    setLegalDestinations([])
  }, [])

  const attemptMove = useCallback(
    (from: ChessSquare, to: ChessSquare): boolean => {
      const result = controller.submitLearnerMove({ from, to })
      applyView(result.view)

      return (
        result.kind === 'accepted' ||
        result.kind === 'checkpoint-ready' ||
        result.kind === 'stage-complete' ||
        result.kind === 'run-complete'
      )
    },
    [applyView, controller],
  )

  const handleSquareSelect = useCallback(
    (square: ChessSquare) => {
      if (!view.isBoardInteractive) {
        return
      }

      if (!selectedSquare) {
        const destinations = controller.legalDestinations(square)

        if (destinations.length > 0) {
          setSelectedSquare(square)
          setLegalDestinations(destinations)
        }

        return
      }

      if (square === selectedSquare) {
        setSelectedSquare(null)
        setLegalDestinations([])
        return
      }

      if (legalDestinations.includes(square)) {
        attemptMove(selectedSquare, square)
        return
      }

      const replacementDestinations = controller.legalDestinations(square)

      if (replacementDestinations.length > 0) {
        setSelectedSquare(square)
        setLegalDestinations(replacementDestinations)
      } else {
        setSelectedSquare(null)
        setLegalDestinations([])
      }
    },
    [
      attemptMove,
      controller,
      legalDestinations,
      selectedSquare,
      view.isBoardInteractive,
    ],
  )

  const handlePrimaryAction = useCallback(() => {
    if (view.phase === 'checkpoint-ready') {
      applyView(controller.startCheckpoint())
    } else if (view.phase === 'stage-complete') {
      applyView(controller.continueAfterStage())
    } else if (
      view.phase === 'adaptive-ready' ||
      view.phase === 'run-complete'
    ) {
      applyView(controller.startAdaptiveRun())
    } else {
      applyView(controller.restartCurrentBlock())
    }
  }, [applyView, controller, view.phase])

  const handleHint = useCallback(() => {
    applyView(controller.requestHint())
  }, [applyView, controller])

  const handleResetProgress = useCallback(() => {
    if (
      window.confirm(
        'Effacer toute la progression de l’Italienne et recommencer à e4 ?',
      )
    ) {
      applyView(controller.resetAllProgress())
    }
  }, [applyView, controller])

  const stageProgress = Array.from(
    { length: view.stageMovesTotal },
    (_, index) => (index < view.stageMovesCompleted ? 'done' : 'todo'),
  )

  const primaryLabel =
    view.result?.primaryLabel ??
    (view.phase === 'adaptive-run'
      ? 'Recommencer ce run'
      : 'Recommencer ce bloc')

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Atelier des ouvertures</p>
          <h1>Partie italienne</h1>
        </div>
        <div className="header-status">
          <span>
            Maîtrise {view.masteryScore}% · couverture {view.coverageCount}/
            {view.coverageTotal}
          </span>
          <strong>Adaptatif · v0.3</strong>
        </div>
      </header>

      <section className="training-layout">
        <BoardView
          fen={view.fen}
          disabled={!view.isBoardInteractive}
          selectedSquare={selectedSquare}
          legalDestinations={legalDestinations}
          lastMove={view.lastMove}
          onMove={attemptMove}
          onSquareSelect={handleSquareSelect}
        />

        <aside className={`coach-card ${view.result ? 'result-card' : ''}`}>
          <div className="stage-row">
            <span>Étape {view.stageIndex}</span>
            <span>
              {view.completedStages}/{view.totalStages} blocs · {view.runsCompleted}{' '}
              runs
            </span>
          </div>

          <h2>{view.result?.title ?? view.stageTitle}</h2>

          <div className="progress-track" aria-label="Progression de l’étape">
            {stageProgress.map((state, index) => (
              <span className={state} key={index} />
            ))}
          </div>

          {view.result ? (
            <div className="result-summary" aria-live="polite">
              <span className="coach-label">{view.coachLabel}</span>
              <p>{view.result.message}</p>
              <div className="concept-box">
                <span>Idées travaillées</span>
                {view.result.concepts.map((concept) => (
                  <strong key={concept}>{concept}</strong>
                ))}
              </div>
              <div className="sequence-chips" aria-label="Coups appris">
                {view.result.learnerMoveSequence.map((move) => (
                  <span key={move}>{move}</span>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="coach-message" aria-live="polite">
                <span className="coach-label">{view.coachLabel}</span>
                <p>{view.prompt}</p>
              </div>

              {view.feedback && (
                <p className="feedback" role="alert">
                  {view.feedback}
                </p>
              )}

              {view.hint && (
                <p className="hint-message" aria-live="polite">
                  <strong>Indice demandé</strong>
                  {view.hint}
                </p>
              )}

              <div className="move-history">
                <span>
                  Décisions {view.learnerMovesCompleted}/{view.learnerMovesTotal}
                </span>
                <strong>
                  {view.moveHistory.length > 0
                    ? view.moveHistory.join(' · ')
                    : 'À construire'}
                </strong>
              </div>
            </>
          )}

          <div className="mastery-strip" aria-label="Progression adaptative">
            <span>
              <strong>{view.masteryScore}%</strong>
              Maîtrise
            </span>
            <span>
              <strong>{view.coverageCount}/{view.coverageTotal}</strong>
              Couverture
            </span>
            <span>
              <strong>{view.dueCount}</strong>
              À revoir
            </span>
            <span>
              <strong>{view.deepestRun}/{view.learnerMovesTotal}</strong>
              Profondeur
            </span>
          </div>

          {!view.result && view.canRequestHint && (
            <button className="hint-button" type="button" onClick={handleHint}>
              Besoin d’un indice ?
            </button>
          )}

          <button
            className="primary-button"
            type="button"
            onClick={handlePrimaryAction}
          >
            {primaryLabel}
          </button>

          <p className="interaction-note">
            Aucun indice n’est affiché automatiquement. Clique une pièce puis sa
            destination, ou utilise le glisser-déposer.
          </p>

          <button
            className="text-button"
            type="button"
            onClick={handleResetProgress}
          >
            Effacer ma progression
          </button>
        </aside>
      </section>
    </main>
  )
}
