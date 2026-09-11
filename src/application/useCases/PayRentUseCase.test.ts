import { describe, it, expect } from 'vitest';
import { payRent } from './PayRentUseCase';
import { Player } from '../../domain/entities/Player';
import { Money } from '../../domain/valueObjects/Money';

const JERUSALEM_TILE_ID = 6; // property, baseRent: 6
const START_TILE_ID = 0; // non-property

function makePlayer(id: string, money = 1200) {
  return Player.create(id, id, '#E24B4A', Money.of(money));
}

describe('payRent', () => {
  it('ينجح الدفع: يخصم من الدافع ويضيف لصاحب العقار', () => {
    const payer = makePlayer('p1');
    const owner = makePlayer('p2').acquireProperty(JERUSALEM_TILE_ID);
    const result = payRent(payer, [payer, owner], JERUSALEM_TILE_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.rentAmount.value).toBe(6); // baseRent بدون بناء
      expect(result.payer.money.value).toBe(1194);
      expect(result.owner.money.value).toBe(1206);
    }
  });

  it('يحسب الإيجار حسب مستوى البناء لصاحب العقار', () => {
    const payer = makePlayer('p1');
    const owner = makePlayer('p2').acquireProperty(JERUSALEM_TILE_ID).upgradeProperty(JERUSALEM_TILE_ID);
    const result = payRent(payer, [payer, owner], JERUSALEM_TILE_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.rentAmount.value).toBe(30); // rentPerLevel[0] لمستوى 1
    }
  });

  it('يفشل لو المربع مش عقاراً', () => {
    const payer = makePlayer('p1');
    const result = payRent(payer, [payer], START_TILE_ID);
    expect(result).toEqual({ success: false, reason: 'not-a-property' });
  });

  it('يفشل لو العقار غير مملوك لأحد', () => {
    const payer = makePlayer('p1');
    const result = payRent(payer, [payer], JERUSALEM_TILE_ID);
    expect(result).toEqual({ success: false, reason: 'unowned' });
  });

  it('يفشل لو اللاعب واقف على عقاره هو نفسه (لا إيجار ذاتي)', () => {
    const payer = makePlayer('p1').acquireProperty(JERUSALEM_TILE_ID);
    const result = payRent(payer, [payer], JERUSALEM_TILE_ID);
    expect(result).toEqual({ success: false, reason: 'self-rent' });
  });
});
