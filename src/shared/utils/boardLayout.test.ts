import { describe, it, expect } from 'vitest';
import {
  TILE_GRID_POSITIONS,
  isCornerTile,
  getTileBoxPercent,
  getTileCenterPercent,
  getTileSide,
  CORNER_SIZE_PERCENT,
  EDGE_WIDTH_PERCENT,
} from './boardLayout';
import { BOARD_TILES } from '../../domain/entities/BoardTile';

describe('boardLayout — مواقع المربعات على الشبكة', () => {
  it('البداية (tile 0) وقوف حر (tile 20) يقعان على زاويتين مختلفتين تماماً', () => {
    const start = TILE_GRID_POSITIONS.get(0);
    const freeParking = TILE_GRID_POSITIONS.get(20);

    expect(start).toBeDefined();
    expect(freeParking).toBeDefined();
    expect(start).not.toEqual(freeParking);
    expect(start).toEqual({ row: 11, col: 11 });
    expect(freeParking).toEqual({ row: 1, col: 1 });
  });

  it('الزوايا الأربع (0، 10، 20، 30) تقع كل واحدة بموقع شبكي مختلف عن البقية', () => {
    const cornerIds = [0, 10, 20, 30];
    const positions = cornerIds.map((id) => TILE_GRID_POSITIONS.get(id));
    for (const position of positions) expect(position).toBeDefined();
    const uniqueKeys = new Set(positions.map((p) => `${p?.row},${p?.col}`));
    expect(uniqueKeys.size).toBe(4);
    for (const id of cornerIds) expect(isCornerTile(id)).toBe(true);
  });

  it('كل تسمية "زاوية" بالبيانات تطابق موقعها الفعلي على الشبكة', () => {
    const startTile = BOARD_TILES.find((tile) => tile.type === 'start');
    const freeParkingTile = BOARD_TILES.find((tile) => tile.type === 'free-parking');
    expect(startTile?.id).toBe(0);
    expect(freeParkingTile?.id).toBe(20);
    const allPositions = Array.from({ length: 40 }, (_, id) => TILE_GRID_POSITIONS.get(id));
    const allKeys = new Set(allPositions.map((p) => `${p?.row},${p?.col}`));
    expect(allKeys.size).toBe(40);
  });

  /**
   * Item 1 — النسبة 2:1 بين المربع الركني والحافي، مطابقة لقياسات لوحة حقيقية
   * (ركن 1سم×1سم، حافة 1سم×0.5سم). CORNER_SIZE_PERCENT هو بالضبط ما يستخدمه
   * getTileBoxPercent فعلياً وقت التشغيل لكل مربع ركني.
   */
  it('Item 1 — حجم المربع الركني ضعف عرض المربع الحافي بالضبط (نسبة 2:1)', () => {
    expect(CORNER_SIZE_PERCENT).toBeCloseTo(EDGE_WIDTH_PERCENT * 2, 10);
  });

  it('Item 1 — المربعات الركنية مربّعة (عرض=ارتفاع) وحجمها CORNER_SIZE_PERCENT بالضبط', () => {
    for (const cornerId of [0, 10, 20, 30]) {
      const box = getTileBoxPercent(cornerId);
      expect(box.width).toBe(`${CORNER_SIZE_PERCENT}%`);
      expect(box.height).toBe(`${CORNER_SIZE_PERCENT}%`);
    }
  });

  it('Item 1 — عمق المربعات الحافية (البُعد العمودي على المحيط) يساوي حجم الركن دائماً، والعرض على طول المحيط فقط هو النصف', () => {
    // مربع حافي بالصف السفلي (tileId 1..9): العمق = height، يجب يساوي حجم الركن
    const bottomEdgeBox = getTileBoxPercent(5);
    expect(bottomEdgeBox.height).toBe(`${CORNER_SIZE_PERCENT}%`); // العمق ثابت = حجم الركن
    expect(bottomEdgeBox.width).toBe(`${EDGE_WIDTH_PERCENT}%`); // العرض على طول المحيط = نصف الركن

    // مربع حافي بالعمود الأيسر (tileId 11..19): العمق = width هذه المرة
    const leftEdgeBox = getTileBoxPercent(15);
    expect(leftEdgeBox.width).toBe(`${CORNER_SIZE_PERCENT}%`);
    expect(leftEdgeBox.height).toBe(`${EDGE_WIDTH_PERCENT}%`);
  });

  /** Item 2 — أي ضلع يقع عليه كل مربع، مطلوب لتدوير شريط لون المجموعة نحو المركز */
  it('Item 2 — getTileSide يرجع الضلع الصحيح لكل مجموعة مربعات، وnull للزوايا', () => {
    expect(getTileSide(5)).toBe('bottom');
    expect(getTileSide(15)).toBe('left');
    expect(getTileSide(25)).toBe('top');
    expect(getTileSide(35)).toBe('right');
    for (const cornerId of [0, 10, 20, 30]) {
      expect(getTileSide(cornerId)).toBeNull();
    }
  });

  it('getTileBoxPercent: البداية ووقوف حر بزاويتين فيزيائيتين مختلفتين تماماً، بلا أي اعتماد على RTL/LTR', () => {
    const startBox = getTileBoxPercent(0);
    const freeParkingBox = getTileBoxPercent(20);
    expect(startBox).not.toEqual(freeParkingBox);
    expect(freeParkingBox.left).toBe('0%');
    expect(freeParkingBox.top).toBe('0%');
    expect(parseFloat(startBox.left)).toBeCloseTo(100 - CORNER_SIZE_PERCENT, 10);
    expect(parseFloat(startBox.top)).toBeCloseTo(100 - CORNER_SIZE_PERCENT, 10);
  });

  it('getTileCenterPercent: البداية ووقوف حر بمركزين مختلفين تماماً، وهذا بالضبط ما يستهلكه PlayerToken.tsx', () => {
    const startCenter = getTileCenterPercent(0);
    const freeParkingCenter = getTileCenterPercent(20);
    expect(startCenter).not.toBeNull();
    expect(freeParkingCenter).not.toBeNull();
    expect(startCenter).not.toEqual(freeParkingCenter);
    expect(startCenter?.leftPercent).toBeGreaterThan(80);
    expect(startCenter?.topPercent).toBeGreaterThan(80);
    expect(freeParkingCenter?.leftPercent).toBeLessThan(20);
    expect(freeParkingCenter?.topPercent).toBeLessThan(20);
  });

  it('getTileBoxPercent/getTileCenterPercent لكل الـ40 مربع بلا تضارب أو تداخل', () => {
    const allCenters = Array.from({ length: 40 }, (_, id) => getTileCenterPercent(id));
    for (const center of allCenters) expect(center).not.toBeNull();
    const uniqueCenters = new Set(allCenters.map((c) => `${c?.leftPercent},${c?.topPercent}`));
    expect(uniqueCenters.size).toBe(40);
  });
});
