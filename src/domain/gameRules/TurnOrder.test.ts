import { describe, it, expect } from 'vitest';
import { getNextPlayerId } from './TurnOrder';
import { Player } from '../entities/Player';
import { Money } from '../valueObjects/Money';

function makePlayers(ids: string[]): Player[] {
  return ids.map((id) => Player.create(id, id, '#E24B4A', Money.of(1200)));
}

describe('getNextPlayerId', () => {
  it('يرجع اللاعب التالي بالترتيب', () => {
    const players = makePlayers(['a', 'b', 'c']);
    expect(getNextPlayerId(players, 'a')).toBe('b');
    expect(getNextPlayerId(players, 'b')).toBe('c');
  });

  it('يلتف دائرياً للاعب الأول بعد الأخير', () => {
    const players = makePlayers(['a', 'b', 'c']);
    expect(getNextPlayerId(players, 'c')).toBe('a');
  });

  it('يرمي خطأ لو اللاعب الحالي غير موجود بالقائمة', () => {
    const players = makePlayers(['a', 'b']);
    expect(() => getNextPlayerId(players, 'z')).toThrow();
  });
});
