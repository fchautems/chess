import type {
  AppliedChessMove,
  ChessMoveInput,
  ChessRules,
  ChessSquare,
} from '../domain/chess/ChessRules'
import type {
  CurriculumLesson,
  OpeningCurriculum,
} from '../domain/curriculum/Curriculum'
import type { NodeMastery } from '../domain/mastery/NodeMastery'
import {
  isMasteryDue,
  recordMasteryFailure,
  recordMasterySuccess,
} from '../domain/mastery/NodeMastery'
import type { OpeningGraph } from '../domain/opening/OpeningGraph'
import { toUci } from '../domain/opening/OpeningMove'
import { drawHint, HINT_COST } from '../domain/hints/HintEngine'
import { findMistakeConsequence } from '../domain/mistakes/MistakeConsequences'
import type { HintQuality, OpeningNode } from '../domain/opening/OpeningNode'
import {
  completeRun,
  createRunState,
  recordHintPurchase,
  recordRunFailure,
  recordRunSuccess,
  type RunState,
} from '../domain/run/RunEngine'
import {
  SessionDirector,
  type SessionStrategy,
} from '../domain/session/SessionDirector'
import type {
  PersistedTrainingPhase,
  PlayerProgressV3,
  ProgressRepository,
  RunSummary,
} from './progress/ProgressRepository'
import type {
  BoardMoveView,
  GameViewModel,
  MoveResult,
  MoveResultKind,
} from './GameViewModel'

const DEFAULT_SEED = 73_941

interface GameControllerOptions {
  now?: () => number
  seed?: number
}

interface PendingConsequence {
  originalFen: string
  originalMoveHistory: readonly string[]
  originalLastMove: BoardMoveView | null
  learnerMove: AppliedChessMove
  opponentReply: (ChessMoveInput & { san: string }) | null
  title: string
  explanation: string
  replyRevealed: boolean
}

export class GameController {
  private currentNodeId: string
  private phase: PersistedTrainingPhase
  private activeStageIndex: number
  private readonly completedStageIds: Set<string>
  private readonly masteryByNodeId: Map<string, NodeMastery>
  private randomSeed: number
  private directorDecisionIndex: number
  private runsCompleted: number
  private deepestRun: number
  private goldBalance: number
  private bestStreak: number
  private hintDrawIndex: number
  private lastRun: RunSummary | null
  private feedback: string | null = null
  private hint: string | null = null
  private currentHintQuality: HintQuality | null = null
  private seenHintTexts: string[] = []
  private eventMessage: string | null = null
  private moveHistory: string[] = []
  private lastMove: BoardMoveView | null = null
  private learnerMovesCompleted = 0
  private currentHintsUsed = 0
  private recoveredAfterError = false
  private runState: RunState | null = null
  private readonly improvedNodeIds = new Set<string>()
  private branchLabels: string[] = []
  private lastBranchStrategy: SessionStrategy | null = null
  private pendingConsequence: PendingConsequence | null = null
  private bossVictories = 0
  private readonly now: () => number
  private readonly director: SessionDirector

  constructor(
    private readonly graph: OpeningGraph,
    private readonly rules: ChessRules,
    private readonly curriculum: OpeningCurriculum,
    private readonly progressRepository: ProgressRepository,
    options: GameControllerOptions = {},
  ) {
    this.assertCurriculumValid()
    this.now = options.now ?? Date.now
    this.director = new SessionDirector(graph)

    const restored = this.restoreProgress(progressRepository.load(), options.seed)
    this.phase = restored.phase
    this.activeStageIndex = restored.activeStageIndex
    this.completedStageIds = new Set(restored.completedStageIds)
    this.masteryByNodeId = new Map(
      Object.entries(restored.masteryByNodeId).map(([nodeId, mastery]) => [
        nodeId,
        { ...mastery },
      ]),
    )
    this.randomSeed = restored.randomSeed
    this.directorDecisionIndex = restored.directorDecisionIndex
    this.runsCompleted = restored.runsCompleted
    this.deepestRun = restored.deepestRun
    this.goldBalance = restored.goldBalance
    this.bestStreak = restored.bestStreak
    this.hintDrawIndex = restored.hintDrawIndex
    this.lastRun = restored.lastRun ? { ...restored.lastRun } : null
    this.bossVictories = restored.bossVictories ?? 0
    this.currentNodeId = curriculum.startNodeId

    if (!this.restoreSession(restored)) {
      this.prepareBoardForPhase()
    }
  }

