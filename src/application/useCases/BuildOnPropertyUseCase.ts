import { Player } from '../../domain/entities/Player';
import { Money } from '../../domain/valueObjects/Money';
import { BOARD_TILES } from '../../domain/entities/BoardTile';
import { ownsEntireColorGroup, isEvenBuildAllowed } from '../../domain/gameRules/ColorGroupRules';

export type BuildFailureReason =
  | 'not-a-property'
  | 'not-owned'
  | 'incomplete-color-group'
  | 'uneven-building'
  | 'max-level'
  | 'insufficient-funds';

export type BuildOutcome =
  | { readonly success: true; readonly player: Player }
  | { readonly success: false; readonly reason: BuildFailureReason };

const MAX_BUILD_LEVEL = 5;

export function buildOnProperty(player: Player, tileId: number): BuildOutcome {
  const tile = BOARD_TILES.find((candidate) => candidate.id === tileId);
  if (!tile || tile.type !== 'property') {
    return { success: false, reason: 'not-a-property' };
  }

  if (!player.ownsTile(tileId)) {
    return { success: false, reason: 'not-owned' };
  }

  // قاعدة مونوبولي الأساسية: ما تقدر تبني إلا بامتلاك كل عقارات نفس المجموعة اللونية
  if (!ownsEntireColorGroup(player, tile.colorGroup)) {
    return { success: false, reason: 'incomplete-color-group' };
  }

  // قاعدة "البناء المتساوي": ما تقدر ترفع مستوى عقار قبل ما يوصل باقي المجموعة لنفس المستوى
  if (!isEvenBuildAllowed(player, tileId, tile.colorGroup)) {
    return { success: false, reason: 'uneven-building' };
  }

  const currentLevel = player.buildLevels[tileId] ?? 0;
  if (currentLevel >= MAX_BUILD_LEVEL) {
    return { success: false, reason: 'max-level' };
  }

  const cost = Money.of(tile.buildCost);
  if (!player.money.isGreaterThanOrEqual(cost)) {
    return { success: false, reason: 'insufficient-funds' };
  }

  const updatedPlayer = player.pay(cost).upgradeProperty(tileId);
  return { success: true, player: updatedPlayer };
}
