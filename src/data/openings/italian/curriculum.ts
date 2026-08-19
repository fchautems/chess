import { normalizePositionKey } from '../../../domain/chess/ChessRules'
import type {
  CurriculumLesson,
  OpeningCurriculum,
} from '../../../domain/curriculum/Curriculum'
import type { LessonStage } from '../../../domain/curriculum/LessonStage'
import { OpeningGraph } from '../../../domain/opening/OpeningGraph'
import type {
  HintPool,
  OpeningNode,
} from '../../../domain/opening/OpeningNode'

export const ITALIAN_STAGE_0_ID = 'italian-stage-0'
export const ITALIAN_STAGE_1_ID = 'italian-stage-1'
export const ITALIAN_START_NODE_ID = 'italian-start'

const hints = (
  weak: string,
  medium: string,
  strong: string,
  exceptional: string,
): HintPool => ({
  weak: [weak],
  medium: [medium],
  strong: [strong],
  exceptional: [exceptional],
})

const noHints = hints('', '', '', '')

const fens = {
  start: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  afterE4:
    'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
  afterE4E5:
    'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
  afterNf3:
    'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
  afterNc6:
    'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
  afterBc4:
    'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
  afterBc5:
    'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
  afterD3:
    'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R b KQkq - 0 4',
  afterNf6:
    'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 1 5',
  afterCastle:
    'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQ1RK1 b kq - 2 5',
  afterD6:
    'r1bqk2r/ppp2ppp/2np1n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQ1RK1 w kq - 0 6',
  afterC3:
    'r1bqk2r/ppp2ppp/2np1n2/2b1p3/2B1P3/2PP1N2/PP3PPP/RNBQ1RK1 b kq - 0 6',
} as const