  submitLearnerMove(move: ChessMoveInput): MoveResult {
    const node = this.currentNode()

    if (!this.isInteractive() || this.pendingConsequence || node.type !== 'learner-decision') {
      return this.result('not-awaiting-move')
    }

    const previousFen = this.rules.fen()
    const appliedMove = this.rules.move(move)

    if (!appliedMove) {
      this.feedback = node.errorExplanation
      if (this.recordFailureOnce(node.id) && this.runHasEnded()) {
        this.finishRun('out-of-lives')
        this.saveProgress()
        return this.result('run-over')
      }
      this.saveProgress()
      return this.result('illegal')
    }

    const acceptedMove = node.acceptedLearnerMoves.find(
      (candidate) => toUci(candidate) === appliedMove.uci,
    )

    if (!acceptedMove) {
      const authored = findMistakeConsequence(node.id, appliedMove.uci)
      this.recordFailureOnce(node.id)
      this.pendingConsequence = {
        originalFen: previousFen,
        originalMoveHistory: [...this.moveHistory],
        originalLastMove: this.lastMove ? { ...this.lastMove } : null,
        learnerMove: appliedMove,
        opponentReply: authored?.opponentReply ?? null,
        title: authored?.title ?? 'Ce coup quitte notre plan',
        explanation: authored?.explanation ??
          `${node.errorExplanation} Le coup reste peut-être jouable, mais il n’est pas puni artificiellement : nous revenons à la position pour travailler l’idée prévue.`,
        replyRevealed: !authored?.opponentReply,
      }
      this.recordMove(appliedMove)
      this.feedback = authored
        ? 'Observe maintenant comment les Noirs exploitent cette imprécision.'
        : 'Coup légal, mais hors du répertoire travaillé.'
      return this.result('consequence')
    }

    const answeredNodeId = node.id
    const masteryBefore = this.masteryByNodeId.get(answeredNodeId)
    const hintsUsed = this.currentHintsUsed
    const hintQuality = this.currentHintQuality
    const recovered = this.recoveredAfterError
    this.masteryByNodeId.set(
      answeredNodeId,
      recordMasterySuccess(
        masteryBefore,
        answeredNodeId,
        this.now(),
        hintsUsed,
        recovered,
        hintQuality,
      ),
    )
    this.improvedNodeIds.add(answeredNodeId)
    this.feedback = null
    this.hint = null
    this.currentHintQuality = null
    this.seenHintTexts = []
    this.currentHintsUsed = 0
    this.recoveredAfterError = false
    this.recordMove(appliedMove)
    this.learnerMovesCompleted += 1

    if (this.phase === 'adaptive-run') {
      this.deepestRun = Math.max(this.deepestRun, this.learnerMovesCompleted)
      const success = recordRunSuccess(this.requireRunState(), {
        assisted: hintsUsed > 0,
        recovered,
        masteryBefore: masteryBefore?.score ?? 0,
        attemptsBefore: masteryBefore?.attempts ?? 0,
      })
      this.runState = success.state
      this.goldBalance += success.goldReward
      this.bestStreak = Math.max(this.bestStreak, success.state.bestStreak)
      this.eventMessage = this.successEventMessage(
        success.goldReward,
        success.milestone,
        recovered,
      )
    }

    this.currentNodeId = acceptedMove.targetNodeId
    this.assertPositionMatchesNode(this.currentNode())

    if (this.phase === 'adaptive-run' && this.currentNode().type === 'completion') {
      this.runState = completeRun(this.requireRunState())
      this.finishRun('completed')
      this.saveProgress()
      return this.result('run-complete')
    }

    if (
      (this.phase === 'discovering' || this.phase === 'checkpoint') &&
      answeredNodeId === this.stageEndLesson().targetNodeId
    ) {
      if (this.phase === 'discovering') {
        this.phase = 'checkpoint-ready'
        this.saveProgress()
        return this.result('checkpoint-ready')
      }

      this.completedStageIds.add(this.activeStage().id)
      this.phase = 'stage-complete'
      this.saveProgress()
      return this.result('stage-complete')
    }

    this.playOpponentMoves(this.phase === 'adaptive-run')
    this.saveProgress()
    return this.result('accepted')
  }

  revealConsequence(): GameViewModel {
    const pending = this.pendingConsequence
    if (!pending || pending.replyRevealed) return this.getViewModel()

    if (pending.opponentReply) {
      const reply = this.rules.move(pending.opponentReply)
      if (!reply) {
        throw new Error(`Authored consequence ${pending.opponentReply.san} is illegal`)
      }
      this.recordMove(reply)
    }
    pending.replyRevealed = true
    return this.getViewModel()
  }

  retryAfterConsequence(): GameViewModel {
    const pending = this.pendingConsequence
    if (!pending || !pending.replyRevealed) return this.getViewModel()

    this.pendingConsequence = null
    if (this.runHasEnded()) {
      this.finishRun('out-of-lives')
      this.saveProgress()
      return this.getViewModel()
    }

    this.rules.load(pending.originalFen)
    this.moveHistory = [...pending.originalMoveHistory]
    this.lastMove = pending.originalLastMove ? { ...pending.originalLastMove } : null
    this.feedback = 'À toi de corriger : la vie est déjà comptée, cette position ne peut pas t’en coûter une seconde.'
    this.saveProgress()
    return this.getViewModel()
  }

