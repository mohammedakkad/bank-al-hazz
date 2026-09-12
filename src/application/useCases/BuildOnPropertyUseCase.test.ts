import { describe, it, expect } from 'vitest';
import { buildOnProperty } from './BuildOnPropertyUseCase';
import { Player } from '../../domain/entities/Player';
import { Money } from '../../domain/valueObjects/Money';

// مجموعة lightblue كاملة (3 عقارات): القدس (6)، حلب (8)، القاهرة (9)
const JERUSALEM_TILE_ID = 6;
const ALEPPO_TILE_ID = 8;
const CAIRO_TILE_ID = 9;
const LIGHTBLUE_GROUP = [JERUSALEM_TILE_ID, ALEPPO_TILE_ID, CAIRO_TILE_ID];

// مجموعة brown كاملة (تيلين فقط): دمشق (1)، بيروت (3) — لاختبار مجموعة بحجم 2
const DAMASCUS_TILE_ID = 1;
const BEIRUT_TILE_ID = 3;

const START_TILE_ID = 0; // non-property

function makePlayer(id: string, money = 5000) {
  return Player.create(id, id, '#E24B4A', Money.of(money));
}

function acquireGroup(player: Player, tileIds: readonly number[]): Player {
  return tileIds.reduce((acc, id) => acc.acquireProperty(id), player);
}

describe('buildOnProperty', () => {
  it('ينجح البناء ويخصم التكلفة ويرفع المستوى — بشرط امتلاك المجموعة كاملة', () => {
    const player = acquireGroup(makePlayer('p1'), LIGHTBLUE_GROUP);
    const result = buildOnProperty(player, JERUSALEM_TILE_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.player.buildLevels[JERUSALEM_TILE_ID]).toBe(1);
      expect(result.player.money.value).toBe(4950); // 5000 - 50
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

  it('يفشل لو اللاعب يملك عقاراً واحداً بس من المجموعة (مو كل المجموعة)', () => {
    const player = makePlayer('p1').acquireProperty(JERUSALEM_TILE_ID);
    const result = buildOnProperty(player, JERUSALEM_TILE_ID);
    expect(result).toEqual({ success: false, reason: 'incomplete-color-group' });
  });

  it('يفشل لو يملك عقارين من ثلاثة بالمجموعة', () => {
    const player = makePlayer('p1').acquireProperty(JERUSALEM_TILE_ID).acquireProperty(ALEPPO_TILE_ID);
    const result = buildOnProperty(player, JERUSALEM_TILE_ID);
    expect(result).toEqual({ success: false, reason: 'incomplete-color-group' });
  });

  it('ينجح لو يملك مجموعة من عقارين بس (brown) بالكامل', () => {
    const player = acquireGroup(makePlayer('p1'), [DAMASCUS_TILE_ID, BEIRUT_TILE_ID]);
    const result = buildOnProperty(player, DAMASCUS_TILE_ID);
    expect(result.success).toBe(true);
  });

  it('قاعدة البناء المتساوي: يفشل رفع عقار لمستوى 2 قبل ما باقي المجموعة توصل مستوى 1', () => {
    let player = acquireGroup(makePlayer('p1'), LIGHTBLUE_GROUP);
    const first = buildOnProperty(player, JERUSALEM_TILE_ID); // القدس → مستوى 1
    expect(first.success).toBe(true);
    if (first.success) player = first.player;

    // محاولة رفع القدس لمستوى 2 قبل ما حلب/القاهرة توصل مستوى 1 → يجب أن تُرفض
    const second = buildOnProperty(player, JERUSALEM_TILE_ID);
    expect(second).toEqual({ success: false, reason: 'uneven-building' });
  });

  it('قاعدة البناء المتساوي: يسمح بالبناء على عقار ثانٍ بالمجموعة بمستوى أدنى', () => {
    let player = acquireGroup(makePlayer('p1'), LIGHTBLUE_GROUP);
    const first = buildOnProperty(player, JERUSALEM_TILE_ID);
    if (first.success) player = first.player;

    const second = buildOnProperty(player, ALEPPO_TILE_ID); // حلب لسا مستوى 0 → مسموح
    expect(second.success).toBe(true);
  });

  it('قاعدة البناء المتساوي: بعد ما توصل كل المجموعة لمستوى 1، يسمح بالصف الثاني', () => {
    let player = acquireGroup(makePlayer('p1'), LIGHTBLUE_GROUP);
    for (const tileId of LIGHTBLUE_GROUP) {
      const result = buildOnProperty(player, tileId);
      expect(result.success).toBe(true);
      if (result.success) player = result.player;
    }
    // كل المجموعة الآن بمستوى 1 — رفع القدس لمستوى 2 يجب أن ينجح الآن
    const secondRow = buildOnProperty(player, JERUSALEM_TILE_ID);
    expect(secondRow.success).toBe(true);
    if (secondRow.success) {
      expect(secondRow.player.buildLevels[JERUSALEM_TILE_ID]).toBe(2);
    }
  });

  it('يفشل لو العقار وصل الحد الأقصى للبناء', () => {
    let player = acquireGroup(makePlayer('p1', 10000), LIGHTBLUE_GROUP);
    // نبني بالتساوي حتى المستوى 5 على كل المجموعة قبل الوصول للحد الأقصى بعقار واحد
    for (let level = 0; level < 5; level++) {
      for (const tileId of LIGHTBLUE_GROUP) {
        const result = buildOnProperty(player, tileId);
        if (result.success) player = result.player;
      }
    }
    const finalAttempt = buildOnProperty(player, JERUSALEM_TILE_ID);
    expect(finalAttempt).toEqual({ success: false, reason: 'max-level' });
  });

  it('يفشل لو الرصيد غير كافٍ لتكلفة البناء', () => {
    const player = acquireGroup(makePlayer('p1', 10), LIGHTBLUE_GROUP);
    const result = buildOnProperty(player, JERUSALEM_TILE_ID);
    expect(result).toEqual({ success: false, reason: 'insufficient-funds' });
  });
});
