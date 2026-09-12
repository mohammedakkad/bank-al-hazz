import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

const DEFAULT_DURATION_MS = 600;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function useCountUp(target: number, durationMs = DEFAULT_DURATION_MS): number {
  const [displayValue, setDisplayValue] = useState(target);
  const prefersReducedMotion = usePrefersReducedMotion();
  const fromRef = useRef(target);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;

    if (prefersReducedMotion) {
      setDisplayValue(target);
      fromRef.current = target;
      return;
    }

    let animationFrameId: number;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = easeOutCubic(progress);
      setDisplayValue(Math.round(from + (target - from) * eased));

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        fromRef.current = target;
      }
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [target, durationMs, prefersReducedMotion]);

  return displayValue;
}