  legalDestinations(from: ChessSquare): readonly ChessSquare[] {
    const node = this.currentNode()

    if (!this.isInteractive() || node.type !== 'learner-decision') return []
    return this.rules.legalDestinations(from)
  }

  requestHint(): GameViewModel {
    const node = this.currentNode()

    if (!this.isInteractive() || node.type !== 'learner-decision') {
      return this.getViewModel()
    }

    if (this.runState?.mode === 'boss' && this.runState.hintsPurchased >= 1) {
      this.feedback = 'Le défi maître autorise un seul indice.'
      return this.getViewModel()
    }

    if (this.goldBalance < HINT_COST) {
      this.feedback = `Il te faut ${HINT_COST} pièces pour acheter un indice.`
      return this.getViewModel()
    }

    const drawn = drawHint(
      node.hints,
      this.currentHintsUsed,
      this.seenHintTexts,
      this.randomSeed,
      this.hintDrawIndex,
    )

    if (!drawn) {
      this.feedback = 'Tous les indices de cette position ont déjà été révélés.'
      return this.getViewModel()
    }

    this.goldBalance -= HINT_COST
    this.hintDrawIndex += 1
    this.hint = drawn.text
    this.currentHintQuality = moreDirectQuality(
      this.currentHintQuality,
      drawn.quality,
    )
    this.seenHintTexts.push(drawn.text)
    this.currentHintsUsed += 1
    this.feedback = null

    if (this.phase === 'adaptive-run') {
      this.runState = recordHintPurchase(this.requireRunState(), HINT_COST)
    }

    this.saveProgress()
    return this.getViewModel()
  }

  startCheckpoint(): GameViewModel {
    if (this.phase !== 'checkpoint-ready') return this.getViewModel()

    this.phase = 'checkpoint'
    this.prepareStageStart()
    this.saveProgress()
    return this.getViewModel()
  }

  continueAfterStage(): GameViewModel {
    if (this.phase !== 'stage-complete') return this.getViewModel()

    if (this.activeStageIndex < this.stageIds().length - 1) {
      this.activeStageIndex += 1
      this.phase = 'discovering'
      this.feedback = null
      this.hint = null
      this.currentHintQuality = null
      this.seenHintTexts = []
      this.learnerMovesCompleted = 0
      this.currentHintsUsed = 0
      this.recoveredAfterError = false
      this.playOpponentMoves(false)
    } else {
      this.phase = 'adaptive-ready'
    }

    this.saveProgress()
    return this.getViewModel()
  }

  startAdaptiveRun(): GameViewModel {
    if (
      this.phase !== 'adaptive-ready' &&
      this.phase !== 'run-complete' &&
      this.phase !== 'run-over'
    ) {
      return this.getViewModel()
    }

    this.phase = 'adaptive-run'
    this.runState = createRunState()
    this.improvedNodeIds.clear()
    this.branchLabels = []
    this.eventMessage = 'Nouveau run · trois vies pour aller le plus loin possible.'
    this.resetBoardTo(this.curriculum.startNodeId)
    this.saveProgress()
    return this.getViewModel()
  }

  startBossRun(): GameViewModel {
    if (
      !this.bossAvailable() ||
      (this.phase !== 'adaptive-ready' &&
        this.phase !== 'run-complete' &&
        this.phase !== 'run-over')
    ) {
      return this.getViewModel()
    }

    this.phase = 'adaptive-run'
    this.runState = createRunState('boss')
    this.improvedNodeIds.clear()
    this.branchLabels = []
    this.eventMessage = 'Défi maître · trois vies, un seul indice, toute la ligne.'
    this.resetBoardTo(this.curriculum.startNodeId)
    this.saveProgress()
    return this.getViewModel()
  }

  restartCurrentBlock(): GameViewModel {
    if (!this.isInteractive()) return this.getViewModel()

    if (this.phase === 'adaptive-run') {
      this.runState = createRunState(this.runState?.mode ?? 'normal')
      this.improvedNodeIds.clear()
      this.branchLabels = []
      this.eventMessage = 'Run relancé · trois vies restaurées.'
      this.resetBoardTo(this.curriculum.startNodeId)
    } else {
      this.prepareStageStart()
    }

    this.saveProgress()
    return this.getViewModel()
  }

