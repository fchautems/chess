import { useCallback, useState } from 'react'

import { GameController } from './application/GameController'
import type { ChessSquare } from './domain/chess/ChessRules'
import { ChessJsAdapter } from './domain/chess/ChessJsAdapter'
import {
  ITALIAN_STAGE_0_ENTRY_NODE_ID,
  italianOpeningGraph,
} from './data/openings/italian/stage0'
import { BoardView } from './ui/board/BoardView'

function createController(): GameController {
  return new GameController(
    italianOpeningGraph,
    new ChessJsAdapter(),
    ITALIAN_STAGE_0_ENTRY_NODE_ID,
  )
}

export default function App() {
  const [controller] = useState(createController)
  const [view, setView] = useState(() => controller.getViewModel())

  const handleMove = useCallback(
    (from: ChessSquare, to: ChessSquare): boolean => {
      const result = controller.submitLearnerMove({ from, to })
      setView(result.view)

      return result.kind === 'accepted' || result.kind === 'complete'
    },
    [controller],
  )

  const handleReset = useCallback(() => {
    setView(controller.reset())
  }, [controller])

  const progress = Array.from({ length: view.learnerMovesTotal }, (_, index) =>
    index < view.learnerMovesCompleted ? 'done' : 'todo',
  )

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Atelier des ouvertures</p>
          <h1>Partie italienne</h1>
        </div>
        <div className="version-badge">Fondation · v0.1</div>
      </header>

      <section className="training-layout">
        <BoardView
          fen={view.fen}
          disabled={view.status === 'complete'}
          onMove={handleMove}
        />

        <aside className="coach-card">
          <div className="stage-row">
            <span>Étape 0</span>
            <span>
              {view.learnerMovesCompleted}/{view.learnerMovesTotal}
            </span>
          </div>

          <h2>{view.stageTitle}</h2>

          <div className="progress-track" aria-label="Progression">
            {progress.map((state, index) => (
              <span className={state} key={index} />
            ))}
          </div>

          <div className="coach-message" aria-live="polite">
            <span className="coach-label">
              {view.status === 'complete' ? 'Bien joué' : 'À toi de jouer'}
            </span>
            <p>{view.prompt}</p>
          </div>

          {view.feedback && (
            <p className="feedback" role="alert">
              {view.feedback}
            </p>
          )}

          <div className="move-history">
            <span>Parcours</span>
            <strong>
              {view.moveHistory.length > 0
                ? view.moveHistory.join(' · ')
                : 'À construire'}
            </strong>
          </div>

          <button className="reset-button" type="button" onClick={handleReset}>
            {view.status === 'complete' ? 'Rejouer depuis le début' : 'Recommencer'}
          </button>

          <p className="scope-note">
            Cette première fondation valide uniquement e4 → Nf3 → Bc4. La boucle
            pédagogique arrive en v0.2.
          </p>
        </aside>
      </section>
    </main>
  )
}
