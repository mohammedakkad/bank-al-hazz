import { Player } from '../../domain/entities/Player';
import { Money } from '../../domain/valueObjects/Money';
import { BOARD_TILES, isBuyableTile, getTilePurchasePrice } from '../../domain/entities/BoardTile';

export type BuyPropertyFailureReason = 'not-a-property' | 'already-owned' | 'insufficient-funds';

export type BuyPropertyOutcome =
  | { readonly success: true; readonly player: Player }
  | { readonly success: false; readonly reason: BuyPropertyFailureReason };

/**
 * نفس نمط rollDiceAndMove: دالة صافية بدون معرفة بالـrepository. الـpresentation layer
 * هي من تستدعيها ثم تحفظ الناتج عبر gameRepository.updatePlayerState() بشكل منفصل.
 *
 * allPlayers مطلوبة (مو فقط buyer) لأن ملكية العقار موزّعة بين اللاعبين أنفسهم
 * (Player.ownedTileIds) وليست حقلاً مركزياً بمستند اللعبة — لازم نفحص كل اللاعبين
 * للتأكد إن حدا ثاني ما يملك نفس العقار أصلاً.
 *
 * Item 3 (إصلاح فجوة حقيقية): كانت هذه الدالة ترفض أي مربع type !== 'property'
 * كلياً — أي إن المطارات وشركات المرافق (isBuyableTile لكن ليست 'property') ما
 * كانت قابلة للشراء إطلاقاً رغم امتلاكها سعراً بالبيانات أحياناً لاحقاً. الآن
 * تشمل أي مربع isBuyableTile، بسعره الفعلي عبر getTilePurchasePrice.
 */
export function buyProperty(
  buyer: Player,
  allPlayers: readonly Player[],
  tileId: number,
): BuyPropertyOutcome {
  const tile = BOARD_TILES.find((candidate) => candidate.id === tileId);
  const price = tile ? getTilePurchasePrice(tile) : null;
  if (!tile || !isBuyableTile(tile) || price === null) {
    return { success: false, reason: 'not-a-property' };
  }

  const isOwnedByAnyone = allPlayers.some((player) => player.ownsTile(tileId));
  if (isOwnedByAnyone) {
    return { success: false, reason: 'already-owned' };
  }

  const priceMoney = Money.of(price);
  if (!buyer.money.isGreaterThanOrEqual(priceMoney)) {
    return { success: false, reason: 'insufficient-funds' };
  }

  const updatedBuyer = buyer.pay(priceMoney).acquireProperty(tileId);
  return { success: true, player: updatedBuyer };
}
