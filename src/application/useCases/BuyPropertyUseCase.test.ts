import { describe, it, expect } from 'vitest';
import { buyProperty } from './BuyPropertyUseCase';
import { Player } from '../../domain/entities/Player';
import { Money } from '../../domain/valueObjects/Money';

const JERUSALEM_TILE_ID = 6; // property, purchasePrice: 100
const START_TILE_ID = 0; // non-property

function makePlayer(id: string, money = 1200) {
  return Player.create(id, id, '#E24B4A', Money.of(money));
}

describe('buyProperty', () => {
  it('ينجح الشراء ويخصم السعر ويضيف الملكية', () => {
    const buyer = makePlayer('p1');
    const result = buyProperty(buyer, [buyer], JERUSALEM_TILE_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.player.ownsTile(JERUSALEM_TILE_ID)).toBe(true);
      expect(result.player.money.value).toBe(1100); // 1200 - 100
    }
  });

  it('يفشل لو المربع مش عقاراً قابلاً للتملك', () => {
    const buyer = makePlayer('p1');
    const result = buyProperty(buyer, [buyer], START_TILE_ID);
    expect(result).toEqual({ success: false, reason: 'not-a-property' });
  });

  it('يفشل لو العقار مملوك للاعب آخر', () => {
    const buyer = makePlayer('p1');
    const owner = makePlayer('p2').acquireProperty(JERUSALEM_TILE_ID);
    const result = buyProperty(buyer, [buyer, owner], JERUSALEM_TILE_ID);
    expect(result).toEqual({ success: false, reason: 'already-owned' });
  });

  it('يفشل لو رصيد اللاعب غير كافٍ', () => {
    const buyer = makePlayer('p1', 50);
    const result = buyProperty(buyer, [buyer], JERUSALEM_TILE_ID);
    expect(result).toEqual({ success: false, reason: 'insufficient-funds' });
  });
});
