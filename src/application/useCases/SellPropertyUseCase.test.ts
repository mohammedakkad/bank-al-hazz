import { describe, it, expect } from 'vitest';
import { Player } from '../../domain/entities/Player';
import { Money } from '../../domain/valueObjects/Money';
import { sellProperty } from './SellPropertyUseCase';

const JERUSALEM_TILE_ID = 6; // purchasePrice 220 حسب بيانات اللوحة الحالية — نتحقق أدناه بدل افتراضه

function makePlayer(money = 1200): Player {
  return Player.create('p1', 'أحمد', '#E24B4A', Money.of(money));
}

describe('sellProperty', () => {
  it('بيع عقار غير مبني يرجع نصف سعر الشراء ويزيل الملكية', () => {
    const player = makePlayer().acquireProperty(JERUSALEM_TILE_ID);
    const result = sellProperty(player, JERUSALEM_TILE_ID);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.player.ownsTile(JERUSALEM_TILE_ID)).toBe(false);
    expect(result.refundAmount).toBeGreaterThan(0);
    expect(result.player.money.value).toBe(1200 + result.refundAmount);
  });

  it('يفشل لو اللاعب لا يملك هذا العقار أصلاً', () => {
    const player = makePlayer();
    const result = sellProperty(player, JERUSALEM_TILE_ID);
    expect(result).toEqual({ success: false, reason: 'not-owned' });
  });

  it('يفشل لو المربع ليس عقاراً (مطار/بداية/إلخ)', () => {
    const player = makePlayer();
    const result = sellProperty(player, 0); // البداية
    expect(result).toEqual({ success: false, reason: 'not-a-property' });
  });

  it('يفشل لو عليه بناء (مستوى > 0) — ولا يغيّر حالة اللاعب', () => {
    const player = makePlayer().acquireProperty(JERUSALEM_TILE_ID).upgradeProperty(JERUSALEM_TILE_ID);
    const result = sellProperty(player, JERUSALEM_TILE_ID);
    expect(result).toEqual({ success: false, reason: 'has-buildings' });
  });
});
