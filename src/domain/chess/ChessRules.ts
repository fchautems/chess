export type ChessFile = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h'
export type ChessRank = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8'
export type ChessSquare = `${ChessFile}${ChessRank}`
export type PromotionPiece = 'q' | 'r' | 'b' | 'n'

export interface ChessMoveInput {
  from: ChessSquare
  to: ChessSquare
  promotion?: PromotionPiece
}

export interface AppliedChessMove extends ChessMoveInput {
  san: string
  uci: string
}

export interface ChessRules {
  fen(): string
  positionKey(): string
  turn(): 'white' | 'black'
  legalDestinations(from: ChessSquare): readonly ChessSquare[]
  move(move: ChessMoveInput): AppliedChessMove | null
  load(fen: string): void
  reset(): void
}

export function normalizePositionKey(fen: string): string {
  const fields = fen.trim().split(/\s+/)

  if (fields.length !== 6) {
    throw new Error(`Invalid FEN: expected 6 fields, received ${fields.length}`)
  }

  return fields.slice(0, 4).join(' ')
}
