import { describe, it, expect } from 'vitest';
import { generateRoomCode, normalizeRoomCode } from './roomCode';

describe('generateRoomCode', () => {
  it('يولّد كوداً بطول 6 أحرف', () => {
    expect(generateRoomCode()).toHaveLength(6);
  });

  it('لا يحتوي أحرفاً ملتبسة (0, O, 1, I, L)', () => {
    const code = generateRoomCode();
    expect(code).not.toMatch(/[0O1IL]/);
  });

  it('يستخدم مصدر عشوائية محقون بشكل حتمي', () => {
    const fixedRandom = () => 0;
    expect(generateRoomCode(fixedRandom)).toBe('AAAAAA');
  });
});

describe('normalizeRoomCode', () => {
  it('يحوّل لحروف كبيرة ويزيل المسافات', () => {
    expect(normalizeRoomCode('  ab12cd  ')).toBe('AB12CD');
  });
});
