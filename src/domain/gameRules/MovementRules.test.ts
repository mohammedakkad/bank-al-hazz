import { describe, it, expect } from 'vitest';
import { calculateMove } from './MovementRules';

describe('calculateMove', () => {
  it('يحرك اللاعب للأمام بدون تجاوز اللوحة', () => {
    const result = calculateMove(5, 4);
    expect(result.newPosition).toBe(9);
    expect(result.passedStart).toBe(false);
  });

  it('يكتشف المرور بمربع البداية عند تجاوز نهاية اللوحة', () => {
    const result = calculateMove(38, 5);
    expect(result.newPosition).toBe(3);
    expect(result.passedStart).toBe(true);
  });
});
