import { Chessboard, type ChessboardOptions } from 'react-chessboard'

import type { ChessSquare } from '../../domain/chess/ChessRules'

interface BoardViewProps {
  fen: string
  disabled?: boolean
  onMove: (from: ChessSquare, to: ChessSquare) => boolean
}

const squarePattern = /^[a-h][1-8]$/

function isChessSquare(value: string | null): value is ChessSquare {
  return value !== null && squarePattern.test(value)
}

export function BoardView({ fen, disabled = false, onMove }: BoardViewProps) {
  const options: ChessboardOptions = {
    id: 'italian-training-board',
    position: fen,
    allowDragging: !disabled,
    animationDurationInMs: 180,
    showAnimations: true,
    boardStyle: {
      borderRadius: '18px',
      boxShadow: '0 24px 70px rgba(14, 10, 6, 0.28)',
      overflow: 'hidden',
    },
    lightSquareStyle: { backgroundColor: '#e9d7b4' },
    darkSquareStyle: { backgroundColor: '#8f654c' },
    onPieceDrop: ({ sourceSquare, targetSquare }) => {
      if (
        disabled ||
        !isChessSquare(sourceSquare) ||
        !isChessSquare(targetSquare)
      ) {
        return false
      }

      return onMove(sourceSquare, targetSquare)
    },
  }

  return (
    <div className="board-shell" aria-label="Échiquier d’entraînement">
      <Chessboard options={options} />
    </div>
  )
}
