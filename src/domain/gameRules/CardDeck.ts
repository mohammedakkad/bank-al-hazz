import { CHANCE_DECK, COMMUNITY_CHEST_DECK, findCardById, type Card, type DeckType } from '../entities/Card';

/**
 * حالة الرزمتين — مشتركة بين كل اللاعبين، تُحفَظ على مستند اللعبة (إضافي على
 * GameSnapshot، نفس نمط activeAuction بالـPhase B). ترتيب كل رزمة = تسلسل
 * معرّفات البطاقات الحالي (الرأس أول عنصر)، وليس نسخة من نص البطاقات نفسها —
 * البطاقات ثابتة دائماً (CHANCE_DECK/COMMUNITY_CHEST_DECK)، فقط الترتيب يتغيّر.
 */
export interface DeckState {
  readonly chanceOrder: readonly string[];
  readonly communityOrder: readonly string[];
  /** لاعب واحد بحد أقصى بكل لحظة يقدر يحمل بطاقة "اخرج من السجن" لكل رزمة */
  readonly heldByPlayerId: { readonly chance: string | null; readonly community: string | null };
}

export function createInitialDeckState(): DeckState {
  return {
    chanceOrder: CHANCE_DECK.map((card) => card.id),
    communityOrder: COMMUNITY_CHEST_DECK.map((card) => card.id),
    heldByPlayerId: { chance: null, community: null },
  };
}

function orderFor(deckState: DeckState, deckType: DeckType): readonly string[] {
  return deckType === 'chance' ? deckState.chanceOrder : deckState.communityOrder;
}

function withOrder(deckState: DeckState, deckType: DeckType, newOrder: readonly string[]): DeckState {
  return deckType === 'chance'
    ? { ...deckState, chanceOrder: newOrder }
    : { ...deckState, communityOrder: newOrder };
}

export interface DrawResult {
  readonly card: Card;
  readonly deckState: DeckState;
}

/**
 * يسحب البطاقة العلوية ويطبّق سلوك دورة الرزمة الرسمي: ترجع لأسفل الرزمة فوراً،
 * إلا "اخرج من السجن مجاناً" — هذه تُسحب من الرزمة وتُحفَظ عند اللاعب (لا ترجع
 * إلا لما يُستخدم أو يُتبادل، عبر returnGetOutOfJailFreeCard).
 */
export function drawCard(deckState: DeckState, deckType: DeckType, drawingPlayerId: string): DrawResult {
  const order = orderFor(deckState, deckType);
  const topCardId = order[0];
  if (!topCardId) {
    throw new Error(`drawCard: الرزمة ${deckType} فاضية — هذا لا يفترض يصير أبداً بـ16+ بطاقة`);
  }
  const card = findCardById(deckType, topCardId);
  if (!card) {
    throw new Error(`drawCard: بطاقة غير معروفة بمعرّف ${topCardId}`);
  }

  const rest = order.slice(1);
  const isGetOutOfJailFree = card.effect.kind === 'get-out-of-jail-free';
  const newOrder = isGetOutOfJailFree ? rest : [...rest, topCardId];
  let newDeckState = withOrder(deckState, deckType, newOrder);

  if (isGetOutOfJailFree) {
    newDeckState = {
      ...newDeckState,
      heldByPlayerId:
        deckType === 'chance'
          ? { ...newDeckState.heldByPlayerId, chance: drawingPlayerId }
          : { ...newDeckState.heldByPlayerId, community: drawingPlayerId },
    };
  }

  return { card, deckState: newDeckState };
}

/** يُستدعى لما لاعب يستخدم (أو يُفترض مستقبلاً: يبيع/يتبادل) بطاقة اخرج-من-السجن — ترجع لأسفل رزمتها */
export function returnGetOutOfJailFreeCard(deckState: DeckState, deckType: DeckType): DeckState {
  const cardId = deckType === 'chance' ? 'chance-06' : 'community-05';
  const order = orderFor(deckState, deckType);
  const withCardAtBottom = withOrder(deckState, deckType, [...order, cardId]);
  return {
    ...withCardAtBottom,
    heldByPlayerId:
      deckType === 'chance'
        ? { ...withCardAtBottom.heldByPlayerId, chance: null }
        : { ...withCardAtBottom.heldByPlayerId, community: null },
  };
}

export function holdsGetOutOfJailFree(deckState: DeckState, playerId: string): DeckType | null {
  if (deckState.heldByPlayerId.chance === playerId) return 'chance';
  if (deckState.heldByPlayerId.community === playerId) return 'community';
  return null;
}