  resetAllProgress(): GameViewModel {
    this.progressRepository.reset()
    this.phase = 'discovering'
    this.activeStageIndex = 0
    this.completedStageIds.clear()
    this.masteryByNodeId.clear()
    this.randomSeed = DEFAULT_SEED
    this.directorDecisionIndex = 0
    this.runsCompleted = 0
    this.deepestRun = 0
    this.goldBalance = 15
    this.bestStreak = 0
    this.hintDrawIndex = 0
    this.lastRun = null
    this.bossVictories = 0
    this.pendingConsequence = null
    this.runState = null
    this.improvedNodeIds.clear()
    this.branchLabels = []
    this.eventMessage = null
    this.lastBranchStrategy = null
    this.prepareStageStart()
    return this.getViewModel()
  }

  getViewModel(): GameViewModel {
    const isRunView =
      this.phase === 'adaptive-run' ||
      this.phase === 'run-complete' ||
      this.phase === 'run-over'
    const stage = isRunView
      ? this.graph.getStage(this.currentNode().curriculumStageId)
      : this.activeStage()
    const stageLessons = this.stageLessons()
    const runDecisionTarget = this.maximumRunDecisions()
    const learnerNodes = this.learnerDecisionNodes()
    const masteredNodes = learnerNodes
      .map((node) => this.masteryByNodeId.get(node.id))
      .filter((mastery): mastery is NodeMastery => Boolean(mastery))
    const masteryScore = Math.round(
      learnerNodes.reduce(
        (sum, node) => sum + (this.masteryByNodeId.get(node.id)?.score ?? 0),
        0,
      ) / learnerNodes.length,
    )

    return {
      fen: this.rules.fen(),
      nodeId: this.currentNodeId,
      phase: this.phase,
      isBoardInteractive: this.isInteractive() && !this.pendingConsequence,
      stageIndex: stage.index,
      stageTitle: stage.title,
      stageMovesCompleted:
        isRunView
          ? Math.min(this.learnerMovesCompleted, runDecisionTarget)
          : this.phase === 'checkpoint-ready' || this.phase === 'stage-complete'
          ? stageLessons.length
          : Math.min(this.learnerMovesCompleted, stageLessons.length),
      stageMovesTotal: isRunView ? runDecisionTarget : stageLessons.length,
      coachLabel: this.coachLabel(),
      prompt: this.currentPrompt(),
      feedback: this.feedback,
      hint: this.hint,
      hintQuality: this.currentHintQuality,
      hintCost: HINT_COST,
      canRequestHint:
        this.isInteractive() &&
        this.currentNode().type === 'learner-decision' &&
        this.goldBalance >= HINT_COST &&
        this.availableHintCount(this.currentNode()) > 0 &&
        !(this.runState?.mode === 'boss' && this.runState.hintsPurchased >= 1),
      hintUnavailableReason: this.hintUnavailableReason(),
      moveHistory: [...this.moveHistory],
      lastMove: this.lastMove ? { ...this.lastMove } : null,
      learnerMovesCompleted: this.learnerMovesCompleted,
      learnerMovesTotal:
        isRunView
          ? runDecisionTarget
          : stageLessons.length,
      completedStages: this.completedStageIds.size,
      totalStages: this.stageIds().length,
      masteryScore,
      coverageCount: masteredNodes.filter((mastery) => mastery.attempts > 0).length,
      coverageTotal: learnerNodes.length,
      dueCount: masteredNodes.filter((mastery) => isMasteryDue(mastery, this.now())).length,
      currentNodeMastery: this.masteryByNodeId.get(this.currentNodeId)?.score ?? 0,
      runsCompleted: this.runsCompleted,
      deepestRun: this.deepestRun,
      goldBalance: this.goldBalance,
      lives: this.runState?.lives ?? this.lastRunLives(),
      streak: this.runState?.streak ?? 0,
      bestStreak: this.bestStreak,
      runGoldEarned: this.runState?.goldEarned ?? this.lastRun?.goldEarned ?? 0,
      runGoldSpent: this.runState?.goldSpent ?? this.lastRun?.goldSpent ?? 0,
      eventMessage: this.eventMessage,
      lastBranchStrategy: this.lastBranchStrategy,
      lastRun: this.lastRun ? { ...this.lastRun } : null,
      consequence: this.consequenceView(),
      bossAvailable: this.bossAvailable() && this.phase !== 'adaptive-run',
      bossActive: this.runState?.mode === 'boss' && this.phase === 'adaptive-run',
      bossVictories: this.bossVictories,
      result: this.resultView(),
    }
  }

