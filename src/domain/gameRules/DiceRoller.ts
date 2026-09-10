export interface DiceResult {
  readonly die1: number;
  readonly die2: number;
  readonly total: number;
  readonly isDouble: boolean;
}

/**
 * randomFn قابل للحقن (dependency injection) بدل استخدام Math.random مباشرة داخل الدالة.
 * السبب: في الاختبارات نحتاج نتيجة نرد محددة (مثلاً "افترض إنه طلع 6 و6") بدون الاعتماد على عشوائية حقيقية.
 */
export function rollDice(randomFn: () => number = Math.random): DiceResult {
  const die1 = Math.floor(randomFn() * 6) + 1;
  const die2 = Math.floor(randomFn() * 6) + 1;
  return {
    die1,
    die2,
    total: die1 + die2,
    isDouble: die1 === die2,
  };
}
