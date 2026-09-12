import { Money } from '../valueObjects/Money';
import type { PropertyTile } from '../entities/BoardTile';

export type BuildingLevel = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * level 0 = بدون بناء (rent أساسي)
 * level 1-3 = استراحات (rentPerLevel[0..2])
 * level 4 = جراج (rentPerLevel[3])
 * level 5 = فندق (rentPerLevel[4])
 */
/**
 * level 0 = بدون بناء (rent أساسي، يتضاعف لو المالك يملك كل عقارات نفس المجموعة اللونية)
 * level 1-3 = استراحات (rentPerLevel[0..2])
 * level 4 = جراج (rentPerLevel[3])
 * level 5 = فندق (rentPerLevel[4])
 *
 * ownsFullColorGroup: تنطبق فقط على level 0 — قاعدة مونوبولي الأصلية: "the owner may
 * charge double rent for unimproved properties" لو يملك كل عقارات المجموعة. لو فيه بناء
 * أصلًا (level > 0)، الإيجار المبني أعلى أصلًا ولا يتضاعف فوق هيك مرة ثانية.
 */
export function calculateRent(tile: PropertyTile, level: BuildingLevel, ownsFullColorGroup = false): Money {
  if (level === 0) {
    const base = tile.baseRent;
    return Money.of(ownsFullColorGroup ? base * 2 : base);
  }
  const rent = tile.rentPerLevel[level - 1];
  if (rent === undefined) {
    throw new Error(`RentCalculator: no rent defined for level ${level}`);
  }
  return Money.of(rent);
}
