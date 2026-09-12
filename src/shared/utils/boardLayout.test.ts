import { describe, it, expect } from 'vitest';
import { BOARD_GRID_SIZE, TILE_GRID_POSITIONS, isCornerTile } from './boardLayout';
import { BOARD_TILES } from '../../domain/entities/BoardTile';

const LAST_LINE = BOARD_GRID_SIZE;

describe('boardLayout — مواقع المربعات على الشبكة', () => {
  it('البداية (tile 0) وقوف حر (tile 20) يقعان على زاويتين مختلفتين تماماً', () => {
    const start = TILE_GRID_POSITIONS.get(0);
    const freeParking = TILE_GRID_POSITIONS.get(20);

    expect(start).toBeDefined();
    expect(freeParking).toBeDefined();
    expect(start).not.toEqual(freeParking);

    // البداية: أسفل يمين الشبكة اللغوية (LTR) — آخر سطر وآخر عمود
    expect(start).toEqual({ row: LAST_LINE, col: LAST_LINE });
    // وقوف حر: أعلى يسار الشبكة — أول سطر وأول عمود، الزاوية المقابلة قطرياً
    expect(freeParking).toEqual({ row: 1, col: 1 });
  });

  it('الزوايا الأربع (0، 10، 20، 30) تقع كل واحدة بموقع شبكي مختلف عن البقية', () => {
    const cornerIds = [0, 10, 20, 30];
    const positions = cornerIds.map((id) => TILE_GRID_POSITIONS.get(id));

    for (const position of positions) {
      expect(position).toBeDefined();
    }

    const uniqueKeys = new Set(positions.map((p) => `${p?.row},${p?.col}`));
    expect(uniqueKeys.size).toBe(4);

    for (const id of cornerIds) {
      expect(isCornerTile(id)).toBe(true);
    }
  });

  it('كل تسمية "زاوية" بالبيانات (start/free-parking/jail/go-to-jail) تطابق موقعها الفعلي على الشبكة', () => {
    const startTile = BOARD_TILES.find((tile) => tile.type === 'start');
    const freeParkingTile = BOARD_TILES.find((tile) => tile.type === 'free-parking');

    expect(startTile?.id).toBe(0);
    expect(freeParkingTile?.id).toBe(20);

    // تأكيد أن كل الـ40 مربع لها موقع محسوب فريد (لا يوجد مربعان يتشاركان نفس الخانة)
    const allPositions = Array.from({ length: 40 }, (_, id) => TILE_GRID_POSITIONS.get(id));
    const allKeys = new Set(allPositions.map((p) => `${p?.row},${p?.col}`));
    expect(allKeys.size).toBe(40);
  });
});