  private playOpponentMoves(adaptive: boolean): void {
    let node = this.currentNode()

    while (node.type === 'opponent-branch') {
      let reply = node.opponentMoves[0]

      if (!reply) throw new Error(`Opponent node ${node.id} has no reply`)

      if (adaptive && node.opponentMoves.length > 1) {
        const directed = this.director.choose(
          node,
          this.masteryByNodeId,
          this.now(),
          this.randomSeed,
          this.directorDecisionIndex,
        )
        reply = directed.move
        this.lastBranchStrategy = directed.strategy
        this.directorDecisionIndex += 1
        this.branchLabels.push(branchLabel(node.id, reply.san))
      }

      const appliedMove = this.rules.move(reply)

      if (!appliedMove) {
        throw new Error(`Scripted opponent move ${reply.san} is illegal at ${node.id}`)
      }

      this.recordMove(appliedMove)
      this.currentNodeId = reply.targetNodeId
      node = this.currentNode()
      this.assertPositionMatchesNode(node)
    }
  }

  private prepareBoardForPhase(): void {
    if (this.phase === 'discovering' || this.phase === 'checkpoint') {
      this.prepareStageStart()
      return
    }

    if (this.phase === 'adaptive-run') {
      this.runState ??= createRunState()
      this.resetBoardTo(this.curriculum.startNodeId)
      return
    }

    this.resetBoardTo(this.stageCompletionNodeId())
  }

  private prepareStageStart(): void {
    this.resetBoardTo(this.activeStage().entryNodeId)
    this.playOpponentMoves(false)
  }

  private resetBoardTo(nodeId: string): void {
    this.currentNodeId = nodeId
    this.feedback = null
    this.hint = null
    this.currentHintQuality = null
    this.seenHintTexts = []
    this.moveHistory = []
    this.lastMove = null
    this.learnerMovesCompleted = 0
    this.currentHintsUsed = 0
    this.recoveredAfterError = false
    this.pendingConsequence = null
    this.rules.load(this.currentNode().fen)
    this.assertPositionMatchesNode(this.currentNode())
  }

  private restoreSession(progress: PlayerProgressV3): boolean {
    if (!this.isInteractivePhase(progress.phase) || !progress.session) return false

    try {
      this.currentNodeId = progress.session.currentNodeId
      this.rules.load(progress.session.fen)
      this.assertPositionMatchesNode(this.currentNode())
      this.moveHistory = [...progress.session.moveHistory]
      this.learnerMovesCompleted = progress.session.learnerMovesCompleted
      this.currentHintsUsed = progress.session.currentHintsUsed
      this.currentHintQuality = progress.session.currentHintQuality
      this.seenHintTexts = [...progress.session.seenHintTexts]
      this.recoveredAfterError = progress.session.recoveredAfterError
      this.runState = progress.session.runState
        ? { ...progress.session.runState }
        : null
      this.improvedNodeIds.clear()
      progress.session.improvedNodeIds.forEach((id) => this.improvedNodeIds.add(id))
      this.branchLabels = [...progress.session.branchLabels]
      return true
    } catch {
      return false
    }
  }

  private currentPrompt(): string {
    switch (this.phase) {
      case 'discovering':
        return 'Continue tant que tu reconnais la position. Le coach intervient seulement si tu bloques.'
      case 'checkpoint-ready':
        return 'Tu as traversé tout le bloc. Une seule reproduction sans aide va maintenant le consolider.'
      case 'checkpoint':
        return 'Retrouve les décisions de ce bloc sans réponse affichée.'
      case 'stage-complete':
        return this.activeStageIndex < this.stageIds().length - 1
          ? 'Bloc validé. Le prochain concept continue depuis cette position.'
          : 'Les deux blocs sont validés. Place à des réponses noires moins prévisibles.'
      case 'adaptive-ready':
        return 'L’entraînement adaptatif choisira maintenant entre consolidation, faiblesse et surprise.'
      case 'adaptive-run':
        return 'Continue aussi loin que possible : les Noirs peuvent changer l’ordre de leurs coups.'
      case 'run-complete':
        return 'Run terminé : la maîtrise et les positions à revoir ont été mises à jour.'
      case 'run-over':
        return 'Les trois vies sont perdues. Le bilan montre exactement où repartir.'
    }
  }

  private coachLabel(): string {
    switch (this.phase) {
      case 'discovering':
        return 'Continue jusqu’où tu sais'
      case 'checkpoint-ready':
        return 'Bloc découvert'
      case 'checkpoint':
        return 'Contrôle sans aide'
      case 'stage-complete':
        return 'Bloc validé'
      case 'adaptive-ready':
        return 'Adaptatif débloqué'
      case 'adaptive-run':
        return this.lastBranchStrategy
          ? `Session · ${strategyLabel(this.lastBranchStrategy)}`
          : 'Session adaptative'
      case 'run-complete':
        return 'Bilan du run'
      case 'run-over':
        return 'Fin du run'
    }
  }

