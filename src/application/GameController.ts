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
import type { OpeningNode } from '../domain/opening/OpeningNode'
import {
  SessionDirector,
  type SessionStrategy,
} from '../domain/session/SessionDirector'
import type {
  PersistedTrainingPhase,
  PlayerProgressV2,
  ProgressRepository,
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
  private feedback: string | null = null
  private hint: string | null = null
  private moveHistory: string[] = []
  private lastMove: BoardMoveView | null = null
  private learnerMovesCompleted = 0
  private currentHintsUsed = 0
  private recoveredAfterError = false
  private lastBranchStrategy: SessionStrategy | null = null
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
    this.currentNodeId = curriculum.startNodeId

    if (!this.restoreSession(restored)) {
      this.prepareBoardForPhase()
    }
  }

  submitLearnerMove(move: ChessMoveInput): MoveResult {
    const node = this.currentNode()

    if (!this.isInteractive() || node.type !== 'learner-decision') {
      return this.result('not-awaiting-move')
    }

    const previousFen = this.rules.fen()
    const appliedMove = this.rules.move(move)

    if (!appliedMove) {
      this.feedback = node.errorExplanation
      this.recordFailureOnce(node.id)
      this.saveProgress()
      return this.result('illegal')
    }

    const acceptedMove = node.acceptedLearnerMoves.find(
      (candidate) => toUci(candidate) === appliedMove.uci,
    )

    if (!acceptedMove) {
      this.rules.load(previousFen)
      this.feedback = node.errorExplanation
      this.recordFailureOnce(node.id)
      this.saveProgress()
      return this.result('outside-training-line')
    }

    const answeredNodeId = node.id
    this.masteryByNodeId.set(
      answeredNodeId,
      recordMasterySuccess(
        this.masteryByNodeId.get(answeredNodeId),
        answeredNodeId,
        this.now(),
        this.currentHintsUsed,
        this.recoveredAfterError,
      ),
    )
    this.feedback = null
    this.hint = null
    this.currentHintsUsed = 0
    this.recoveredAfterError = false
    this.recordMove(appliedMove)
    this.learnerMovesCompleted += 1
    if (this.phase === 'adaptive-run') {
      this.deepestRun = Math.max(this.deepestRun, this.learnerMovesCompleted)
    }
    this.currentNodeId = acceptedMove.targetNodeId
    this.assertPositionMatchesNode(this.currentNode())

    if (this.phase === 'adaptive-run' && this.currentNode().type === 'completion') {
      this.phase = 'run-complete'
      this.runsCompleted += 1
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

    const qualities = ['weak', 'medium', 'strong', 'exceptional'] as const
    const quality = qualities[Math.min(this.currentHintsUsed, qualities.length - 1)]
    this.hint = node.hints[quality].find((text) => text.trim().length > 0) ?? node.prompt
    this.currentHintsUsed += 1
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
    if (this.phase !== 'adaptive-ready' && this.phase !== 'run-complete') {
      return this.getViewModel()
    }

    this.phase = 'adaptive-run'
    this.resetBoardTo(this.curriculum.startNodeId)
    this.saveProgress()
    return this.getViewModel()
  }

  restartCurrentBlock(): GameViewModel {
    if (!this.isInteractive()) return this.getViewModel()

    if (this.phase === 'adaptive-run') {
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
    this.lastBranchStrategy = null
    this.prepareStageStart()
    return this.getViewModel()
  }

  getViewModel(): GameViewModel {
    const stage = this.activeStage()
    const stageLessons = this.stageLessons()
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
      isBoardInteractive: this.isInteractive(),
      stageIndex: stage.index,
      stageTitle: stage.title,
      stageMovesCompleted:
        this.phase === 'checkpoint-ready' || this.phase === 'stage-complete'
          ? stageLessons.length
          : Math.min(this.learnerMovesCompleted, stageLessons.length),
      stageMovesTotal: stageLessons.length,
      coachLabel: this.coachLabel(),
      prompt: this.currentPrompt(),
      feedback: this.feedback,
      hint: this.hint,
      canRequestHint:
        this.isInteractive() && this.currentNode().type === 'learner-decision',
      moveHistory: [...this.moveHistory],
      lastMove: this.lastMove ? { ...this.lastMove } : null,
      learnerMovesCompleted: this.learnerMovesCompleted,
      learnerMovesTotal:
        this.phase === 'adaptive-run' || this.phase === 'run-complete'
          ? this.curriculum.lessons.length
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
      lastBranchStrategy: this.lastBranchStrategy,
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
    this.moveHistory = []
    this.lastMove = null
    this.learnerMovesCompleted = 0
    this.currentHintsUsed = 0
    this.recoveredAfterError = false
    this.rules.load(this.currentNode().fen)
    this.assertPositionMatchesNode(this.currentNode())
  }

  private restoreSession(progress: PlayerProgressV2): boolean {
    if (!this.isInteractivePhase(progress.phase) || !progress.session) return false

    try {
      this.currentNodeId = progress.session.currentNodeId
      this.rules.load(progress.session.fen)
      this.assertPositionMatchesNode(this.currentNode())
      this.moveHistory = [...progress.session.moveHistory]
      this.learnerMovesCompleted = progress.session.learnerMovesCompleted
      this.currentHintsUsed = progress.session.currentHintsUsed
      this.recoveredAfterError = progress.session.recoveredAfterError
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

    if (this.phase === 'run-complete') {
      return {
        title: 'Structure atteinte',
        message:
          'Run réussi. Chaque décision a renforcé sa position propre, même si l’ordre des Noirs a varié.',
        concepts: [`Maîtrise globale ${this.getMasteryAverage()} %`],
        learnerMoveSequence: [],
        primaryLabel: 'Rejouer une autre variante',
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

  private recordFailureOnce(nodeId: string): void {
    if (this.recoveredAfterError) return

    this.masteryByNodeId.set(
      nodeId,
      recordMasteryFailure(this.masteryByNodeId.get(nodeId), nodeId, this.now()),
    )
    this.recoveredAfterError = true
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
      : this.curriculum.startNodeId
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
      schemaVersion: 2,
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
      session: this.isInteractive()
        ? {
            currentNodeId: this.currentNodeId,
            fen: this.rules.fen(),
            moveHistory: [...this.moveHistory],
            learnerMovesCompleted: this.learnerMovesCompleted,
            currentHintsUsed: this.currentHintsUsed,
            recoveredAfterError: this.recoveredAfterError,
          }
        : null,
    })
  }

  private restoreProgress(
    progress: PlayerProgressV2 | null,
    seed: number | undefined,
  ): PlayerProgressV2 {
    const defaultProgress: PlayerProgressV2 = {
      schemaVersion: 2,
      phase: 'discovering',
      activeStageIndex: 0,
      completedStageIds: [],
      masteryByNodeId: {},
      randomSeed: seed ?? DEFAULT_SEED,
      directorDecisionIndex: 0,
      runsCompleted: 0,
      deepestRun: 0,
      session: null,
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
