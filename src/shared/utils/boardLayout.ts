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
