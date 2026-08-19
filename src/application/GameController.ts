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
import type { OpeningGraph } from '../domain/opening/OpeningGraph'
import { toUci } from '../domain/opening/OpeningMove'
import type { OpeningNode } from '../domain/opening/OpeningNode'
import type {
  PersistedTrainingPhase,
  PlayerProgressV1,
  ProgressRepository,
} from './progress/ProgressRepository'
import type {
  BoardMoveView,
  GameViewModel,
  MoveResult,
  MoveResultKind,
} from './GameViewModel'

export class GameController {
  private currentNodeId: string
  private activeLessonId: string
  private phase: PersistedTrainingPhase
  private readonly completedLessonIds: Set<string>
  private feedback: string | null = null
  private moveHistory: string[] = []
  private lastMove: BoardMoveView | null = null
  private learnerMovesCompleted = 0

  constructor(
    private readonly graph: OpeningGraph,
    private readonly rules: ChessRules,
    private readonly curriculum: OpeningCurriculum,
    private readonly progressRepository: ProgressRepository,
  ) {
    this.assertCurriculumValid()

    const restored = this.restoreProgress(progressRepository.load())
    this.activeLessonId = restored.activeLessonId
    this.phase = restored.phase
    this.completedLessonIds = new Set(restored.completedLessonIds)
    this.currentNodeId = curriculum.startNodeId
    this.rules.load(this.currentNode().fen)
    this.assertPositionMatchesNode(this.currentNode())
  }

  submitLearnerMove(move: ChessMoveInput): MoveResult {
    const node = this.currentNode()

    if (!this.isInteractive() || node.type !== 'learner-decision') {
      return this.result('not-awaiting-move')
    }

    const previousFen = this.rules.fen()
    const appliedMove = this.rules.move(move)

    if (!appliedMove) {
      this.feedback = 'Ce déplacement n’est pas légal dans cette position.'
      return this.result('illegal')
    }

    const acceptedMove = node.acceptedLearnerMoves.find(
      (candidate) => toUci(candidate) === appliedMove.uci,
    )

    if (!acceptedMove) {
      this.rules.load(previousFen)
      this.feedback = node.errorExplanation
      return this.result('outside-training-line')
    }

    const answeredNodeId = node.id
    this.feedback = null
    this.recordMove(appliedMove)
    this.learnerMovesCompleted += 1
    this.currentNodeId = acceptedMove.targetNodeId
    this.assertPositionMatchesNode(this.currentNode())

    if (answeredNodeId === this.activeLesson().targetNodeId) {
      return this.finishCurrentPhase()
    }

    this.playScriptedOpponentMoves()
    return this.result('accepted')
  }

  legalDestinations(from: ChessSquare): readonly ChessSquare[] {
    const node = this.currentNode()

    if (!this.isInteractive() || node.type !== 'learner-decision') {
      return []
    }

    return this.rules.legalDestinations(from)
  }

  startReproduction(): GameViewModel {
    if (this.phase !== 'ready-to-reproduce') {
      return this.getViewModel()
    }

    this.phase = 'reproduction'
    this.saveProgress()
    this.resetBoardState()
    return this.getViewModel()
  }

  continueToNextLesson(): GameViewModel {
    if (this.phase !== 'lesson-complete') {
      return this.getViewModel()
    }

    const nextLesson = this.curriculum.lessons[this.activeLesson().index + 1]

    if (nextLesson) {
      this.activeLessonId = nextLesson.id
      this.phase = 'discovery'
    } else {
      this.phase = 'curriculum-complete'
    }

    this.saveProgress()
    this.resetBoardState()
    return this.getViewModel()
  }

  restartSequence(): GameViewModel {
    if (!this.isInteractive()) {
      return this.getViewModel()
    }

    this.resetBoardState()
    return this.getViewModel()
  }

  resetAllProgress(): GameViewModel {
    this.progressRepository.reset()
    this.completedLessonIds.clear()
    this.activeLessonId = this.curriculum.lessons[0].id
    this.phase = 'discovery'
    this.resetBoardState()
    return this.getViewModel()
  }

  getViewModel(): GameViewModel {
    const lesson = this.activeLesson()
    const stage = this.graph.getStage(lesson.stageId)
    const stageLessons = this.curriculum.lessons.filter(
      (candidate) => candidate.stageId === stage.id,
    )
    const completedInStage = stageLessons.filter((candidate) =>
      this.completedLessonIds.has(candidate.id),
    ).length

    return {
      fen: this.rules.fen(),
      nodeId: this.currentNodeId,
      phase: this.phase,
      isBoardInteractive: this.isInteractive(),
      stageIndex: stage.index,
      stageTitle: stage.title,
      stageLessonsCompleted: completedInStage,
      stageLessonsTotal: stageLessons.length,
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      lessonConcept: lesson.concept,
      coachLabel: this.coachLabel(),
      prompt: this.currentPrompt(),
      feedback: this.feedback,
      moveHistory: [...this.moveHistory],
      lastMove: this.lastMove ? { ...this.lastMove } : null,
      learnerMovesCompleted: this.learnerMovesCompleted,
      learnerMovesTotal: lesson.learnerMoveSequence.length,
      completedLessons: this.completedLessonIds.size,
      totalLessons: this.curriculum.lessons.length,
      result: this.resultView(),
    }
  }

