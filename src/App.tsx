import { useCallback, useEffect, useState } from 'react'

import { GameController } from './application/GameController'
import type { GameViewModel } from './application/GameViewModel'
import type { ChessSquare } from './domain/chess/ChessRules'
import { ChessJsAdapter } from './domain/chess/ChessJsAdapter'
import {
  italianCurriculum,
  italianOpeningGraph,
} from './data/openings/italian/curriculum'
import { LocalStorageProgressRepository } from './infrastructure/storage/LocalStorageProgressRepository'
import { AudioService } from './infrastructure/audio/AudioService'
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
  const [audio] = useState(() => new AudioService())
  const [view, setView] = useState(() => controller.getViewModel())
  const [soundEnabled, setSoundEnabled] = useState(
    () => window.localStorage.getItem('chess-openings-trainer.sound') !== 'off',
  )
  const [boardTheme, setBoardTheme] = useState<'walnut' | 'midnight'>(() =>
    window.localStorage.getItem('chess-openings-trainer.board') === 'midnight' &&
    controller.getViewModel().bossVictories > 0
      ? 'midnight'
      : 'walnut',
  )
  const [selectedSquare, setSelectedSquare] = useState<ChessSquare | null>(null)
  const [legalDestinations, setLegalDestinations] = useState<
    readonly ChessSquare[]
  >([])

  const applyView = useCallback((nextView: GameViewModel) => {
    setView(nextView)
    setSelectedSquare(null)
    setLegalDestinations([])
  }, [])

  useEffect(() => {
    audio.setEnabled(soundEnabled)
    window.localStorage.setItem(
      'chess-openings-trainer.sound',
      soundEnabled ? 'on' : 'off',
    )
  }, [audio, soundEnabled])

  useEffect(() => {
    window.localStorage.setItem('chess-openings-trainer.board', boardTheme)
  }, [boardTheme])

  useEffect(() => {
    if (!view.consequence?.replyPending) return
    const timer = window.setTimeout(() => {
      audio.play('opponent')
      applyView(controller.revealConsequence())
    }, 720)
    return () => window.clearTimeout(timer)
  }, [applyView, audio, controller, view.consequence?.replyPending])

  const attemptMove = useCallback(
    (from: ChessSquare, to: ChessSquare): boolean => {
      const result = controller.submitLearnerMove({ from, to })
      applyView(result.view)

      if (result.kind === 'consequence' || result.kind === 'illegal') {
        audio.play('mistake')
      } else if (result.kind !== 'not-awaiting-move') {
        audio.play(result.view.streak >= 3 ? 'combo' : 'correct')
      }

      return (
        result.kind === 'accepted' ||
        result.kind === 'consequence' ||
        result.kind === 'checkpoint-ready' ||
        result.kind === 'stage-complete' ||
        result.kind === 'run-complete'
      )
    },
    [applyView, audio, controller],
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
      view.phase === 'run-complete' ||
      view.phase === 'run-over'
    ) {
      applyView(controller.startAdaptiveRun())
    } else {
      applyView(controller.restartCurrentBlock())
    }
  }, [applyView, controller, view.phase])

  const handleHint = useCallback(() => {
    audio.play('hint')
    applyView(controller.requestHint())
  }, [applyView, audio, controller])

  const handleConsequenceAction = useCallback(() => {
    audio.play('move')
    applyView(controller.retryAfterConsequence())
  }, [applyView, audio, controller])

  const handleBoss = useCallback(() => {
    audio.play('boss')
    applyView(controller.startBossRun())
  }, [applyView, audio, controller])

  const handleResetProgress = useCallback(() => {
    if (
      window.confirm(
        'Effacer toute la progression de l’Italienne et recommencer à e4 ?',
      )
    ) {
      applyView(controller.resetAllProgress())
      setBoardTheme('walnut')
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

  const mapSteps = [
    { label: 'Fondations', detail: 'e4 · Nf3 · Bc4', done: view.completedStages >= 1 },
    { label: 'Structure calme', detail: 'd3 · O-O · c3', done: view.completedStages >= 2 },
    { label: 'Pianissimo', detail: 'Branches & manœuvre', done: view.deepestRun >= view.learnerMovesTotal },
    { label: 'Défi maître', detail: '3 vies · 1 indice', done: view.bossVictories > 0 },
  ]
  const currentMapStep = mapSteps.findIndex((step) => !step.done)

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
          <strong>Expérience & son · v0.5</strong>
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
          theme={boardTheme}
        />

        <aside className={`coach-card ${view.result ? 'result-card' : ''}`}>
          <div className="run-hud" aria-label="État du run">
            <span title="Vies">❤️ {view.lives ?? 3}</span>
            <span title="Or">🪙 {view.goldBalance}</span>
            <span title="Combo">🔥 {view.streak}</span>
          </div>

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

          {view.consequence ? (
            <div className="consequence-card" aria-live="assertive">
              <span className="coach-label">Conséquence sur l’échiquier</span>
              <h3>{view.consequence.title}</h3>
              <p>{view.consequence.explanation}</p>
              <div className="consequence-line">
                <span>{view.consequence.learnerMove}</span>
                <b>→</b>
                <span className={view.consequence.replyPending ? 'waiting' : ''}>
                  {view.consequence.replyPending
                    ? 'Les Noirs réfléchissent…'
                    : view.consequence.opponentReply ?? 'Hors répertoire'}
                </span>
              </div>
              <button
                className="primary-button consequence-action"
                type="button"
                onClick={handleConsequenceAction}
                disabled={view.consequence.replyPending}
              >
                {view.consequence.actionLabel}
              </button>
            </div>
          ) : view.result ? (
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
                  <strong>
                    Indice acheté · −{view.hintCost} 🪙
                  </strong>
                  {view.hint}
                </p>
              )}

              {view.eventMessage && (
                <p className="event-message" aria-live="polite">
                  {view.eventMessage}
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

          {!view.result &&
            (view.canRequestHint || view.hintUnavailableReason) && (
            <button
              className="hint-button"
              type="button"
              onClick={handleHint}
              disabled={!view.canRequestHint}
              title={view.hintUnavailableReason ?? undefined}
            >
              💡 Indice aléatoire · {view.hintCost} 🪙
            </button>
          )}

          {!view.consequence && (
            <button
              className="primary-button"
              type="button"
              onClick={handlePrimaryAction}
            >
              {primaryLabel}
            </button>
          )}

          {view.bossAvailable && !view.bossActive && !view.consequence && (
            <button className="boss-button" type="button" onClick={handleBoss}>
              ♛ Lancer le défi maître
            </button>
          )}

          <div className="experience-settings" aria-label="Réglages d’expérience">
            <button
              type="button"
              onClick={() => setSoundEnabled((enabled) => !enabled)}
              aria-pressed={soundEnabled}
            >
              {soundEnabled ? '🔊 Son' : '🔇 Son'}
            </button>
            <button
              type="button"
              onClick={() =>
                setBoardTheme((theme) =>
                  theme === 'walnut' ? 'midnight' : 'walnut',
                )
              }
              disabled={view.bossVictories === 0}
              title={
                view.bossVictories === 0
                  ? 'Réussis le défi maître pour débloquer ce thème.'
                  : undefined
              }
            >
              {boardTheme === 'walnut' ? '◐ Noyer' : '◑ Minuit'}
            </button>
          </div>

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

      <section className="journey-card" aria-labelledby="journey-title">
        <div className="journey-heading">
          <div>
            <p className="eyebrow">Carte de progression</p>
            <h2 id="journey-title">Ta route dans l’Italienne</h2>
          </div>
          <span>{view.bossVictories} victoire{view.bossVictories === 1 ? '' : 's'} maître</span>
        </div>
        <div className="journey-map">
          {mapSteps.map((step, index) => (
            <div
              className={`journey-step ${step.done ? 'done' : index === currentMapStep ? 'current' : ''}`}
              key={step.label}
            >
              <i>{step.done ? '✓' : index + 1}</i>
              <strong>{step.label}</strong>
              <small>{step.detail}</small>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
