import { describe, it, expect } from 'vitest';
import { calculateUtilityRent } from './UtilityRules';

describe('calculateUtilityRent', () => {
  it('صفر شركات مملوكة → إيجار صفر بغض النظر عن النرد', () => {
    expect(calculateUtilityRent(9, 0)).toBe(0);
  });

  it('شركة واحدة → 4× مجموع النرد', () => {
    expect(calculateUtilityRent(6, 1)).toBe(24);
  });

  it('الشركتان معاً → 10× مجموع النرد', () => {
    expect(calculateUtilityRent(6, 2)).toBe(60);
  });
});
