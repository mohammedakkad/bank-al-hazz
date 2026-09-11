import { Player } from '../../domain/entities/Player';
import { Money } from '../../domain/valueObjects/Money';
import { BOARD_TILES } from '../../domain/entities/BoardTile';
import { calculateRent, type BuildingLevel } from '../../domain/gameRules/RentCalculator';

export type PayRentFailureReason = 'not-a-property' | 'unowned' | 'self-rent';

export type PayRentOutcome =
  | { readonly success: true; readonly payer: Player; readonly owner: Player; readonly rentAmount: Money }
  | { readonly success: false; readonly reason: PayRentFailureReason };

/**
 * ملاحظة مهمة: Player.receive() موجودة أصلاً بالـentity (مستخدمة حالياً بـ
 * rollDiceAndMove لمكافأة المرور بالبداية) — لا حاجة لأي إضافة جديدة على Player
 * لتحصيل الإيجار، خلافاً لما افترضته مهمة هذه المرحلة.
 */
export function payRent(
  payer: Player,
  allPlayers: readonly Player[],
  tileId: number,
): PayRentOutcome {
  const tile = BOARD_TILES.find((candidate) => candidate.id === tileId);
  if (!tile || tile.type !== 'property') {
    return { success: false, reason: 'not-a-property' };
  }

  const owner = allPlayers.find((player) => player.ownsTile(tileId));
  if (!owner) {
    return { success: false, reason: 'unowned' };
  }
  if (owner.id === payer.id) {
    return { success: false, reason: 'self-rent' };
  }

  const buildLevel = (owner.buildLevels[tileId] ?? 0) as BuildingLevel;
  const rentAmount = calculateRent(tile, buildLevel);

  const updatedPayer = payer.pay(rentAmount);
  const updatedOwner = owner.receive(rentAmount);

  return { success: true, payer: updatedPayer, owner: updatedOwner, rentAmount };
}