  private resultView(): GameViewModel['result'] {
    const lessons = this.stageLessons()
    const concepts = lessons.map((lesson) => lesson.concept)
    const moves = lessons.map((lesson) => lesson.learnerMoveSequence.at(-1) ?? '')

    if (this.phase === 'checkpoint-ready') {
      return {
        title: `${this.activeStage().title} découvert`,
        message:
          'Tu as enchaîné les nouveaux concepts sans redémarrage intermédiaire.',
        concepts,
        learnerMoveSequence: moves,
        primaryLabel: 'Valider ce bloc sans aide',
      }
    }

    if (this.phase === 'stage-complete') {
      const hasNext = this.activeStageIndex < this.stageIds().length - 1
      return {
        title: `${this.activeStage().title} validé`,
        message: hasNext
          ? 'Le prochain bloc démarre directement depuis cette position.'
          : 'La structure de base est acquise. Les prochains runs feront varier les réponses noires.',
        concepts,
        learnerMoveSequence: moves,
        primaryLabel: hasNext
          ? 'Continuer depuis cette position'
          : 'Préparer l’entraînement adaptatif',
      }
    }

    if (this.phase === 'adaptive-ready') {
      return {
        title: 'Entraînement adaptatif débloqué',
        message:
          'Les positions faibles reviendront plus souvent, avec consolidation et surprise contrôlée.',
        concepts: ['Maîtrise par position', 'Répétition espacée', 'Branches 70/20/10'],
        learnerMoveSequence: [],
        primaryLabel: 'Lancer un run adaptatif',
      }
    }

    if (this.phase === 'run-complete' || this.phase === 'run-over') {
      const summary = this.lastRun
      const succeeded = this.phase === 'run-complete'
      const bossVictory = summary?.bossVictory === true
      return {
        title: bossVictory
          ? 'Défi maître remporté'
          : succeeded
            ? 'Structure profonde atteinte'
            : 'Run terminé',
        message: bossVictory
          ? 'Tu as tenu toute la ligne avec les contraintes du défi. Le thème Minuit est maintenant disponible.'
          : succeeded
          ? 'Tu as traversé la structure complète malgré les variations de l’ordre noir.'
          : `Tu as atteint ${summary?.deepestPoint ?? 0} décisions. Les positions fragiles reviendront dans les prochains runs.`,
        concepts: [
          `Maîtrise globale ${this.getMasteryAverage()} %`,
          `Meilleur combo ${summary?.bestStreak ?? 0}`,
          `Or +${summary?.goldEarned ?? 0} / −${summary?.goldSpent ?? 0}`,
          `${summary?.improvedNodeIds.length ?? 0} positions renforcées`,
          `Branches : ${summary?.branchLabels.join(' · ') || 'tronc principal'}`,
        ],
        learnerMoveSequence: [],
        primaryLabel: succeeded ? 'Rejouer une autre variante' : 'Repartir avec trois vies',
      }
    }

    return null
  }

  private getMasteryAverage(): number {
    const nodes = this.learnerDecisionNodes()
    return Math.round(
      nodes.reduce(
        (sum, node) => sum + (this.masteryByNodeId.get(node.id)?.score ?? 0),
        0,
      ) / nodes.length,
    )
  }

  private recordFailureOnce(nodeId: string): boolean {
    if (this.recoveredAfterError) return false

    this.masteryByNodeId.set(
      nodeId,
      recordMasteryFailure(this.masteryByNodeId.get(nodeId), nodeId, this.now()),
    )
    this.recoveredAfterError = true
    this.eventMessage = null

    if (this.phase === 'adaptive-run') {
      this.runState = recordRunFailure(this.requireRunState())
    }

    return true
  }

  private recordMove(move: AppliedChessMove): void {
    this.moveHistory.push(move.san)
    this.lastMove = { from: move.from, to: move.to, san: move.san }
  }

  private stageIds(): readonly string[] {
    return [
      ...new Set(
        this.curriculum.lessons
          .slice()
          .sort((left, right) => left.index - right.index)
          .map((lesson) => lesson.stageId),
      ),
    ]
  }

  private activeStage() {
    return this.graph.getStage(this.stageIds()[this.activeStageIndex])
  }

  private stageLessons(): readonly CurriculumLesson[] {
    return this.curriculum.lessons.filter(
      (lesson) => lesson.stageId === this.activeStage().id,
    )
  }

  private stageEndLesson(): CurriculumLesson {
    const lesson = this.stageLessons().at(-1)
    if (!lesson) throw new Error(`Stage ${this.activeStage().id} has no lesson`)
    return lesson
  }

  private stageCompletionNodeId(): string {
    const target = this.graph.getNode(this.stageEndLesson().targetNodeId)
    return target.type === 'learner-decision'
      ? target.preferredTrainingMove.targetNodeId
      : target.id
  }

  private learnerDecisionNodes() {
    return this.graph
      .allNodes()
      .filter((node) => node.type === 'learner-decision')
  }

  private currentNode(): OpeningNode {
    return this.graph.getNode(this.currentNodeId)
  }

