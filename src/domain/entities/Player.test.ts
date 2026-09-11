import { describe, it, expect } from 'vitest';
import { Player } from './Player';
import { Money } from '../valueObjects/Money';

function makePlayer() {
  return Player.create('p1', 'أحمد', '#E24B4A', Money.of(1200));
}

describe('Player', () => {
  it('يبدأ بمستويات بناء فاضية', () => {
    expect(makePlayer().buildLevels).toEqual({});
  });

  it('upgradeProperty يرفع المستوى من صفر لواحد', () => {
    const player = makePlayer().upgradeProperty(6);
    expect(player.buildLevels[6]).toBe(1);
  });

  it('upgradeProperty يرفع المستوى تدريجياً لعقارات متعددة بشكل مستقل', () => {
    const player = makePlayer().upgradeProperty(6).upgradeProperty(6).upgradeProperty(19);
    expect(player.buildLevels[6]).toBe(2);
    expect(player.buildLevels[19]).toBe(1);
  });

  it('upgradeProperty لا يتجاوز المستوى 5', () => {
    let player = makePlayer();
    for (let i = 0; i < 10; i++) {
      player = player.upgradeProperty(6);
    }
    expect(player.buildLevels[6]).toBe(5);
  });

  it('pay تخصم المبلغ وتُفلس اللاعب لو أصبح الرصيد سالباً', () => {
    const player = makePlayer().pay(Money.of(1500));
    expect(player.money.value).toBe(-300);
    expect(player.isBankrupt).toBe(true);
  });

  it('receive تضيف للرصيد بدون التأثير على باقي الحالة', () => {
    const player = makePlayer().receive(Money.of(300));
    expect(player.money.value).toBe(1500);
    expect(player.isBankrupt).toBe(false);
  });

  it('acquireProperty تضيف العقار لقائمة الملكية', () => {
    const player = makePlayer().acquireProperty(6);
    expect(player.ownsTile(6)).toBe(true);
    expect(player.ownsTile(19)).toBe(false);
  });
});
