export const BOARD_GRID_SIZE = 11;
const LAST_LINE = BOARD_GRID_SIZE;
const TILES_PER_SIDE = 9;

export interface TileGridPosition {
  readonly row: number;
  readonly col: number;
}

function computeTileGridPosition(tileId: number): TileGridPosition {
  if (tileId === 0) return { row: LAST_LINE, col: LAST_LINE };
  if (tileId <= TILES_PER_SIDE) return { row: LAST_LINE, col: LAST_LINE - tileId };
  if (tileId === 10) return { row: LAST_LINE, col: 1 };
  if (tileId <= 19) return { row: LAST_LINE - (tileId - 10), col: 1 };
  if (tileId === 20) return { row: 1, col: 1 };
  if (tileId <= 29) return { row: 1, col: tileId - 19 };
  if (tileId === 30) return { row: 1, col: LAST_LINE };
  return { row: tileId - 29, col: LAST_LINE };
}

/**
 * TILE_GRID_POSITIONS محسوبة مرة واحدة فقط عند تحميل الموديول، وليس داخل الكومبوننت.
 * البيانات ثابتة (40 مربع لا تتغير أبداً بعد بناء اللعبة)، فإعادة حسابها كل render
 * تكلفة بدون أي فائدة.
 */
export const TILE_GRID_POSITIONS: ReadonlyMap<number, TileGridPosition> = new Map(
  Array.from({ length: 40 }, (_, tileId) => [tileId, computeTileGridPosition(tileId)]),
);

export function isCornerTile(tileId: number): boolean {
  return tileId === 0 || tileId === 10 || tileId === 20 || tileId === 30;
}

/** حجم كل خانة كنسبة مئوية من حاوية اللوحة (100 ÷ 11 خانة) */
export const CELL_PERCENT = 100 / BOARD_GRID_SIZE;

export interface TileBoxPercent {
  readonly left: string;
  readonly top: string;
  readonly width: string;
  readonly height: string;
}

export interface TileCenterPercent {
  readonly leftPercent: number;
  readonly topPercent: number;
}

/**
 * Bug 1 (السبب الفعلي المؤكَّد بعد تتبّع كامل): كانت هناك دالة تحويل واحدة فقط
 * (computeTileGridPosition) فعلاً — لا يوجد جدول إحداثيات مكرَّر بالكود. لكن كل
 * المستهلكين (Board.tsx لرسم المربعات، PlayerToken.tsx لرسم الرموز) كانوا
 * يستخدمون هذه الإحداثيات مباشرة كأرقام خطوط CSS Grid صريحة (`gridColumn: N`)،
 * وأرقام خطوط Grid الصريحة تُفسَّر نسبة لحافة "البداية المنطقية" حسب اتجاه
 * الحاوية (direction) — وهذا المشروع RTL بالكامل. محاولة إصلاح سابقة عزلت حاوية
 * اللوحة بـdir="ltr" لتثبيت هذا الاتجاه، لكنها بقيت تعتمد على استثناء اتجاهي هش
 * (dir صريح مخالف لبقية الصفحة) بدل إزالة الاعتماد على الاتجاه نهائياً — ومن هنا
 * احتمال تكرار نفس العرض الخاطئ.
 *
 * الإصلاح الجذري هذه المرة: التحويل النهائي لموضع فعلي يعتمد فقط على خاصيتي
 * `left`/`top` الفيزيائيتين (وليس أي خاصية Grid أو logical property) — وهاتان
 * الخاصيتان لا تتأثران بـdirection إطلاقاً تحت أي ظرف بمواصفات CSS، فيُقفَل الباب
 * على هذا الصنف من الأخطاء نهائياً بدل الاعتماد على استثناء قابل للانكسار مرة أخرى.
 *
 * هذه الدالتان (getTileBoxPercent وgetTileCenterPercent) هما المصدر الوحيد
 * (single source of truth) لأي تموضع بصري على اللوحة — كل مستهلك (حالياً
 * Board.tsx وPlayerToken.tsx، وأي مستهلك مستقبلي) يجب يستدعيهما بدل حساب أي
 * إحداثيات بنفسه.
 */
export function getTileBoxPercent(tileId: number): TileBoxPercent {
  const position = TILE_GRID_POSITIONS.get(tileId);
  if (!position) {
    throw new Error(`getTileBoxPercent: لا يوجد موضع محسوب لمربع رقم ${tileId}`);
  }
  return {
    left: `${(position.col - 1) * CELL_PERCENT}%`,
    top: `${(position.row - 1) * CELL_PERCENT}%`,
    width: `${CELL_PERCENT}%`,
    height: `${CELL_PERCENT}%`,
  };
}

export function getTileCenterPercent(tileId: number): TileCenterPercent | null {
  const position = TILE_GRID_POSITIONS.get(tileId);
  if (!position) return null;
  return {
    leftPercent: (position.col - 1) * CELL_PERCENT + CELL_PERCENT / 2,
    topPercent: (position.row - 1) * CELL_PERCENT + CELL_PERCENT / 2,
  };
}
