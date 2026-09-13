import { describe, it, expect } from 'vitest';
import {
  BOARD_GRID_SIZE,
  TILE_GRID_POSITIONS,
  isCornerTile,
  getTileBoxPercent,
  getTileCenterPercent,
} from './boardLayout';
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

  /**
   * Bug 1 (التتبّع الكامل هذه المرة): الدالتان أدناه (getTileBoxPercent وgetTileCenterPercent)
   * هما بالضبط ما يستدعيه Board.tsx وPlayerToken.tsx فعلياً وقت التشغيل — وليس أي
   * جدول إحداثيات آخر قد يوجد بالكود. اختبار هذا المستوى تحديداً (لا الداخلي فقط)
   * يضمن أن المسار الفعلي المستخدَم بالواجهة صحيح، وليس فقط الرياضيات الداخلية.
   * القيم فيزيائية بحتة (left/top%) ولا تعتمد على أي خاصية اتجاهية (direction/dir) —
   * فهي لا يمكن أن "تنعكس" بتغيّر اتجاه الصفحة المحيطة كما كان يحصل بحل CSS Grid السابق.
   */
  it('getTileBoxPercent: البداية بأقصى اليمين الفيزيائي، وقوف حر بأقصى اليسار الفيزيائي — قيم لا تتأثر بأي RTL/LTR', () => {
    const startBox = getTileBoxPercent(0);
    const freeParkingBox = getTileBoxPercent(20);

    expect(startBox).not.toEqual(freeParkingBox);
    expect(startBox.left).toBe(`${(LAST_LINE - 1) * (100 / LAST_LINE)}%`);
    expect(startBox.top).toBe(`${(LAST_LINE - 1) * (100 / LAST_LINE)}%`);
    expect(freeParkingBox.left).toBe('0%');
    expect(freeParkingBox.top).toBe('0%');
  });

  it('getTileCenterPercent: هذا بالضبط ما يستهلكه PlayerToken.tsx فعلياً — البداية ووقوف حر بمركزين مختلفين تماماً', () => {
    const startCenter = getTileCenterPercent(0);
    const freeParkingCenter = getTileCenterPercent(20);

    expect(startCenter).not.toBeNull();
    expect(freeParkingCenter).not.toBeNull();
    expect(startCenter).not.toEqual(freeParkingCenter);

    // لاعب جديد Player.create() موقعه الابتدائي دائماً 0 — يجب يُرسم بالضبط هنا
    expect(startCenter?.leftPercent).toBeGreaterThan(80); // أقصى يمين الشبكة فعلياً
    expect(startCenter?.topPercent).toBeGreaterThan(80);
    expect(freeParkingCenter?.leftPercent).toBeLessThan(20); // أقصى يسار الشبكة فعلياً
    expect(freeParkingCenter?.topPercent).toBeLessThan(20);
  });

  it('getTileBoxPercent/getTileCenterPercent لكل الـ40 مربع بلا تضارب أو تداخل', () => {
    const allCenters = Array.from({ length: 40 }, (_, id) => getTileCenterPercent(id));
    for (const center of allCenters) expect(center).not.toBeNull();
    const uniqueCenters = new Set(allCenters.map((c) => `${c?.leftPercent},${c?.topPercent}`));
    expect(uniqueCenters.size).toBe(40);
  });
});
