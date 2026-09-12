export const JAIL_FINE = 50;
/** بعد محاولتين فاشلتين (jailTurnsElapsed يوصل 2)، الدور الثالث تصير الغرامة إجبارية */
const FORCED_FINE_AT_TURNS_ELAPSED = 2;

/** ثلاث doubles متتالية بنفس الدور → للسجن مباشرة بدل الحركة */
export function isTripleDoubles(consecutiveDoublesBeforeThisRoll: number): boolean {
  return consecutiveDoublesBeforeThisRoll >= 2;
}

/** هل هاد الدور بالسجن هو الدور الثالث (يعني الغرامة صارت إجبارية)؟ */
export function isForcedFineTurn(jailTurnsElapsed: number): boolean {
  return jailTurnsElapsed >= FORCED_FINE_AT_TURNS_ELAPSED;
}
