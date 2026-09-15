import { describe, it, expect } from 'vitest';
import { calculateAirportRent } from './AirportRules';

describe('calculateAirportRent', () => {
  it('صفر مطارات مملوكة → إيجار صفر', () => {
    expect(calculateAirportRent(0)).toBe(0);
  });

  it('يطابق الجدول الرسمي حسب العدد المملوك', () => {
    expect(calculateAirportRent(1)).toBe(25);
    expect(calculateAirportRent(2)).toBe(50);
    expect(calculateAirportRent(3)).toBe(100);
    expect(calculateAirportRent(4)).toBe(200);
  });
});
