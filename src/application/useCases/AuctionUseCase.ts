import { Player } from '../../domain/entities/Player';
import { Money } from '../../domain/valueObjects/Money';
import { AuctionState, MIN_BID_INCREMENT } from '../../domain/interfaces/AuctionState';

export type BidFailureReason =
  | 'not-your-turn'
  | 'already-passed'
  | 'bid-too-low'
  | 'insufficient-funds'
  | 'unknown-bidder';

export type BidOutcome =
  | { readonly success: true; readonly auction: AuctionState }
  | { readonly success: false; readonly reason: BidFailureReason };

export type PassFailureReason = 'not-your-turn' | 'already-passed';

export type PassOutcome =
  | { readonly success: true; readonly auction: AuctionState }
  | { readonly success: false; readonly reason: PassFailureReason };

/**
 * يبدأ مزاداً جديداً على عقار. كل اللاعبين (بمن فيهم من تخطّى الشراء) مؤهّلون.
 * الدور يبدأ باللاعب اللي بعد صاحب الدور الأصلي (skippingPlayerId) مباشرة —
 * وليس صاحب الدور نفسه — لإعطاء بقية اللاعبين فرصة يفتحوا المزايدة أول، رغم إن
 * صاحب الدور الأصلي نفسه يقدر يزايد لما يوصله الدور بالتناوب (نفس القاعدة الرسمية).
 */
export function startAuction(
  tileId: number,
  players: readonly Player[],
  skippingPlayerId: string,
): AuctionState {
  const eligiblePlayerIds = players.map((player) => player.id);
  const skippingIndex = eligiblePlayerIds.indexOf(skippingPlayerId);
  const firstTurnIndex = skippingIndex === -1 ? 0 : (skippingIndex + 1) % eligiblePlayerIds.length;
  const firstTurnPlayerId = eligiblePlayerIds[firstTurnIndex] ?? skippingPlayerId;

  return {
    tileId,
    eligiblePlayerIds,
    passedPlayerIds: [],
    currentHighestBid: 0,
    currentHighestBidderId: null,
    turnPlayerId: firstTurnPlayerId,
  };
}

/** يحسب اللاعب المؤهّل التالي بعد index معيّن بالتناوب الدائري، متجاوزاً كل من مرّ فعلاً */
function nextActivePlayerId(
  eligiblePlayerIds: readonly string[],
  passedPlayerIds: readonly string[],
  fromPlayerId: string,
): string {
  const fromIndex = eligiblePlayerIds.indexOf(fromPlayerId);
  const startIndex = fromIndex === -1 ? 0 : fromIndex;

  for (let offset = 1; offset <= eligiblePlayerIds.length; offset++) {
    const candidateIndex = (startIndex + offset) % eligiblePlayerIds.length;
    const candidateId = eligiblePlayerIds[candidateIndex];
    if (candidateId && !passedPlayerIds.includes(candidateId)) {
      return candidateId;
    }
  }
  // ما بقي أي لاعب نشط (نظرياً ما بيصير — isAuctionOver لازم تكون true قبل هيك) —
  // نرجع نفس اللاعب الحالي بدل throw، القرار النهائي بمعرفة نهاية المزاد لـisAuctionOver.
  return fromPlayerId;
}

export function placeBid(
  auction: AuctionState,
  players: readonly Player[],
  bidderId: string,
  bidAmount: number,
): BidOutcome {
  if (auction.turnPlayerId !== bidderId) {
    return { success: false, reason: 'not-your-turn' };
  }
  if (auction.passedPlayerIds.includes(bidderId)) {
    return { success: false, reason: 'already-passed' };
  }

  const bidder = players.find((player) => player.id === bidderId);
  if (!bidder) {
    return { success: false, reason: 'unknown-bidder' };
  }

  const minimumValidBid = auction.currentHighestBid + MIN_BID_INCREMENT;
  if (bidAmount < minimumValidBid) {
    return { success: false, reason: 'bid-too-low' };
  }

  if (!bidder.money.isGreaterThanOrEqual(Money.of(bidAmount))) {
    return { success: false, reason: 'insufficient-funds' };
  }

  const nextTurnPlayerId = nextActivePlayerId(auction.eligiblePlayerIds, auction.passedPlayerIds, bidderId);

  return {
    success: true,
    auction: {
      ...auction,
      currentHighestBid: bidAmount,
      currentHighestBidderId: bidderId,
      turnPlayerId: nextTurnPlayerId,
    },
  };
}

export function passBid(auction: AuctionState, playerId: string): PassOutcome {
  if (auction.turnPlayerId !== playerId) {
    return { success: false, reason: 'not-your-turn' };
  }
  if (auction.passedPlayerIds.includes(playerId)) {
    return { success: false, reason: 'already-passed' };
  }

  const passedPlayerIds = [...auction.passedPlayerIds, playerId];
  const nextTurnPlayerId = nextActivePlayerId(auction.eligiblePlayerIds, passedPlayerIds, playerId);

  return {
    success: true,
    auction: { ...auction, passedPlayerIds, turnPlayerId: nextTurnPlayerId },
  };
}

/**
 * المزاد ينتهي لما يمرّ الجميع ما عدا شخص واحد على الأكثر — سواء كان هذا الشخص
 * الوحيد صاحب أعلى مزايدة (فاز) أو ما حدا زايد إطلاقاً (يبقى العقار بدون مالك).
 */
export function isAuctionOver(auction: AuctionState): boolean {
  const activeCount = auction.eligiblePlayerIds.length - auction.passedPlayerIds.length;
  return activeCount <= 1;
}

/** null = ما حدا زايد (المزاد انتهى بدون بيع) — غير null = معرّف اللاعب الفائز */
export function getAuctionWinnerId(auction: AuctionState): string | null {
  if (!isAuctionOver(auction)) return null;
  return auction.currentHighestBidderId;
}

export type AuctionResolution =
  | { readonly sold: true; readonly winner: Player; readonly amount: number }
  | { readonly sold: false };

/**
 * يحسم مزاداً منتهياً: يخصم المبلغ الفائز من رصيد الفائز وينقل ملكية العقار له
 * (البنك لا كيان له بهذا الكود، فالخصم بدون receive() مقابل — نفس نمط الشراء
 * بالسعر المطبوع أصلاً بـBuyPropertyUseCase). لو ما حدا زايد، العقار يبقى بدون
 * مالك ولا تغيير على أي لاعب.
 */
export function resolveAuction(auction: AuctionState, players: readonly Player[]): AuctionResolution {
  const winnerId = getAuctionWinnerId(auction);
  if (!winnerId) {
    return { sold: false };
  }

  const winner = players.find((player) => player.id === winnerId);
  if (!winner) {
    return { sold: false };
  }

  const updatedWinner = winner.pay(Money.of(auction.currentHighestBid)).acquireProperty(auction.tileId);
  return { sold: true, winner: updatedWinner, amount: auction.currentHighestBid };
}
