import { Chess } from 'chess.js'

import {
  type AppliedChessMove,
  type ChessMoveInput,
  type ChessRules,
  type PromotionPiece,
  normalizePositionKey,
} from './ChessRules'

const promotionPieces = new Set<PromotionPiece>(['q', 'r', 'b', 'n'])

function asPromotionPiece(piece: string | undefined): PromotionPiece | undefined {
  return piece && promotionPieces.has(piece as PromotionPiece)
    ? (piece as PromotionPiece)
    : undefined
}

export class ChessJsAdapter implements ChessRules {
  private readonly game: Chess

  constructor(fen?: string) {
    this.game = new Chess(fen)
  }

  fen(): string {
    return this.game.fen()
  }

  positionKey(): string {
    return normalizePositionKey(this.game.fen())
  }

  turn(): 'white' | 'black' {
    return this.game.turn() === 'w' ? 'white' : 'black'
  }

  move(move: ChessMoveInput): AppliedChessMove | null {
    try {
      const applied = this.game.move(move)

      return {
        from: applied.from,
        to: applied.to,
        promotion: asPromotionPiece(applied.promotion),
        san: applied.san,
        uci: `${applied.from}${applied.to}${applied.promotion ?? ''}`,
      }
    } catch {
      return null
    }
  }

  load(fen: string): void {
    this.game.load(fen)
  }

  reset(): void {
    this.game.reset()
  }
}