const nodes: readonly OpeningNode[] = [
  {
    id: ITALIAN_START_NODE_ID,
    fen: fens.start,
    positionKey: normalizePositionKey(fens.start),
    sideToMove: 'white',
    curriculumStageId: ITALIAN_STAGE_0_ID,
    type: 'learner-decision',
    acceptedLearnerMoves: [
      { from: 'e2', to: 'e4', san: 'e4', targetNodeId: 'italian-after-e4' },
    ],
    preferredTrainingMove: {
      from: 'e2',
      to: 'e4',
      san: 'e4',
      targetNodeId: 'italian-after-e4',
    },
    opponentMoves: [],
    theoreticalImportance: 1,
    prompt: 'Prends de l’espace au centre avec le pion du roi.',
    recallPrompt: 'Quel premier coup pose notre présence au centre ?',
    errorExplanation:
      'Ce coup peut être jouable, mais l’Italienne commence par le pion du roi.',
    hints: hints(
      'Pense au centre.',
      'Un pion central peut avancer de deux cases.',
      'Choisis le pion placé devant ton roi.',
      'Déplace le pion de e2 vers e4.',
    ),
    tags: ['centre'],
    prerequisites: [],
  },
  {
    id: 'italian-after-e4',
    fen: fens.afterE4,
    positionKey: normalizePositionKey(fens.afterE4),
    sideToMove: 'black',
    curriculumStageId: ITALIAN_STAGE_0_ID,
    type: 'opponent-branch',
    acceptedLearnerMoves: [],
    preferredTrainingMove: null,
    opponentMoves: [
      {
        from: 'e7',
        to: 'e5',
        san: 'e5',
        targetNodeId: 'italian-after-e4-e5',
      },
    ],
    theoreticalImportance: 1,
    prompt: 'Les Noirs répondent au centre.',
    recallPrompt: '',
    errorExplanation: '',
    hints: noHints,
    tags: ['centre'],
    prerequisites: [ITALIAN_START_NODE_ID],
  },
  {
    id: 'italian-after-e4-e5',
    fen: fens.afterE4E5,
    positionKey: normalizePositionKey(fens.afterE4E5),
    sideToMove: 'white',
    curriculumStageId: ITALIAN_STAGE_0_ID,
    type: 'learner-decision',
    acceptedLearnerMoves: [
      {
        from: 'g1',
        to: 'f3',
        san: 'Nf3',
        targetNodeId: 'italian-after-nf3',
      },
    ],
    preferredTrainingMove: {
      from: 'g1',
      to: 'f3',
      san: 'Nf3',
      targetNodeId: 'italian-after-nf3',
    },
    opponentMoves: [],
    theoreticalImportance: 1,
    prompt: 'Développe un cavalier tout en attaquant le pion e5.',
    recallPrompt: 'Quel développement met immédiatement e5 sous pression ?',
    errorExplanation:
      'Cherche un développement qui attaque immédiatement le pion noir en e5.',
    hints: hints(
      'Développe une pièce mineure.',
      'Un cavalier peut attaquer e5.',
      'Le cavalier g1 a une case naturelle.',
      'Déplace le cavalier de g1 vers f3.',
    ),
    tags: ['development', 'tempo'],
    prerequisites: [ITALIAN_START_NODE_ID],
  },
  {
    id: 'italian-after-nf3',
    fen: fens.afterNf3,
    positionKey: normalizePositionKey(fens.afterNf3),
    sideToMove: 'black',
    curriculumStageId: ITALIAN_STAGE_0_ID,
    type: 'opponent-branch',
    acceptedLearnerMoves: [],
    preferredTrainingMove: null,
    opponentMoves: [
      {
        from: 'b8',
        to: 'c6',
        san: 'Nc6',
        targetNodeId: 'italian-after-nc6',
      },
    ],
    theoreticalImportance: 1,
    prompt: 'Les Noirs défendent e5 en développant leur cavalier.',
    recallPrompt: '',
    errorExplanation: '',
    hints: noHints,
    tags: ['development'],
    prerequisites: ['italian-after-e4-e5'],
  },
  {
    id: 'italian-after-nc6',
    fen: fens.afterNc6,
    positionKey: normalizePositionKey(fens.afterNc6),
    sideToMove: 'white',
    curriculumStageId: ITALIAN_STAGE_0_ID,
    type: 'learner-decision',
    acceptedLearnerMoves: [
      {
        from: 'f1',
        to: 'c4',
        san: 'Bc4',
        targetNodeId: 'italian-after-bc4',
      },
    ],
    preferredTrainingMove: {
      from: 'f1',
      to: 'c4',
      san: 'Bc4',
      targetNodeId: 'italian-after-bc4',
    },
    opponentMoves: [],
    theoreticalImportance: 1,
    prompt: 'Développe le fou vers la zone sensible autour de f7.',
    recallPrompt: 'Où le fou du roi devient-il immédiatement actif ?',
    errorExplanation:
      'Pour entrer dans l’Italienne, le fou du roi se développe vers c4.',
    hints: hints(
      'Une autre pièce mineure peut sortir.',
      'Regarde le fou libéré par le pion e.',
      'Le fou f1 peut viser la diagonale de f7.',
      'Déplace le fou de f1 vers c4.',
    ),
    tags: ['development'],
    prerequisites: ['italian-after-e4-e5'],
  },
  {
    id: 'italian-after-bc4',
    fen: fens.afterBc4,
    positionKey: normalizePositionKey(fens.afterBc4),
    sideToMove: 'black',
    curriculumStageId: ITALIAN_STAGE_1_ID,
    type: 'opponent-branch',
    acceptedLearnerMoves: [],
    preferredTrainingMove: null,
    opponentMoves: [
      {
        from: 'f8',
        to: 'c5',
        san: 'Bc5',
        targetNodeId: 'italian-after-bc5',
      },
    ],
    theoreticalImportance: 0.95,
    prompt: 'Les Noirs développent leur fou sur la même diagonale active.',
    recallPrompt: '',
    errorExplanation: '',
    hints: noHints,
    tags: ['development'],
    prerequisites: ['italian-after-nc6'],
  },
  {
    id: 'italian-after-bc5',
    fen: fens.afterBc5,
    positionKey: normalizePositionKey(fens.afterBc5),
    sideToMove: 'white',
    curriculumStageId: ITALIAN_STAGE_1_ID,
    type: 'learner-decision',
    acceptedLearnerMoves: [
      {
        from: 'd2',
        to: 'd3',
        san: 'd3',
        targetNodeId: 'italian-after-d3',
      },
    ],
    preferredTrainingMove: {
      from: 'd2',
      to: 'd3',
      san: 'd3',
      targetNodeId: 'italian-after-d3',
    },
    opponentMoves: [],
    theoreticalImportance: 0.95,
    prompt: 'Renforce e4 avec un pion tout en ouvrant ton fou de cases noires.',
    recallPrompt: 'Quel petit coup de pion consolide maintenant ton centre ?',
    errorExplanation:
      'Dans cette structure calme, d3 soutient e4 et prépare le développement.',
    hints: hints(
      'Consolide ton centre.',
      'Un pion peut soutenir e4.',
      'Le pion d peut avancer sobrement.',
      'Déplace le pion de d2 vers d3.',
    ),
    tags: ['centre', 'development'],
    prerequisites: ['italian-after-nc6'],
  },
  {
    id: 'italian-after-d3',
    fen: fens.afterD3,
    positionKey: normalizePositionKey(fens.afterD3),
    sideToMove: 'black',
    curriculumStageId: ITALIAN_STAGE_1_ID,
    type: 'opponent-branch',
    acceptedLearnerMoves: [],
    preferredTrainingMove: null,
    opponentMoves: [
      {
        from: 'g8',
        to: 'f6',
        san: 'Nf6',
        targetNodeId: 'italian-after-nf6',
      },
    ],
    theoreticalImportance: 0.95,
    prompt: 'Les Noirs développent leur dernier cavalier.',
    recallPrompt: '',
    errorExplanation: '',
    hints: noHints,
    tags: ['development'],
    prerequisites: ['italian-after-bc5'],
  },
  {
    id: 'italian-after-nf6',
    fen: fens.afterNf6,
    positionKey: normalizePositionKey(fens.afterNf6),
    sideToMove: 'white',
    curriculumStageId: ITALIAN_STAGE_1_ID,
    type: 'learner-decision',
    acceptedLearnerMoves: [
      {
        from: 'e1',
        to: 'g1',
        san: 'O-O',
        targetNodeId: 'italian-after-castle',
      },
    ],
    preferredTrainingMove: {
      from: 'e1',
      to: 'g1',
      san: 'O-O',
      targetNodeId: 'italian-after-castle',
    },
    opponentMoves: [],
    theoreticalImportance: 1,
    prompt: 'Ton aile roi est développée : mets maintenant le roi à l’abri.',
    recallPrompt: 'Quelle priorité naturelle reste-t-il pour ton roi ?',
    errorExplanation:
      'Le petit roque sécurise le roi et connecte bientôt les tours.',
    hints: hints(
      'Pense à la sécurité du roi.',
      'Un coup spécial déplace aussi une tour.',
      'Le petit roque est désormais possible.',
      'Déplace le roi de e1 vers g1 pour roquer.',
    ),
    tags: ['king-safety'],
    prerequisites: ['italian-after-bc5'],
  },
  {
    id: 'italian-after-castle',
    fen: fens.afterCastle,
    positionKey: normalizePositionKey(fens.afterCastle),
    sideToMove: 'black',
    curriculumStageId: ITALIAN_STAGE_1_ID,
    type: 'opponent-branch',
    acceptedLearnerMoves: [],
    preferredTrainingMove: null,
    opponentMoves: [
      {
        from: 'd7',
        to: 'd6',
        san: 'd6',
        targetNodeId: 'italian-after-d6',
      },
    ],
    theoreticalImportance: 0.9,
    prompt: 'Les Noirs consolident eux aussi leur centre.',
    recallPrompt: '',
    errorExplanation: '',
    hints: noHints,
    tags: ['centre'],
    prerequisites: ['italian-after-nf6'],
  },
  {
    id: 'italian-after-d6',
    fen: fens.afterD6,
    positionKey: normalizePositionKey(fens.afterD6),
    sideToMove: 'white',
    curriculumStageId: ITALIAN_STAGE_1_ID,
    type: 'learner-decision',
    acceptedLearnerMoves: [
      {
        from: 'c2',
        to: 'c3',
        san: 'c3',
        targetNodeId: 'italian-after-c3',
      },
    ],
    preferredTrainingMove: {
      from: 'c2',
      to: 'c3',
      san: 'c3',
      targetNodeId: 'italian-after-c3',
    },
    opponentMoves: [],
    theoreticalImportance: 0.9,
    prompt: 'Prépare une future poussée d4 avec le pion c.',
    recallPrompt: 'Quel coup prépare l’expansion centrale d4 ?',
    errorExplanation:
      'c3 prépare d4 et donne au fou une case de repli dans cette structure.',
    hints: hints(
      'Prépare une expansion centrale.',
      'Un pion peut soutenir la poussée d4.',
      'Regarde le pion de la colonne c.',
      'Déplace le pion de c2 vers c3.',
    ),
    tags: ['centre'],
    prerequisites: ['italian-after-nf6'],
  },
  {
    id: 'italian-after-c3',
    fen: fens.afterC3,
    positionKey: normalizePositionKey(fens.afterC3),
    sideToMove: 'black',
    curriculumStageId: ITALIAN_STAGE_1_ID,
    type: 'completion',
    acceptedLearnerMoves: [],
    preferredTrainingMove: null,
    opponentMoves: [],
    theoreticalImportance: 0.9,
    prompt: 'La structure calme de base est en place.',
    recallPrompt: '',
    errorExplanation: '',
    hints: noHints,
    tags: ['centre', 'development', 'king-safety'],
    prerequisites: ['italian-after-d6'],
  },
]

