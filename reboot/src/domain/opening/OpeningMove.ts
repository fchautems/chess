import type { ChessMoveInput } from '../chess/ChessRules'

export interface OpeningMove extends ChessMoveInput {
  san: string
  targetNodeId: string
}

export function toUci(move: ChessMoveInput): string {
  return `${move.from}${move.to}${move.promotion ?? ''}`
}
