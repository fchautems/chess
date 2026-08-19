import { normalizePositionKey } from '../../../domain/chess/ChessRules'
import type { LessonStage } from '../../../domain/curriculum/LessonStage'
import { OpeningGraph } from '../../../domain/opening/OpeningGraph'
import type {
  HintPool,
  OpeningNode,
} from '../../../domain/opening/OpeningNode'

export const ITALIAN_STAGE_0_ID = 'italian-stage-0'
export const ITALIAN_STAGE_0_ENTRY_NODE_ID = 'italian-start'

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
} as const

const stage0Nodes: readonly OpeningNode[] = [
  {
    id: 'italian-start',
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
    errorExplanation:
      'Ce coup peut être jouable, mais ici nous construisons l’Italienne en commençant par le pion du roi.',
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
    errorExplanation: '',
    hints: hints('', '', '', ''),
    tags: ['centre'],
    prerequisites: ['italian-start'],
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
    errorExplanation:
      'Cherche un développement qui met immédiatement la pression sur le pion noir en e5.',
    hints: hints(
      'Développe une pièce mineure.',
      'Un cavalier peut attaquer e5.',
      'Le cavalier g1 a une case naturelle.',
      'Déplace le cavalier de g1 vers f3.',
    ),
    tags: ['development', 'tempo'],
    prerequisites: ['italian-start'],
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
    errorExplanation: '',
    hints: hints('', '', '', ''),
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
    prompt: 'Développe maintenant le fou vers la zone sensible autour de f7.',
    errorExplanation:
      'Pour entrer dans l’Italienne, le fou du roi se développe activement vers c4.',
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
    curriculumStageId: ITALIAN_STAGE_0_ID,
    type: 'completion',
    acceptedLearnerMoves: [],
    preferredTrainingMove: null,
    opponentMoves: [],
    theoreticalImportance: 1,
    prompt: 'Voilà l’identité de l’Italienne : e4, Nf3 et Bc4.',
    errorExplanation: '',
    hints: hints('', '', '', ''),
    tags: ['centre', 'development'],
    prerequisites: ['italian-after-nc6'],
  },
]

export const italianStage0: LessonStage = {
  id: ITALIAN_STAGE_0_ID,
  index: 0,
  title: 'Les trois fondations',
  description: 'Centre, cavalier, puis fou actif.',
  entryNodeId: ITALIAN_STAGE_0_ENTRY_NODE_ID,
  criticalNodeIds: [
    'italian-start',
    'italian-after-e4-e5',
    'italian-after-nc6',
  ],
}

export const italianOpeningGraph = new OpeningGraph(
  'italian-game',
  'Partie italienne',
  stage0Nodes,
  [italianStage0],
)
