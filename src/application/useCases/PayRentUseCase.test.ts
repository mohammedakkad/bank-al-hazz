import { describe, it, expect } from 'vitest';
import { payRent } from './PayRentUseCase';
import { Player } from '../../domain/entities/Player';
import { Money } from '../../domain/valueObjects/Money';

const JERUSALEM_TILE_ID = 6; // property, baseRent: 6, colorGroup: lightblue
const ALEPPO_TILE_ID = 8; // نفس مجموعة القدس (lightblue)
const CAIRO_TILE_ID = 9; // نفس مجموعة القدس (lightblue)
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

  it('يضاعف الإيجار الأساسي لو المالك يملك كل عقارات المجموعة اللونية بدون بناء', () => {
    const payer = makePlayer('p1');
    let owner = makePlayer('p2');
    owner = owner.acquireProperty(JERUSALEM_TILE_ID).acquireProperty(ALEPPO_TILE_ID).acquireProperty(CAIRO_TILE_ID);
    const result = payRent(payer, [payer, owner], JERUSALEM_TILE_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.rentAmount.value).toBe(12); // baseRent 6 × 2 (مالك المجموعة كاملة)
    }
  });

  it('لا يضاعف الإيجار المبني (level > 0) حتى لو المالك يملك المجموعة كاملة', () => {
    const payer = makePlayer('p1');
    let owner = makePlayer('p2');
    owner = owner
      .acquireProperty(JERUSALEM_TILE_ID)
      .acquireProperty(ALEPPO_TILE_ID)
      .acquireProperty(CAIRO_TILE_ID)
      .upgradeProperty(JERUSALEM_TILE_ID);
    const result = payRent(payer, [payer, owner], JERUSALEM_TILE_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.rentAmount.value).toBe(30); // rentPerLevel[0] فقط، بدون مضاعفة إضافية
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

  describe('إيجار المطارات (Item 3 — كان مفقوداً كلياً)', () => {
    const DAMASCUS_AIRPORT_ID = 5;
    const RIYADH_AIRPORT_ID = 15;

    it('مطار واحد مملوك → إيجار 25', () => {
      const payer = makePlayer('p1');
      const owner = makePlayer('p2').acquireProperty(DAMASCUS_AIRPORT_ID);
      const result = payRent(payer, [payer, owner], DAMASCUS_AIRPORT_ID);
      expect(result.success).toBe(true);
      if (result.success) expect(result.rentAmount.value).toBe(25);
    });

    it('مطاران مملوكان لنفس اللاعب → إيجار 50 (يتضاعف حسب العدد، وليس مجموعة لونية)', () => {
      const payer = makePlayer('p1');
      const owner = makePlayer('p2').acquireProperty(DAMASCUS_AIRPORT_ID).acquireProperty(RIYADH_AIRPORT_ID);
      const result = payRent(payer, [payer, owner], DAMASCUS_AIRPORT_ID);
      expect(result.success).toBe(true);
      if (result.success) expect(result.rentAmount.value).toBe(50);
    });
  });

  describe('إيجار شركات المرافق (Item 3 — كان مفقوداً كلياً)', () => {
    const ELECTRIC_UTILITY_ID = 12;
    const WATER_UTILITY_ID = 28;

    it('شركة واحدة مملوكة → الإيجار = 4× مجموع النرد', () => {
      const payer = makePlayer('p1');
      const owner = makePlayer('p2').acquireProperty(ELECTRIC_UTILITY_ID);
      const result = payRent(payer, [payer, owner], ELECTRIC_UTILITY_ID, 7);
      expect(result.success).toBe(true);
      if (result.success) expect(result.rentAmount.value).toBe(28); // 4 × 7
    });

    it('الشركتان مملوكتان لنفس اللاعب → الإيجار = 10× مجموع النرد', () => {
      const payer = makePlayer('p1');
      const owner = makePlayer('p2').acquireProperty(ELECTRIC_UTILITY_ID).acquireProperty(WATER_UTILITY_ID);
      const result = payRent(payer, [payer, owner], ELECTRIC_UTILITY_ID, 7);
      expect(result.success).toBe(true);
      if (result.success) expect(result.rentAmount.value).toBe(70); // 10 × 7
    });
  });
});