  private isInteractive(): boolean {
    return this.isInteractivePhase(this.phase)
  }

  private isInteractivePhase(phase: PersistedTrainingPhase): boolean {
    return phase === 'discovering' || phase === 'checkpoint' || phase === 'adaptive-run'
  }

  private saveProgress(): void {
    this.progressRepository.save({
      schemaVersion: 3,
      phase: this.phase,
      activeStageIndex: this.activeStageIndex,
      completedStageIds: this.stageIds().filter((stageId) =>
        this.completedStageIds.has(stageId),
      ),
      masteryByNodeId: Object.fromEntries(
        [...this.masteryByNodeId.entries()].map(([nodeId, mastery]) => [
          nodeId,
          { ...mastery },
        ]),
      ),
      randomSeed: this.randomSeed,
      directorDecisionIndex: this.directorDecisionIndex,
      runsCompleted: this.runsCompleted,
      deepestRun: this.deepestRun,
      goldBalance: this.goldBalance,
      bestStreak: this.bestStreak,
      hintDrawIndex: this.hintDrawIndex,
      lastRun: this.lastRun ? { ...this.lastRun } : null,
      bossVictories: this.bossVictories,
      session: this.isInteractive()
        ? {
            currentNodeId: this.currentNodeId,
            fen: this.rules.fen(),
            moveHistory: [...this.moveHistory],
            learnerMovesCompleted: this.learnerMovesCompleted,
            currentHintsUsed: this.currentHintsUsed,
            currentHintQuality: this.currentHintQuality,
            seenHintTexts: [...this.seenHintTexts],
            recoveredAfterError: this.recoveredAfterError,
            runState: this.runState ? { ...this.runState } : null,
            improvedNodeIds: [...this.improvedNodeIds],
            branchLabels: [...this.branchLabels],
          }
        : null,
    })
  }

  private restoreProgress(
    progress: PlayerProgressV3 | null,
    seed: number | undefined,
  ): PlayerProgressV3 {
    const defaultProgress: PlayerProgressV3 = {
      schemaVersion: 3,
      phase: 'discovering',
      activeStageIndex: 0,
      completedStageIds: [],
      masteryByNodeId: {},
      randomSeed: seed ?? DEFAULT_SEED,
      directorDecisionIndex: 0,
      runsCompleted: 0,
      deepestRun: 0,
      goldBalance: 15,
      bestStreak: 0,
      hintDrawIndex: 0,
      lastRun: null,
      session: null,
      bossVictories: 0,
    }

    if (!progress) return defaultProgress

    const stageIds = this.stageIds()
    const activeStageIndex = Math.min(
      Math.max(0, progress.activeStageIndex),
      stageIds.length - 1,
    )
    const validNodes = new Set(this.graph.allNodes().map((node) => node.id))
    const masteryByNodeId = Object.fromEntries(
      Object.entries(progress.masteryByNodeId).filter(([nodeId]) =>
        validNodes.has(nodeId),
      ),
    )

    return {
      ...progress,
      activeStageIndex,
      completedStageIds: progress.completedStageIds.filter((stageId) =>
        stageIds.includes(stageId),
      ),
      masteryByNodeId,
    }
  }

  private requireRunState(): RunState {
    if (!this.runState) {
      throw new Error('An adaptive run requires an active run state')
    }

    return this.runState
  }

  private runHasEnded(): boolean {
    return this.phase === 'adaptive-run' && this.runState?.status === 'out-of-lives'
  }

  private finishRun(outcome: RunSummary['outcome']): void {
    const run = this.requireRunState()
    const boss = run.mode === 'boss'
    const bossVictory = boss && outcome === 'completed' && run.mistakes <= 1 && run.hintsPurchased <= 1
    this.lastRun = {
      outcome,
      decisions: run.decisions,
      deepestPoint: this.learnerMovesCompleted,
      mistakes: run.mistakes,
      hintsPurchased: run.hintsPurchased,
      goldEarned: run.goldEarned,
      goldSpent: run.goldSpent,
      bestStreak: run.bestStreak,
      improvedNodeIds: [...this.improvedNodeIds],
      branchLabels: [...this.branchLabels],
      boss,
      bossVictory,
    }
    if (bossVictory) {
      this.bossVictories += 1
      this.goldBalance += 15
    }
    this.bestStreak = Math.max(this.bestStreak, run.bestStreak)
    this.runsCompleted += 1
    this.phase = outcome === 'completed' ? 'run-complete' : 'run-over'
    this.eventMessage = bossVictory
      ? 'Défi maître réussi · +15 pièces et thème Minuit débloqué.'
      :
      outcome === 'completed'
        ? 'Run réussi · nouvelle profondeur consolidée.'
        : 'Dernière vie perdue · les faiblesses sont enregistrées.'
  }

