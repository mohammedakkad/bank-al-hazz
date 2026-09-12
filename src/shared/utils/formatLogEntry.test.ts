import { describe, it, expect } from 'vitest';
import { formatLogEntry } from './formatLogEntry';
import type { GameLogEntry } from '../../domain/interfaces/IGameRepository';

describe('formatLogEntry', () => {
  it('dice-rolled', () => {
    const entry: GameLogEntry = { type: 'dice-rolled', playerId: 'p1', playerNickname: 'أحمد', die1: 3, die2: 5, total: 8 };
    expect(formatLogEntry(entry)).toBe('أحمد رمى النرد (3 + 5 = 8)');
  });

  it('player-moved', () => {
    const entry: GameLogEntry = { type: 'player-moved', playerId: 'p1', playerNickname: 'أحمد', tileId: 6, tileName: 'القدس' };
    expect(formatLogEntry(entry)).toBe('أحمد تحرّك إلى القدس');
  });

  it('property-bought', () => {
    const entry: GameLogEntry = { type: 'property-bought', playerId: 'p1', playerNickname: 'أحمد', tileId: 6, tileName: 'القدس', price: 100 };
    expect(formatLogEntry(entry)).toBe('أحمد اشترى القدس مقابل 100 جنيه');
  });

  it('rent-paid', () => {
    const entry: GameLogEntry = {
      type: 'rent-paid', playerId: 'p1', playerNickname: 'أحمد', ownerId: 'p2', ownerNickname: 'سارة', tileId: 6, tileName: 'القدس', amount: 6,
    };
    expect(formatLogEntry(entry)).toBe('أحمد دفع 6 جنيه إيجار لـسارة على القدس');
  });

  it('property-built', () => {
    const entry: GameLogEntry = { type: 'property-built', playerId: 'p1', playerNickname: 'أحمد', tileId: 6, tileName: 'القدس', newLevel: 2 };
    expect(formatLogEntry(entry)).toBe('أحمد بنى على القدس (مستوى 2)');
  });

  it('property-auctioned (يوجد فائز)', () => {
    const entry: GameLogEntry = {
      type: 'property-auctioned', tileId: 6, tileName: 'القدس', winnerId: 'p2', winnerNickname: 'سارة', amount: 120,
    };
    expect(formatLogEntry(entry)).toBe('سارة فاز بمزاد القدس مقابل 120 جنيه');
  });

  it('property-auctioned (بدون فائز)', () => {
    const entry: GameLogEntry = {
      type: 'property-auctioned', tileId: 6, tileName: 'القدس', winnerId: null, winnerNickname: null, amount: 0,
    };
    expect(formatLogEntry(entry)).toBe('انتهى مزاد القدس بدون فائز — بقي العقار بدون مالك');
  });
});
