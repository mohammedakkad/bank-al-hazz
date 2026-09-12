import type { Player } from '../entities/Player';
import { BOARD_TILES, type PropertyTile } from '../entities/BoardTile';

/** كل معرّفات العقارات (tile ids) اللي تنتمي لنفس المجموعة اللونية */
export function getColorGroupTileIds(colorGroup: string): readonly number[] {
  return BOARD_TILES.filter(
    (tile): tile is PropertyTile => tile.type === 'property' && tile.colorGroup === colorGroup,
  ).map((tile) => tile.id);
}

/** هل يملك هذا اللاعب كل عقارات المجموعة اللونية بالكامل؟ (شرط مضاعفة الإيجار وشرط البدء بالبناء) */
export function ownsEntireColorGroup(player: Player, colorGroup: string): boolean {
  const groupTileIds = getColorGroupTileIds(colorGroup);
  return groupTileIds.length > 0 && groupTileIds.every((id) => player.ownsTile(id));
}

/** أقل مستوى بناء حالي بين كل عقارات نفس المجموعة عند هذا اللاعب — أساس قاعدة "البناء المتساوي" */
export function minBuildLevelInGroup(player: Player, colorGroup: string): number {
  const groupTileIds = getColorGroupTileIds(colorGroup);
  if (groupTileIds.length === 0) return 0;
  return Math.min(...groupTileIds.map((id) => player.buildLevels[id] ?? 0));
}

/**
 * قاعدة "البناء المتساوي": ما تقدر تبني بمستوى أعلى بعقار لحد ما يوصل باقي عقارات
 * نفس المجموعة لنفس المستوى — يعني مسموح بس تبني على العقار (أو العقارات) اللي حاليًا
 * بأدنى مستوى بالمجموعة.
 */
export function isEvenBuildAllowed(player: Player, tileId: number, colorGroup: string): boolean {
  const currentLevel = player.buildLevels[tileId] ?? 0;
  return currentLevel <= minBuildLevelInGroup(player, colorGroup);
}