  private bossAvailable(): boolean {
    return this.deepestRun >= this.maximumRunDecisions() || this.bossVictories > 0
  }

  private consequenceView(): GameViewModel['consequence'] {
    const pending = this.pendingConsequence
    if (!pending) return null
    return {
      title: pending.title,
      explanation: pending.explanation,
      learnerMove: pending.learnerMove.san,
      opponentReply: pending.replyRevealed ? pending.opponentReply?.san ?? null : null,
      replyPending: !pending.replyRevealed,
      actionLabel: this.runHasEnded() ? 'Voir le bilan du run' : 'Revenir et corriger',
    }
  }

  private successEventMessage(
    goldReward: number,
    milestone: number | null,
    recovered: boolean,
  ): string | null {
    if (milestone) return `Combo ${milestone} · +${goldReward} pièces`
    if (recovered) return `Récupération réussie · +${goldReward} pièces`
    return goldReward > 0 ? `Bonne décision · +${goldReward} pièce${goldReward > 1 ? 's' : ''}` : null
  }

  private availableHintCount(node: OpeningNode): number {
    return Object.values(node.hints)
      .flat()
      .filter(
        (text) => text.trim().length > 0 && !this.seenHintTexts.includes(text),
      ).length
  }

  private hintUnavailableReason(): string | null {
    const node = this.currentNode()
    if (!this.isInteractive() || node.type !== 'learner-decision') return null
    if (this.goldBalance < HINT_COST) return `Il faut ${HINT_COST} pièces.`
    if (this.runState?.mode === 'boss' && this.runState.hintsPurchased >= 1) {
      return 'Le défi maître autorise un seul indice.'
    }
    if (this.availableHintCount(node) === 0) return 'Tous les indices sont révélés.'
    return null
  }

  private lastRunLives(): number | null {
    if (!this.lastRun) return null
    return this.lastRun.outcome === 'out-of-lives' ? 0 : null
  }

  private maximumRunDecisions(): number {
    const visit = (nodeId: string, path: ReadonlySet<string>): number => {
      if (path.has(nodeId)) throw new Error(`Opening graph cycle detected at ${nodeId}`)
      const node = this.graph.getNode(nodeId)
      if (node.type === 'completion') return 0

      const nextPath = new Set(path)
      nextPath.add(nodeId)
      const moves =
        node.type === 'learner-decision'
          ? node.acceptedLearnerMoves
          : node.opponentMoves
      const remaining = Math.max(
        ...moves.map((move) => visit(move.targetNodeId, nextPath)),
      )
      return (node.type === 'learner-decision' ? 1 : 0) + remaining
    }

    return visit(this.curriculum.startNodeId, new Set())
  }

  private assertCurriculumValid(): void {
    if (this.curriculum.openingId !== this.graph.id) {
      throw new Error('Curriculum and opening graph do not match')
    }

    if (this.curriculum.lessons.length === 0) {
      throw new Error('Curriculum must contain at least one lesson')
    }

    this.graph.getNode(this.curriculum.startNodeId)

    this.curriculum.lessons.forEach((lesson, index) => {
      if (lesson.index !== index) {
        throw new Error(`Lesson ${lesson.id} has an invalid index`)
      }

      this.graph.getStage(lesson.stageId)
      const target = this.graph.getNode(lesson.targetNodeId)

      if (target.type !== 'learner-decision') {
        throw new Error(`Lesson ${lesson.id} does not target a learner decision`)
      }
    })
  }

  private assertPositionMatchesNode(node: OpeningNode): void {
    if (this.rules.positionKey() !== node.positionKey) {
      throw new Error(
        `Position mismatch at ${node.id}: expected ${node.positionKey}, received ${this.rules.positionKey()}`,
      )
    }

    if (this.rules.turn() !== node.sideToMove) {
      throw new Error(`Side-to-move mismatch at ${node.id}`)
    }
  }

  private result(kind: MoveResultKind): MoveResult {
    return { kind, view: this.getViewModel() }
  }
}

function strategyLabel(strategy: SessionStrategy): string {
  switch (strategy) {
    case 'targeted':
      return 'position fragile'
    case 'consolidation':
      return 'consolidation'
    case 'surprise':
      return 'surprise'
  }
}

function moreDirectQuality(
  current: HintQuality | null,
  candidate: HintQuality,
): HintQuality {
  const qualities: readonly HintQuality[] = [
    'weak',
    'medium',
    'strong',
    'exceptional',
  ]
  if (!current) return candidate
  return qualities.indexOf(candidate) > qualities.indexOf(current)
    ? candidate
    : current
}

function branchLabel(nodeId: string, san: string): string {
  if (nodeId === 'italian-after-bc4') return `…${san} en premier`
  if (nodeId === 'italian-after-c3') return `…${san} après c3`
  return `…${san}`
}
