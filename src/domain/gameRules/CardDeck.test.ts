import { describe, it, expect } from 'vitest';
import { CHANCE_DECK, COMMUNITY_CHEST_DECK } from '../entities/Card';
import {
  createInitialDeckState,
  drawCard,
  returnGetOutOfJailFreeCard,
  holdsGetOutOfJailFree,
} from './CardDeck';

describe('CardDeck', () => {
  it('الحالة الابتدائية تحتوي كل الـ16 بطاقة لكل رزمة، وبدون أي حامل بطاقة اخرج-من-السجن', () => {
    const state = createInitialDeckState();
    expect(state.chanceOrder).toHaveLength(16);
    expect(state.communityOrder).toHaveLength(16);
    expect(state.heldByPlayerId).toEqual({ chance: null, community: null });
  });

  it('سحب بطاقة عادية يفرغ القمة ويضيفها لأسفل الرزمة بنفس الترتيب', () => {
    const state = createInitialDeckState();
    const topId = state.chanceOrder[0]!;
    const secondId = state.chanceOrder[1]!;

    // البطاقة الأولى بالرزمة الرسمية هي 'chance-01' (تقدّم للبداية) — ليست get-out-of-jail
    const { card, deckState } = drawCard(state, 'chance', 'p1');

    expect(card.id).toBe(topId);
    expect(deckState.chanceOrder[0]).toBe(secondId);
    expect(deckState.chanceOrder.at(-1)).toBe(topId);
    expect(deckState.chanceOrder).toHaveLength(16); // ما ضاعت ولا بطاقة
  });

  it('سحب بطاقة "اخرج من السجن مجاناً" لا ترجع فوراً للرزمة — تُحفَظ عند اللاعب', () => {
    // نبني حالة يدوية تكون فيها 'chance-06' (اخرج من السجن) على القمة
    const state = createInitialDeckState();
    const reordered = {
      ...state,
      chanceOrder: ['chance-06', ...state.chanceOrder.filter((id) => id !== 'chance-06')],
    };

    const { card, deckState } = drawCard(reordered, 'chance', 'p1');

    expect(card.effect.kind).toBe('get-out-of-jail-free');
    expect(deckState.chanceOrder).toHaveLength(15); // خرجت من الرزمة مؤقتاً
    expect(deckState.chanceOrder).not.toContain('chance-06');
    expect(deckState.heldByPlayerId.chance).toBe('p1');
    expect(holdsGetOutOfJailFree(deckState, 'p1')).toBe('chance');
    expect(holdsGetOutOfJailFree(deckState, 'p2')).toBeNull();
  });

  it('returnGetOutOfJailFreeCard يعيد البطاقة لأسفل رزمتها ويصفّر الحامل', () => {
    const state = createInitialDeckState();
    const held = { ...state, chanceOrder: state.chanceOrder.filter((id) => id !== 'chance-06'), heldByPlayerId: { ...state.heldByPlayerId, chance: 'p1' } };

    const returned = returnGetOutOfJailFreeCard(held, 'chance');

    expect(returned.chanceOrder.at(-1)).toBe('chance-06');
    expect(returned.chanceOrder).toHaveLength(16);
    expect(returned.heldByPlayerId.chance).toBeNull();
  });

  it('كل بطاقة برزمتيها لها معرّف فريد ونص غير فارغ', () => {
    for (const deck of [CHANCE_DECK, COMMUNITY_CHEST_DECK]) {
      const ids = new Set(deck.map((card) => card.id));
      expect(ids.size).toBe(deck.length);
      for (const card of deck) {
        expect(card.text.length).toBeGreaterThan(0);
      }
    }
  });
});
