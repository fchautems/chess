import type { ChessMoveInput } from '../chess/ChessRules'

export interface MistakeConsequence {
  title: string
  explanation: string
  opponentReply: (ChessMoveInput & { san: string }) | null
}

const consequences: Readonly<Record<string, MistakeConsequence>> = {
  'italian-after-nf6:f3g5': {
    title: 'Le centre riposte',
    explanation:
      'Ng5 attaque trop tôt. Les Noirs jouent …d5 avec tempo : ils frappent ton fou et ouvrent le centre avant que ton roi soit à l’abri.',
    opponentReply: { from: 'd7', to: 'd5', san: 'd5' },
  },
  'italian-after-nf6-early:f3e5': {
    title: 'Le pion était empoisonné',
    explanation:
      'Après Nxe5?, le cavalier c6 reprend simplement en e5. Tu échanges ton cavalier actif sans gagner le pion.',
    opponentReply: { from: 'c6', to: 'e5', san: 'Nxe5' },
  },
  'italian-after-a6:h2h3': {
    title: 'Le fou perd un tempo',
    explanation:
      'h3 laisse les Noirs jouer …b5 : le pion attaque immédiatement le fou, qui devra encore bouger.',
    opponentReply: { from: 'b7', to: 'b5', san: 'b5' },
  },
  'italian-after-castle-a6-convergence:h2h3': {
    title: 'Les Noirs gagnent de l’espace',
    explanation:
      'h3 est jouable, mais trop lent ici. …b5 chasse le fou actif et gagne un tempo sur ton développement.',
    opponentReply: { from: 'b7', to: 'b5', san: 'b5' },
  },
}

export function findMistakeConsequence(
  nodeId: string,
  learnerMoveUci: string,
): MistakeConsequence | null {
  return consequences[`${nodeId}:${learnerMoveUci}`] ?? null
}
