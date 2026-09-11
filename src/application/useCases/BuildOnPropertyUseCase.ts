import { Player } from '../../domain/entities/Player';
import { Money } from '../../domain/valueObjects/Money';
import { BOARD_TILES } from '../../domain/entities/BoardTile';

export type BuildFailureReason = 'not-a-property' | 'not-owned' | 'max-level' | 'insufficient-funds';

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