  private finishCurrentPhase(): MoveResult {
    if (this.phase === 'discovery') {
      this.phase = 'ready-to-reproduce'
      this.saveProgress()
      return this.result('lesson-discovered')
    }

    this.completedLessonIds.add(this.activeLessonId)
    this.phase = 'lesson-complete'
    this.saveProgress()
    return this.result('lesson-complete')
  }

  private playScriptedOpponentMoves(): void {
    let node = this.currentNode()

    while (node.type === 'opponent-branch') {
      const reply = node.opponentMoves[0]

      if (!reply) {
        throw new Error(`Opponent node ${node.id} has no scripted reply`)
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

    if (node.type === 'completion') {
      throw new Error(
        `Curriculum reached completion before target ${this.activeLesson().targetNodeId}`,
      )
    }
  }

  private recordMove(move: AppliedChessMove): void {
    this.moveHistory.push(move.san)
    this.lastMove = { from: move.from, to: move.to, san: move.san }
  }

  private resetBoardState(): void {
    this.currentNodeId = this.curriculum.startNodeId
    this.feedback = null
    this.moveHistory = []
    this.lastMove = null
    this.learnerMovesCompleted = 0
    this.rules.load(this.currentNode().fen)
  }

  private currentPrompt(): string {
    const lesson = this.activeLesson()

    if (this.phase === 'ready-to-reproduce') {
      return lesson.reproductionPrompt
    }

    if (this.phase === 'lesson-complete') {
      return lesson.successMessage
    }

    if (this.phase === 'curriculum-complete') {
      return 'Tu as appris et reproduit toute la première structure calme de l’Italienne.'
    }

    const node = this.currentNode()

    if (node.type !== 'learner-decision') {
      return node.prompt
    }

    return this.phase === 'discovery' && node.id === lesson.targetNodeId
      ? node.prompt
      : node.recallPrompt
  }

  private coachLabel(): string {
    switch (this.phase) {
      case 'discovery':
        return this.currentNodeId === this.activeLesson().targetNodeId
          ? 'Nouveau concept'
          : 'À toi de retrouver'
      case 'ready-to-reproduce':
        return 'À mémoriser'
      case 'reproduction':
        return 'Sans aide'
      case 'lesson-complete':
        return 'Concept validé'
      case 'curriculum-complete':
        return 'Étapes terminées'
    }
  }

  private resultView(): GameViewModel['result'] {
    if (
      this.phase !== 'lesson-complete' &&
      this.phase !== 'curriculum-complete'
    ) {
      return null
    }

    const lesson = this.activeLesson()

    return {
      title:
        this.phase === 'curriculum-complete'
          ? 'Première structure maîtrisée'
          : lesson.title,
      message:
        this.phase === 'curriculum-complete'
          ? 'Les six décisions sont acquises. La prochaine étape sera de les consolider et de varier les réponses noires.'
          : lesson.successMessage,
      concept: lesson.concept,
      learnerMoveSequence: [...lesson.learnerMoveSequence],
      hasNextLesson:
        this.phase === 'lesson-complete' &&
        lesson.index < this.curriculum.lessons.length - 1,
    }
  }

  private isInteractive(): boolean {
    return this.phase === 'discovery' || this.phase === 'reproduction'
  }

  private activeLesson(): CurriculumLesson {
    const lesson = this.curriculum.lessons.find(
      (candidate) => candidate.id === this.activeLessonId,
    )

    if (!lesson) {
      throw new Error(`Unknown active lesson: ${this.activeLessonId}`)
    }

    return lesson
  }

  private currentNode(): OpeningNode {
    return this.graph.getNode(this.currentNodeId)
  }

  private saveProgress(): void {
    this.progressRepository.save({
      schemaVersion: 1,
      activeLessonId: this.activeLessonId,
      phase: this.phase,
      completedLessonIds: this.curriculum.lessons
        .map((lesson) => lesson.id)
        .filter((lessonId) => this.completedLessonIds.has(lessonId)),
    })
  }

  private restoreProgress(progress: PlayerProgressV1 | null): PlayerProgressV1 {
    const firstLesson = this.curriculum.lessons[0]

    if (!progress) {
      return {
        schemaVersion: 1,
        activeLessonId: firstLesson.id,
        phase: 'discovery',
        completedLessonIds: [],
      }
    }

    const lessonIds = new Set(this.curriculum.lessons.map((lesson) => lesson.id))
    const completedLessonIds = progress.completedLessonIds.filter((lessonId) =>
      lessonIds.has(lessonId),
    )

    if (!lessonIds.has(progress.activeLessonId)) {
      return {
        schemaVersion: 1,
        activeLessonId: firstLesson.id,
        phase: 'discovery',
        completedLessonIds,
      }
    }

    if (
      progress.phase === 'lesson-complete' &&
      !completedLessonIds.includes(progress.activeLessonId)
    ) {
      return {
        schemaVersion: 1,
        activeLessonId: progress.activeLessonId,
        phase: 'discovery',
        completedLessonIds,
      }
    }

    return { ...progress, completedLessonIds }
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
