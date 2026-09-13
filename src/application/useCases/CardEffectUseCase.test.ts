import { describe, it, expect } from 'vitest';
import { Player } from '../../domain/entities/Player';
import { Money } from '../../domain/valueObjects/Money';
import { applyCardEffect } from './CardEffectUseCase';
import type { CardEffect } from '../../domain/gameRules/CardEffects';

function makePlayer(id: string, money = 1200, position = 0): Player {
  return Player.create(id, `لاعب-${id}`, '#000000', Money.of(money)).moveTo(position);
}

describe('CardEffectUseCase — applyCardEffect', () => {
  it('advance-to-tile: ينقل اللاعب للمربع المحدد ويمنح 200 لو مرّ بالبداية', () => {
    const player = makePlayer('p1', 1200, 35);
    const effect: CardEffect = { kind: 'advance-to-tile', tileId: 0, grantsGoBonusIfPassed: true };
    const result = applyCardEffect(effect, player, []);
    expect(result.player.position).toBe(0);
    expect(result.player.money.value).toBe(1400); // مرّ بالبداية فعلياً (لفّة كاملة) + قبض 200
  });

  it('advance-to-tile: بدون منح المكافأة لو الأثر ينص على ذلك (go-to-jail المكافئ يُعالَج بشكل منفصل أصلاً)', () => {
    const player = makePlayer('p1', 1200, 5);
    const effect: CardEffect = { kind: 'advance-to-tile', tileId: 39, grantsGoBonusIfPassed: false };
    const result = applyCardEffect(effect, player, []);
    expect(result.player.position).toBe(39);
    expect(result.player.money.value).toBe(1200); // ما مرّ بالبداية أصلاً (39 > 5)، فمفيش فرق هنا لكن نتأكد ما زادت
  });

  it('advance-to-nearest-of-type: يوصل لأقرب مطار للأمام، وبالتفاف دائري لو محدش قدام', () => {
    const player = makePlayer('p1', 1200, 36); // بعد آخر مطار (35) — لازم يلف لأقرب مطار (5)
    const effect: CardEffect = { kind: 'advance-to-nearest-of-type', tileType: 'airport', grantsGoBonusIfPassed: true };
    const result = applyCardEffect(effect, player, []);
    expect(result.player.position).toBe(5);
    expect(result.player.money.value).toBe(1400); // لف بالبداية بالطريق
  });

  it('go-back-n-spaces: يرجع للخلف بدون أي تأثير على المال', () => {
    const player = makePlayer('p1', 1200, 10);
    const result = applyCardEffect({ kind: 'go-back-n-spaces', spaces: 3 }, player, []);
    expect(result.player.position).toBe(7);
    expect(result.player.money.value).toBe(1200);
  });

  it('collect-fixed / pay-fixed', () => {
    const player = makePlayer('p1', 1200);
    expect(applyCardEffect({ kind: 'collect-fixed', amount: 50 }, player, []).player.money.value).toBe(1250);
    expect(applyCardEffect({ kind: 'pay-fixed', amount: 50 }, player, []).player.money.value).toBe(1150);
  });

  it('pay-per-house-hotel: يحسب حسب عدد المنازل والفنادق الفعلي', () => {
    let player = makePlayer('p1', 1200);
    player = player.acquireProperty(1).upgradeProperty(1).upgradeProperty(1); // مستوى 2 (منزلان)
    player = player.acquireProperty(3);
    for (let i = 0; i < 5; i++) player = player.upgradeProperty(3); // مستوى 5 (فندق)

    const result = applyCardEffect({ kind: 'pay-per-house-hotel', perHouse: 25, perHotel: 100 }, player, []);
    // منزلان (تايل 1) × 25 + فندق واحد (تايل 3) × 100 = 50 + 100 = 150
    expect(result.player.money.value).toBe(1050);
  });

  it('pay-each-player / collect-from-each-player: يوزّع/يجمع من كل اللاعبين الآخرين', () => {
    const player = makePlayer('p1', 1200);
    const others = [makePlayer('p2', 1200), makePlayer('p3', 1200)];

    const payResult = applyCardEffect({ kind: 'pay-each-player', amount: 50 }, player, others);
    expect(payResult.player.money.value).toBe(1100); // دفع 50 لكل من الاثنين
    expect(payResult.others.map((p) => p.money.value)).toEqual([1250, 1250]);

    const collectResult = applyCardEffect({ kind: 'collect-from-each-player', amount: 10 }, player, others);
    expect(collectResult.player.money.value).toBe(1220);
    expect(collectResult.others.map((p) => p.money.value)).toEqual([1190, 1190]);
  });

  it('go-to-jail: يرسل اللاعب للسجن ويعلّم sentToJail', () => {
    const player = makePlayer('p1');
    const result = applyCardEffect({ kind: 'go-to-jail' }, player, []);
    expect(result.player.isInJail).toBe(true);
    expect(result.player.position).toBe(10);
    expect(result.sentToJail).toBe(true);
  });

  it('get-out-of-jail-free: بدون أي أثر مباشر على اللاعب، فقط علم heldGetOutOfJailFree', () => {
    const player = makePlayer('p1', 1200, 7);
    const result = applyCardEffect({ kind: 'get-out-of-jail-free' }, player, []);
    expect(result.player.position).toBe(7);
    expect(result.player.money.value).toBe(1200);
    expect(result.heldGetOutOfJailFree).toBe(true);
  });
});
