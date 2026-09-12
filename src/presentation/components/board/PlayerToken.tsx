import { memo, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { TILE_GRID_POSITIONS } from '../../../shared/utils/boardLayout';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

export interface PlayerTokenProps {
  readonly nickname: string;
  readonly color: string;
  /**
   * رقم المربع الفعلي (0-39) — وليس gridPosition جاهزة كما كانت سابقاً.
   * التغيير مقصود (Phase 4): المكوّن نفسه الآن مسؤول عن حساب موقع كل قفزة
   * وسيطة، بدل استقبال الموقع النهائي فقط والقفز إليه بحركة واحدة.
   */
  readonly position: number;
  readonly stackIndex: number;
}

const BOARD_SIZE = 40;
const HOP_DURATION_MS = 140;
const HOP_TRANSITION = { type: 'spring', stiffness: 600, damping: 30 } as const;
const SETTLE_BOUNCE_MS = 260;

/** يبني تسلسل المربعات الوسيطة من "من" إلى "إلى" بعكس عقارب الساعة (نفس اتجاه اللعب) */
function buildHopSequence(from: number, to: number): number[] {
  const steps: number[] = [];
  let cursor = from;
  while (cursor !== to) {
    cursor = (cursor + 1) % BOARD_SIZE;
    steps.push(cursor);
  }
  return steps;
}

function PlayerTokenComponent({ nickname, color, position, stackIndex }: PlayerTokenProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [displayedPosition, setDisplayedPosition] = useState(position);
  const [justLanded, setJustLanded] = useState(false);
  const previousPositionRef = useRef(position);

  useEffect(() => {
    const from = previousPositionRef.current;
    const to = position;
    if (from === to) return;

    if (prefersReducedMotion) {
      setDisplayedPosition(to);
      previousPositionRef.current = to;
      return;
    }

    const hopSequence = buildHopSequence(from, to);
    let cancelled = false;
    let stepIndex = 0;

    const advance = () => {
      if (cancelled) return;
      const nextTile = hopSequence[stepIndex];
      if (nextTile === undefined) return;
      setDisplayedPosition(nextTile);
      stepIndex += 1;

      if (stepIndex < hopSequence.length) {
        window.setTimeout(advance, HOP_DURATION_MS);
      } else {
        previousPositionRef.current = to;
        setJustLanded(true);
        window.setTimeout(() => setJustLanded(false), SETTLE_BOUNCE_MS);
      }
    };

    advance();
    return () => {
      cancelled = true;
    };
  }, [position, prefersReducedMotion]);

  const gridPosition = TILE_GRID_POSITIONS.get(displayedPosition);
  if (!gridPosition) return null;

  // stackIndex يبعثر الرموز قليلاً لما أكثر من لاعب واقف على نفس المربع، بدل تراكبهم بالكامل
  const offset = stackIndex * 6;

  return (
    <motion.div
      layout
      transition={HOP_TRANSITION}
      animate={justLanded ? { scale: [1, 1.35, 1] } : { scale: 1 }}
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
