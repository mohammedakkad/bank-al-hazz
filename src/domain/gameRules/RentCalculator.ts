import { Money } from '../valueObjects/Money';
import type { PropertyTile } from '../entities/BoardTile';

export type BuildingLevel = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * level 0 = بدون بناء (rent أساسي)
 * level 1-3 = استراحات (rentPerLevel[0..2])
 * level 4 = جراج (rentPerLevel[3])
 * level 5 = فندق (rentPerLevel[4])
 */
export function calculateRent(tile: PropertyTile, level: BuildingLevel): Money {
  if (level === 0) return Money.of(tile.baseRent);
  const rent = tile.rentPerLevel[level - 1];
  if (rent === undefined) {
    throw new Error(`RentCalculator: no rent defined for level ${level}`);
  }
  return Money.of(rent);
}
