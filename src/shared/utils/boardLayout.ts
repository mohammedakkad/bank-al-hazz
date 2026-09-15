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

export type BoardSide = 'top' | 'bottom' | 'left' | 'right';

/**
 * Item 2 — أي ضلع من أضلاع اللوحة الأربعة يقع عليه هذا المربع (مطلوب لتدوير
 * شريط لون المجموعة ليواجه مركز اللوحة دائماً). المربعات الركنية (0/10/20/30)
 * ترجع null لأنها ليست عقارات أصلاً (بلا شريط لون).
 */
export function getTileSide(tileId: number): BoardSide | null {
  if (isCornerTile(tileId)) return null;
  if (tileId >= 1 && tileId <= 9) return 'bottom';
  if (tileId >= 11 && tileId <= 19) return 'left';
  if (tileId >= 21 && tileId <= 29) return 'top';
  if (tileId >= 31 && tileId <= 39) return 'right';
  return null;
}

/**
 * Item 1 — نسبة 2:1 بين المربعات الركنية والحافية، مأخوذة من قياسات لوحة حقيقية:
 * الركن 1سم×1سم (مربّع)، والحافة 1سم×0.5سم (بعرض نصف الركن على طول المحيط، لكن
 * بنفس عمق الركن باتجاه المركز — هذا بالضبط كيف تبني لوحة مونوبولي حقيقية:
 * "عمق" الحلقة المحيطية ثابت حول اللوحة كلها (يساوي ضلع المربع الركني)، والمربعات
 * الحافية أضيق بس بنفس العمق، مش مربّعات أصغر بكل الاتجاهات.
 *
 * بالوحدات: كل جانب = ركن(2) + 9×حافة(1) + ركن(2) = 13 وحدة إجمالاً في كل بُعد.
 * CORNER_UNITS=2 يعطي عمقاً ثابتاً لكل المربعات (بما فيها الحافية) يساوي حجم
 * الركن الكامل، بينما EDGE_UNITS=1 (نصف CORNER_UNITS) هو فقط عرض الحافة على
 * طول المحيط — يطابق النسبة 2:1 المطلوبة حرفياً.
 */
const CORNER_UNITS = 2;
const EDGE_UNITS = 1;
const TOTAL_UNITS = CORNER_UNITS * 2 + EDGE_UNITS * (BOARD_GRID_SIZE - 2);
const UNIT_PERCENT = 100 / TOTAL_UNITS;

/** حجم الركن (=عمق الحلقة المحيطية الموحَّد لكل اللوحة) كنسبة مئوية */
export const CORNER_SIZE_PERCENT = CORNER_UNITS * UNIT_PERCENT;
/** عرض المربع الحافي على طول المحيط (نصف حجم الركن بالضبط) كنسبة مئوية */
export const EDGE_WIDTH_PERCENT = EDGE_UNITS * UNIT_PERCENT;

/** الإزاحة التراكمية لخانة رقمها slot (1..11) على طول محور المحيط */
function perimeterOffsetPercent(slot: number): number {
  if (slot <= 1) return 0;
  if (slot >= BOARD_GRID_SIZE) return CORNER_SIZE_PERCENT + (BOARD_GRID_SIZE - 2) * EDGE_WIDTH_PERCENT;
  return CORNER_SIZE_PERCENT + (slot - 2) * EDGE_WIDTH_PERCENT;
}

function perimeterSizePercent(slot: number): number {
  return slot <= 1 || slot >= BOARD_GRID_SIZE ? CORNER_SIZE_PERCENT : EDGE_WIDTH_PERCENT;
}

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
 * المصدر الوحيد (single source of truth) لأي تموضع بصري على اللوحة — كل مستهلك
 * (Board.tsx، PlayerToken.tsx، CenterPanel.tsx) يجب يستدعي هاتين الدالتين بدل
 * حساب أي إحداثيات بنفسه. left/top فيزيائيتان بحتتان (لا تتأثران بـdirection
 * إطلاقاً)، ونسبة الركن:الحافة مضبوطة 2:1 فعلياً (Item 1) عبر perimeterOffset/SizePercent.
 */
export function getTileBoxPercent(tileId: number): TileBoxPercent {
  const position = TILE_GRID_POSITIONS.get(tileId);
  if (!position) {
    throw new Error(`getTileBoxPercent: لا يوجد موضع محسوب لمربع رقم ${tileId}`);
  }
  const { row, col } = position;

  if (row === 1 || row === BOARD_GRID_SIZE) {
    // صف علوي أو سفلي (يشمل الزوايا): العمق ثابت = حجم الركن، والعرض يتبع العمود
    return {
      top: `${row === 1 ? 0 : 100 - CORNER_SIZE_PERCENT}%`,
      height: `${CORNER_SIZE_PERCENT}%`,
      left: `${perimeterOffsetPercent(col)}%`,
      width: `${perimeterSizePercent(col)}%`,
    };
  }

  // عمود يسار أو يمين (بدون الزوايا، لأنها اتغطّت أعلاه): العمق ثابت = حجم الركن، والطول يتبع الصف
  return {
    left: `${col === 1 ? 0 : 100 - CORNER_SIZE_PERCENT}%`,
    width: `${CORNER_SIZE_PERCENT}%`,
    top: `${perimeterOffsetPercent(row)}%`,
    height: `${perimeterSizePercent(row)}%`,
  };
}

export function getTileCenterPercent(tileId: number): TileCenterPercent | null {
  if (!TILE_GRID_POSITIONS.has(tileId)) return null;
  const box = getTileBoxPercent(tileId);
  return {
    leftPercent: parseFloat(box.left) + parseFloat(box.width) / 2,
    topPercent: parseFloat(box.top) + parseFloat(box.height) / 2,
  };
}
