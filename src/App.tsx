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
        result.kind === 'lesson-discovered' ||
        result.kind === 'lesson-complete'
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
    if (view.phase === 'ready-to-reproduce') {
      applyView(controller.startReproduction())
    } else if (view.phase === 'lesson-complete') {
      applyView(controller.continueToNextLesson())
    } else if (view.phase === 'curriculum-complete') {
      applyView(controller.resetAllProgress())
    } else {
      applyView(controller.restartSequence())
    }
  }, [applyView, controller, view.phase])

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
    { length: view.stageLessonsTotal },
    (_, index) => (index < view.stageLessonsCompleted ? 'done' : 'todo'),
  )

  const primaryLabel = (() => {
    switch (view.phase) {
      case 'ready-to-reproduce':
        return 'Rejouer sans aide'
      case 'lesson-complete':
        return view.result?.hasNextLesson
          ? 'Ajouter le prochain concept'
          : 'Voir le bilan des deux étapes'
      case 'curriculum-complete':
        return 'Recommencer le parcours'
      default:
        return 'Recommencer la séquence'
    }
  })()

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Atelier des ouvertures</p>
          <h1>Partie italienne</h1>
        </div>
        <div className="header-status">
          <span>
            Parcours {view.completedLessons}/{view.totalLessons}
          </span>
          <strong>Apprentissage · v0.2</strong>
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
              {view.stageLessonsCompleted}/{view.stageLessonsTotal}
            </span>
          </div>

          <h2>{view.result?.title ?? view.lessonTitle}</h2>

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
                <span>Idée retenue</span>
                <strong>{view.result.concept}</strong>
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

              <div className="move-history">
                <span>
                  Séquence {view.learnerMovesCompleted}/{view.learnerMovesTotal}
                </span>
                <strong>
                  {view.moveHistory.length > 0
                    ? view.moveHistory.join(' · ')
                    : 'À construire'}
                </strong>
              </div>
            </>
          )}

          <button
            className="primary-button"
            type="button"
            onClick={handlePrimaryAction}
          >
            {primaryLabel}
          </button>

          <p className="interaction-note">
            Clique une pièce puis sa case d’arrivée, ou utilise le glisser-déposer.
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
