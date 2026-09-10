export const BOARD_SIZE = 40;
export const START_BONUS = 200;

export interface MoveResult {
  readonly newPosition: number;
  readonly passedStart: boolean;
}

/**
 * حساب الموقع الجديد بعد رمي النرد، مع اكتشاف المرور بمربع "البداية"
 * (بالتحديد: لفّة كاملة حول اللوحة) لمنح 200 جنيه.
 * معزولة كدالة نقية (pure function) لأنها الأسهل للاختبار: نفس المدخل = نفس المخرج دائماً.
 */
export function calculateMove(currentPosition: number, steps: number): MoveResult {
  const rawPosition = currentPosition + steps;
  const newPosition = rawPosition % BOARD_SIZE;
  const passedStart = rawPosition >= BOARD_SIZE;
  return { newPosition, passedStart };
}
