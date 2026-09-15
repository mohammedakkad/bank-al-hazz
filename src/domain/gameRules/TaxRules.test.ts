import { describe, it, expect } from 'vitest';
import { calculateTaxAmount } from './TaxRules';
import { BOARD_TILES } from '../entities/BoardTile';

describe('calculateTaxAmount', () => {
  it('ضريبة الدخل (مربع 4) = 200', () => {
    const tile = BOARD_TILES.find((t) => t.id === 4);
    expect(tile).toBeDefined();
    if (tile && tile.type !== 'property') expect(calculateTaxAmount(tile)).toBe(200);
  });

  it('ضريبة الثروة (مربع 38) = 100', () => {
    const tile = BOARD_TILES.find((t) => t.id === 38);
    expect(tile).toBeDefined();
    if (tile && tile.type !== 'property') expect(calculateTaxAmount(tile)).toBe(100);
  });

  it('مربع غير ضريبي يرجع صفراً', () => {
    const startTile = BOARD_TILES.find((t) => t.id === 0);
    expect(startTile).toBeDefined();
    if (startTile && startTile.type !== 'property') expect(calculateTaxAmount(startTile)).toBe(0);
  });
});
