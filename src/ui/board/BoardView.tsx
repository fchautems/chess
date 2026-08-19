import { Chessboard, type ChessboardOptions } from 'react-chessboard'

import type { BoardMoveView } from '../../application/GameViewModel'
import type { ChessSquare } from '../../domain/chess/ChessRules'

interface BoardViewProps {
  fen: string
  disabled?: boolean
  selectedSquare: ChessSquare | null
  legalDestinations: readonly ChessSquare[]
  lastMove: BoardMoveView | null
  onMove: (from: ChessSquare, to: ChessSquare) => boolean
  onSquareSelect: (square: ChessSquare) => void
}

const squarePattern = /^[a-h][1-8]$/

function isChessSquare(value: string | null): value is ChessSquare {
  return value !== null && squarePattern.test(value)
}

export function BoardView({
  fen,
  disabled = false,
  selectedSquare,
  legalDestinations,
  lastMove,
  onMove,
  onSquareSelect,
}: BoardViewProps) {
  const squareStyles: NonNullable<ChessboardOptions['squareStyles']> = {}

  if (lastMove) {
    squareStyles[lastMove.from] = {
      boxShadow: 'inset 0 0 0 999px rgba(222, 172, 54, 0.28)',
    }
    squareStyles[lastMove.to] = {
      boxShadow: 'inset 0 0 0 999px rgba(222, 172, 54, 0.42)',
    }
  }

  for (const destination of legalDestinations) {
    squareStyles[destination] = {
      ...squareStyles[destination],
      backgroundImage:
        'radial-gradient(circle, rgba(46, 83, 55, 0.72) 0 17%, transparent 19%)',
      cursor: 'pointer',
    }
  }

  if (selectedSquare) {
    squareStyles[selectedSquare] = {
      ...squareStyles[selectedSquare],
      boxShadow: 'inset 0 0 0 5px rgba(45, 91, 61, 0.88)',
      cursor: 'pointer',
    }
  }

  const options: ChessboardOptions = {
    id: 'italian-training-board',
    position: fen,
    allowDragging: !disabled,
    animationDurationInMs: 180,
    showAnimations: true,
    squareStyles,
    boardStyle: {
      borderRadius: '18px',
      boxShadow: '0 24px 70px rgba(14, 10, 6, 0.28)',
      overflow: 'hidden',
    },
    lightSquareStyle: { backgroundColor: '#e9d7b4' },
    darkSquareStyle: { backgroundColor: '#8f654c' },
    onSquareClick: ({ square }) => {
      if (!disabled && isChessSquare(square)) {
        onSquareSelect(square)
      }
    },
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
