import { describe, it, expect } from 'vitest';
import { buildOnProperty } from './BuildOnPropertyUseCase';
import { Player } from '../../domain/entities/Player';
import { Money } from '../../domain/valueObjects/Money';

const JERUSALEM_TILE_ID = 6; // property, buildCost: 50
const START_TILE_ID = 0; // non-property

function makePlayer(id: string, money = 1200) {
  return Player.create(id, id, '#E24B4A', Money.of(money));
}

describe('buildOnProperty', () => {
  it('ينجح البناء ويخصم التكلفة ويرفع المستوى', () => {
    const player = makePlayer('p1').acquireProperty(JERUSALEM_TILE_ID);
    const result = buildOnProperty(player, JERUSALEM_TILE_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.player.buildLevels[JERUSALEM_TILE_ID]).toBe(1);
      expect(result.player.money.value).toBe(1150); // 1200 - 50
    }
  });

  it('يفشل لو المربع مش عقاراً', () => {
    const player = makePlayer('p1');
    const result = buildOnProperty(player, START_TILE_ID);
    expect(result).toEqual({ success: false, reason: 'not-a-property' });
  });

  it('يفشل لو اللاعب لا يملك العقار', () => {
    const player = makePlayer('p1');
    const result = buildOnProperty(player, JERUSALEM_TILE_ID);
    expect(result).toEqual({ success: false, reason: 'not-owned' });
  });

  it('يفشل لو العقار وصل الحد الأقصى للبناء', () => {
    let player = makePlayer('p1', 10000).acquireProperty(JERUSALEM_TILE_ID);
    for (let i = 0; i < 5; i++) {
      const result = buildOnProperty(player, JERUSALEM_TILE_ID);
      if (result.success) player = result.player;
    }
    const finalAttempt = buildOnProperty(player, JERUSALEM_TILE_ID);
    expect(finalAttempt).toEqual({ success: false, reason: 'max-level' });
  });

  it('يفشل لو الرصيد غير كافٍ لتكلفة البناء', () => {
    const player = makePlayer('p1', 10).acquireProperty(JERUSALEM_TILE_ID);
    const result = buildOnProperty(player, JERUSALEM_TILE_ID);
    expect(result).toEqual({ success: false, reason: 'insufficient-funds' });
  });
});
