import { describe, it, expect } from 'vitest';
import { ownsEntireColorGroup, minBuildLevelInGroup, isEvenBuildAllowed, getColorGroupTileIds } from './ColorGroupRules';
import { Player } from '../entities/Player';
import { Money } from '../valueObjects/Money';

const JERUSALEM_TILE_ID = 6;
const ALEPPO_TILE_ID = 8;
const CAIRO_TILE_ID = 9;

function makePlayer() {
  return Player.create('p1', 'p1', '#E24B4A', Money.of(5000));
}

describe('ColorGroupRules', () => {
  it('getColorGroupTileIds يرجع كل عقارات المجموعة اللونية', () => {
    expect(getColorGroupTileIds('lightblue')).toEqual([JERUSALEM_TILE_ID, ALEPPO_TILE_ID, CAIRO_TILE_ID]);
  });

  it('ownsEntireColorGroup false لو ناقص عقار واحد', () => {
    const player = makePlayer().acquireProperty(JERUSALEM_TILE_ID).acquireProperty(ALEPPO_TILE_ID);
    expect(ownsEntireColorGroup(player, 'lightblue')).toBe(false);
  });

  it('ownsEntireColorGroup true لو يملك كل عقارات المجموعة', () => {
    const player = makePlayer()
      .acquireProperty(JERUSALEM_TILE_ID)
      .acquireProperty(ALEPPO_TILE_ID)
      .acquireProperty(CAIRO_TILE_ID);
    expect(ownsEntireColorGroup(player, 'lightblue')).toBe(true);
  });

  it('minBuildLevelInGroup يرجع أدنى مستوى بناء بين عقارات المجموعة', () => {
    const player = makePlayer()
      .acquireProperty(JERUSALEM_TILE_ID)
      .acquireProperty(ALEPPO_TILE_ID)
      .acquireProperty(CAIRO_TILE_ID)
      .upgradeProperty(JERUSALEM_TILE_ID)
      .upgradeProperty(JERUSALEM_TILE_ID);
    expect(minBuildLevelInGroup(player, 'lightblue')).toBe(0); // حلب والقاهرة لسا صفر
  });

  it('isEvenBuildAllowed false لو العقار أعلى من أدنى مستوى بالمجموعة', () => {
    const player = makePlayer()
      .acquireProperty(JERUSALEM_TILE_ID)
      .acquireProperty(ALEPPO_TILE_ID)
      .acquireProperty(CAIRO_TILE_ID)
      .upgradeProperty(JERUSALEM_TILE_ID);
    expect(isEvenBuildAllowed(player, JERUSALEM_TILE_ID, 'lightblue')).toBe(false);
    expect(isEvenBuildAllowed(player, ALEPPO_TILE_ID, 'lightblue')).toBe(true);
  });
});