export const italianStage0: LessonStage = {
  id: ITALIAN_STAGE_0_ID,
  index: 0,
  title: 'Les trois fondations',
  description: 'Centre, cavalier, puis fou actif.',
  entryNodeId: ITALIAN_START_NODE_ID,
  criticalNodeIds: [
    ITALIAN_START_NODE_ID,
    'italian-after-e4-e5',
    'italian-after-nc6',
  ],
}

export const italianStage1: LessonStage = {
  id: ITALIAN_STAGE_1_ID,
  index: 1,
  title: 'La structure calme',
  description: 'Centre solide, roi en sécurité, préparation de d4.',
  entryNodeId: 'italian-after-bc4',
  criticalNodeIds: [
    'italian-after-bc5',
    'italian-after-nf6',
    'italian-after-d6',
  ],
}

export const italianOpeningGraph = new OpeningGraph(
  'italian-game',
  'Partie italienne',
  nodes,
  [italianStage0, italianStage1],
)

const lessons: readonly CurriculumLesson[] = [
  {
    id: 'lesson-e4',
    index: 0,
    stageId: ITALIAN_STAGE_0_ID,
    title: 'Prendre le centre',
    concept: 'Occuper le centre et libérer le fou du roi.',
    targetNodeId: ITALIAN_START_NODE_ID,
    learnerMoveSequence: ['e4'],
    reproductionPrompt:
      'Repars de la position initiale et retrouve ce premier coup sans indication directe.',
    successMessage: 'Tu sais maintenant poser la première pierre de l’Italienne.',
  },
  {
    id: 'lesson-nf3',
    index: 1,
    stageId: ITALIAN_STAGE_0_ID,
    title: 'Développer avec une menace',
    concept: 'Sortir une pièce tout en attaquant e5.',
    targetNodeId: 'italian-after-e4-e5',
    learnerMoveSequence: ['e4', 'Nf3'],
    reproductionPrompt:
      'Rejoue maintenant les deux décisions depuis le début, sans réponse donnée.',
    successMessage: 'Le centre et le cavalier forment déjà une intention cohérente.',
  },
  {
    id: 'lesson-bc4',
    index: 2,
    stageId: ITALIAN_STAGE_0_ID,
    title: 'Donner son identité à l’ouverture',
    concept: 'Développer le fou sur la diagonale sensible de f7.',
    targetNodeId: 'italian-after-nc6',
    learnerMoveSequence: ['e4', 'Nf3', 'Bc4'],
    reproductionPrompt:
      'Retrouve les trois fondations depuis la position initiale : aucune pièce ne sera jouée à ta place.',
    successMessage: 'Tu viens de reconstruire seul l’identité de la Partie italienne.',
  },
  {
    id: 'lesson-d3',
    index: 3,
    stageId: ITALIAN_STAGE_1_ID,
    title: 'Stabiliser le centre',
    concept: 'Soutenir e4 et préparer un développement harmonieux.',
    targetNodeId: 'italian-after-bc5',
    learnerMoveSequence: ['e4', 'Nf3', 'Bc4', 'd3'],
    reproductionPrompt:
      'Repars du début et reconstruis toute la ligne jusqu’au soutien du centre.',
    successMessage: 'Ton centre est maintenant stable sans bloquer tes pièces.',
  },
  {
    id: 'lesson-castle',
    index: 4,
    stageId: ITALIAN_STAGE_1_ID,
    title: 'Mettre le roi à l’abri',
    concept: 'Roquer dès que le développement le permet.',
    targetNodeId: 'italian-after-nf6',
    learnerMoveSequence: ['e4', 'Nf3', 'Bc4', 'd3', 'O-O'],
    reproductionPrompt:
      'Reconstruis la position depuis le début, puis sécurise ton roi au bon moment.',
    successMessage: 'Ton roi est en sécurité et ta tour entre dans la partie.',
  },
  {
    id: 'lesson-c3',
    index: 5,
    stageId: ITALIAN_STAGE_1_ID,
    title: 'Préparer le centre',
    concept: 'Préparer d4 sans précipiter l’ouverture du centre.',
    targetNodeId: 'italian-after-d6',
    learnerMoveSequence: ['e4', 'Nf3', 'Bc4', 'd3', 'O-O', 'c3'],
    reproductionPrompt:
      'Une dernière fois depuis le départ : construis toute la structure calme jusqu’à c3.',
    successMessage: 'Tu maîtrises désormais la première structure calme de l’Italienne.',
  },
]

export const italianCurriculum: OpeningCurriculum = {
  id: 'italian-curriculum-v1',
  openingId: italianOpeningGraph.id,
  startNodeId: ITALIAN_START_NODE_ID,
  lessons,
}
