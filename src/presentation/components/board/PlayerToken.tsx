import { memo, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { getTileCenterPercent } from '../../../shared/utils/boardLayout';
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
/** بعثرة بسيطة (نسبة مئوية من عرض اللوحة، وليس بكسل ثابت) لما أكثر من لاعب على نفس المربع */
const STACK_OFFSET_PERCENT = 1.4;

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

  const center = getTileCenterPercent(displayedPosition);
  if (!center) return null;

  // stackIndex يبعثر الرموز قليلاً لما أكثر من لاعب واقف على نفس المربع، بدل تراكبهم بالكامل
  const offsetPercent = stackIndex * STACK_OFFSET_PERCENT;

  return (
    <motion.div
      layout
      transition={HOP_TRANSITION}
      animate={justLanded ? { scale: [1, 1.35, 1] } : { scale: 1 }}
      className="pointer-events-none absolute z-20 h-4 w-4 sm:h-5 sm:w-5"
      style={{
        left: `${center.leftPercent + offsetPercent}%`,
        top: `${center.topPercent + offsetPercent}%`,
        x: '-50%',
        y: '-50%',
      }}
      aria-label={nickname}
      role="img"
    >
      {/*
       * Bug 4: شكل "دبّوس موقع" مميّز تماماً عن شكل شارة الملكية (علم صغير بزاوية
       * المربع، BoardTile.tsx) — حتى لو تطابق اللون صدفة، الشكلان لا يُلتبسان أبداً.
       */}
      <svg viewBox="0 0 24 24" className="h-full w-full" style={{ filter: 'drop-shadow(0 1px 1.5px rgba(0,0,0,0.6))' }}>
        <path
          d="M12 0C7.03 0 3 4.03 3 9c0 6.75 9 15 9 15s9-8.25 9-15c0-4.97-4.03-9-9-9z"
          fill={color}
          stroke="white"
          strokeWidth="1.5"
        />
        <circle cx="12" cy="9" r="3.4" fill="white" />
      </svg>
    </motion.div>
  );
}

export const PlayerToken = memo(PlayerTokenComponent);
