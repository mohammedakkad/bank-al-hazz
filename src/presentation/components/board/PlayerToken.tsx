import { memo } from 'react';
import { motion } from 'framer-motion';
import type { TileGridPosition } from '../../../shared/utils/boardLayout';

export interface PlayerTokenProps {
  readonly nickname: string;
  readonly color: string;
  readonly gridPosition: TileGridPosition;
  readonly stackIndex: number;
}

const TOKEN_TRANSITION = { type: 'spring', stiffness: 500, damping: 35 } as const;

function PlayerTokenComponent({ nickname, color, gridPosition, stackIndex }: PlayerTokenProps) {
  // stackIndex يبعثر الرموز قليلاً لما أكثر من لاعب واقف على نفس المربع، بدل تراكبهم بالكامل
  const offset = stackIndex * 6;

  return (
    <motion.div
      layout
      transition={TOKEN_TRANSITION}
      className="pointer-events-none absolute z-20 flex h-3 w-3 items-center justify-center rounded-full border border-white/40 shadow-sm sm:h-4 sm:w-4"
      style={{
        gridRow: gridPosition.row,
        gridColumn: gridPosition.col,
        backgroundColor: color,
        translateX: offset,
        translateY: offset,
      }}
      aria-label={nickname}
      role="img"
    />
  );
}

export const PlayerToken = memo(PlayerTokenComponent);
