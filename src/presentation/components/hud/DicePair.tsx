import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { DiceResult } from '../../../domain/gameRules/DiceRoller';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

export interface DicePairProps {
  readonly result: DiceResult | null;
  readonly isRolling: boolean;
}

// أوجه النرد بمحارف يونيكود جاهزة (⚀-⚅) — بلا حاجة لرسم نقاط SVG يدوياً
const DIE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'] as const;

const TUMBLE_FRAME_MS = 70;
const TUMBLE_DURATION_MS = 550;

function Die({ face, isRolling }: { readonly face: number; readonly isRolling: boolean }) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <motion.span
      className="flex h-10 w-10 items-center justify-center rounded-lg border border-board-line bg-board-tile text-3xl sm:h-12 sm:w-12 sm:text-4xl"
      animate={
        isRolling && !prefersReducedMotion
          ? { rotate: [0, 90, 180, 270, 360], scale: [1, 1.1, 1, 1.1, 1] }
          : { rotate: 0, scale: 1 }
      }
      transition={isRolling ? { duration: TUMBLE_DURATION_MS / 1000, ease: 'easeInOut' } : { duration: 0.2 }}
    >
      {DIE_FACES[face] ?? DIE_FACES[1]}
    </motion.span>
  );
}

export function DicePair({ result, isRolling }: DicePairProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [displayFaces, setDisplayFaces] = useState<[number, number]>([
    result?.die1 ?? 1,
    result?.die2 ?? 1,
  ]);

  useEffect(() => {
    if (!isRolling) {
      if (result) setDisplayFaces([result.die1, result.die2]);
      return;
    }

    if (prefersReducedMotion) {
      if (result) setDisplayFaces([result.die1, result.die2]);
      return;
    }

    // أثناء التدوير: تبديل الأوجه عشوائياً بسرعة (وهم "الاختلاط") قبل الاستقرار على النتيجة الحقيقية
    const intervalId = window.setInterval(() => {
      setDisplayFaces([1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)]);
    }, TUMBLE_FRAME_MS);

    return () => window.clearInterval(intervalId);
  }, [isRolling, result, prefersReducedMotion]);

  return (
    <div className="flex gap-2" role="img" aria-label={result ? `النرد: ${result.die1} و${result.die2}` : 'النرد'}>
      <Die face={displayFaces[0]} isRolling={isRolling} />
      <Die face={displayFaces[1]} isRolling={isRolling} />
    </div>
  );
}
