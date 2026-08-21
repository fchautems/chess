import {
  Chessboard,
  defaultPieces,
  type ChessboardOptions,
  type PieceRenderObject,
} from 'react-chessboard'

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
  theme?: 'walnut' | 'midnight'
}

const squarePattern = /^[a-h][1-8]$/

const createPolishedPieces = (shadow: string): PieceRenderObject =>
  Object.fromEntries(
    Object.entries(defaultPieces).map(([piece, render]) => [
      piece,
      (props?: Parameters<typeof render>[0]) =>
        render({
          ...props,
          svgStyle: {
            ...props?.svgStyle,
            filter: shadow,
          },
        }),
    ]),
  )

const walnutPieces = createPolishedPieces(
  'drop-shadow(0 4px 3px rgba(37, 20, 11, 0.38))',
)
const midnightPieces = createPolishedPieces(
  'drop-shadow(0 3px 4px rgba(6, 15, 14, 0.55))',
)

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
  theme = 'walnut',
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
    pieces: theme === 'midnight' ? midnightPieces : walnutPieces,
    allowDragging: !disabled,
    animationDurationInMs: 180,
    showAnimations: true,
    squareStyles,
    boardStyle: {
      borderRadius: '18px',
      boxShadow: '0 24px 70px rgba(14, 10, 6, 0.28)',
      overflow: 'hidden',
    },
    lightSquareStyle: {
      backgroundColor: theme === 'midnight' ? '#b8c2bd' : '#e7d1aa',
    },
    darkSquareStyle: {
      backgroundColor: theme === 'midnight' ? '#314b46' : '#875b3f',
    },
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
