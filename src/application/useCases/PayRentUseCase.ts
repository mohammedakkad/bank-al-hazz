import { Player } from '../../domain/entities/Player';
import { Money } from '../../domain/valueObjects/Money';
import { BOARD_TILES, isBuyableTile } from '../../domain/entities/BoardTile';
import { calculateRent, type BuildingLevel } from '../../domain/gameRules/RentCalculator';
import { ownsEntireColorGroup } from '../../domain/gameRules/ColorGroupRules';
import { calculateAirportRent } from '../../domain/gameRules/AirportRules';
import { calculateUtilityRent } from '../../domain/gameRules/UtilityRules';

export type PayRentFailureReason = 'not-a-property' | 'unowned' | 'self-rent';

export type PayRentOutcome =
  | { readonly success: true; readonly payer: Player; readonly owner: Player; readonly rentAmount: Money }
  | { readonly success: false; readonly reason: PayRentFailureReason };

/**
 * ملاحظة مهمة: Player.receive() موجودة أصلاً بالـentity (مستخدمة حالياً بـ
 * rollDiceAndMove لمكافأة المرور بالبداية) — لا حاجة لأي إضافة جديدة على Player
 * لتحصيل الإيجار، خلافاً لما افترضته مهمة هذه المرحلة.
 *
 * Item 3 (إصلاح فجوة حقيقية مؤكَّدة): كانت هذه الدالة ترفض أي مربع type !== 'property'
 * — أي إن الهبوط على مطار أو شركة مرافق مملوكة لغيرك لم يكن يُحصِّل أي إيجار
 * إطلاقاً (تحقّقنا من سجل أحداث حقيقي). الآن تشمل الحالتين بقاعدتيهما الرسميتين
 * المختلفتين تماماً عن العقارات العادية: المطار يتضاعف حسب عدد المطارات المملوكة
 * لنفس اللاعب (لا علاقة له بمجموعات الألوان)، والمرفق مضاعف لمجموع النرد الحالي
 * (diceTotal) — لذلك تتطلّب الوسيط الإضافي الاختياري diceTotal، مطلوب فقط لحالة
 * المرافق (يُهمَل تماماً لأي مربع آخر).
 */
export function payRent(
  payer: Player,
  allPlayers: readonly Player[],
  tileId: number,
  diceTotal?: number,
): PayRentOutcome {
  const tile = BOARD_TILES.find((candidate) => candidate.id === tileId);
  if (!tile || !isBuyableTile(tile)) {
    return { success: false, reason: 'not-a-property' };
  }

  const owner = allPlayers.find((player) => player.ownsTile(tileId));
  if (!owner) {
    return { success: false, reason: 'unowned' };
  }
  if (owner.id === payer.id) {
    return { success: false, reason: 'self-rent' };
  }

  let rentAmount: Money;
  if (tile.type === 'airport') {
    const ownedAirportCount = BOARD_TILES.filter((t) => t.type === 'airport' && owner.ownsTile(t.id)).length;
    rentAmount = Money.of(calculateAirportRent(ownedAirportCount));
  } else if (tile.type === 'utility') {
    const ownedUtilityCount = BOARD_TILES.filter((t) => t.type === 'utility' && owner.ownsTile(t.id)).length;
    rentAmount = Money.of(calculateUtilityRent(diceTotal ?? 0, ownedUtilityCount));
  } else if (tile.type === 'property') {
    const buildLevel = (owner.buildLevels[tileId] ?? 0) as BuildingLevel;
    const ownsFullColorGroup = ownsEntireColorGroup(owner, tile.colorGroup);
    rentAmount = calculateRent(tile, buildLevel, ownsFullColorGroup);
  } else {
    // isBuyableTile فوق ضمنت وصولنا هون فقط لعقار/مطار/مرفق — أي نوع آخر يوصل هون يعتبر خطأ منطقي
    return { success: false, reason: 'not-a-property' };
  }

  const updatedPayer = payer.pay(rentAmount);
  const updatedOwner = owner.receive(rentAmount);

  return { success: true, payer: updatedPayer, owner: updatedOwner, rentAmount };
}
