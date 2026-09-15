import type { Player } from '../entities/Player';
import type { AuctionState } from './AuctionState';
import type { DeckState } from '../gameRules/CardDeck';

/** Bug 6 — يُرمى من confirmPlayerColor لما لاعب آخر يسبق بنفس اللون بمعاملة متزامنة */
export class ColorAlreadyTakenError extends Error {
  constructor(color: string) {
    super(`اللون ${color} تم اختياره للتو من لاعب آخر`);
    this.name = 'ColorAlreadyTakenError';
  }
}

export interface GameSnapshot {
  readonly gameId: string;
  readonly status: 'lobby' | 'in-progress' | 'finished';
  readonly currentPlayerId: string | null;
  readonly turnNumber: number;
  readonly players: readonly Player[];
  /** إضافة Phase B — مزاد جارٍ حالياً (null لو ما في مزاد مفتوح) */
  readonly activeAuction: AuctionState | null;
  /** إضافة Bug4/بطاقات — ترتيب رزمتي فرصة/صندوق المجتمع الحالي + حامل بطاقة اخرج-من-السجن إن وجد */
  readonly deckState: DeckState;
}

/**
 * سجل أحداث اللعبة (Phase 4) — نوع اتحادي مميَّز، كل نوع حدث يحمل بياناته الخاصة فقط.
 * التنسيق لنص عربي قابل للعرض يصير بدالة منفصلة (formatLogEntry) وليس هنا —
 * هذا الملف يوصف "ماذا حدث"، وليس "كيف يُعرض".
 */
export type GameLogEntry =
  | { readonly type: 'dice-rolled'; readonly playerId: string; readonly playerNickname: string; readonly die1: number; readonly die2: number; readonly total: number }
  | { readonly type: 'player-moved'; readonly playerId: string; readonly playerNickname: string; readonly tileId: number; readonly tileName: string; readonly collectedGoBonus?: boolean }
  | { readonly type: 'property-bought'; readonly playerId: string; readonly playerNickname: string; readonly tileId: number; readonly tileName: string; readonly price: number }
  | { readonly type: 'rent-paid'; readonly playerId: string; readonly playerNickname: string; readonly ownerId: string; readonly ownerNickname: string; readonly tileId: number; readonly tileName: string; readonly amount: number }
  /** إضافة Item 3 — ضريبة مدفوعة (كان الهبوط على مربع ضريبة بلا أي أثر سابقاً) */
  | { readonly type: 'tax-paid'; readonly playerId: string; readonly playerNickname: string; readonly tileId: number; readonly tileName: string; readonly amount: number }
  /** إضافة Item 5 — بيع عقار غير مبني للبنك (نصف السعر، حل مؤقّت لحد نظام الرهن الكامل بـPhase C) */
  | { readonly type: 'property-sold'; readonly playerId: string; readonly playerNickname: string; readonly tileId: number; readonly tileName: string; readonly refundAmount: number }
  | { readonly type: 'property-built'; readonly playerId: string; readonly playerNickname: string; readonly tileId: number; readonly tileName: string; readonly newLevel: number }
  /** إضافة Phase B — نتيجة مزاد منتهٍ. winnerId/winnerNickname تكون null لو ما حدا زايد */
  | { readonly type: 'property-auctioned'; readonly tileId: number; readonly tileName: string; readonly winnerId: string | null; readonly winnerNickname: string | null; readonly amount: number }
  /** إضافة Bug4/بطاقات — بطاقة فرصة/صندوق مجتمع تم سحبها وتطبيقها */
  | { readonly type: 'card-drawn'; readonly playerId: string; readonly playerNickname: string; readonly deckType: 'chance' | 'community'; readonly cardText: string };

/**
 * Port (واجهة) وليس implementation.
 * طبقة domain لا تعرف شيئاً عن Firebase — هذا هو مبدأ Dependency Inversion:
 * الطبقات العليا (domain/application) تعتمد على abstraction، وطبقة infrastructure
 * هي من تنفّذ التفاصيل (Firestore تحديداً). هذا يسمح لاحقاً باستبدال Firebase
 * بأي backend آخر دون تغيير أي منطق لعبة.
 */
export interface IGameRepository {
  createGame(hostPlayer: Player): Promise<string>;
  joinGame(gameId: string, player: Player): Promise<void>;

  /**
   * Bug 6 — يحاول تثبيت لون رمز اللاعب بمعاملة compare-and-set: يرفض لو أي لاعب
   * آخر بنفس الغرفة يحمل هذا اللون فعلاً (سواء مؤكَّد أو حتى افتراضي مؤقت) لحظة
   * تنفيذ المعاملة، بغض النظر عن أي قراءة سابقة على العميل — يمنع فوز لاعبين
   * بنفس اللون بسباق توقيت (كلاهما يضغط بنفس اللحظة على نفس اللون "المتاح" ظاهرياً).
   * يرمي خطأً بنوع ColorAlreadyTakenError لو خسر السباق.
   */
  confirmPlayerColor(gameId: string, playerId: string, newColor: string): Promise<void>;
  /** ينقل حالة اللعبة من 'lobby' إلى 'in-progress' — يستدعيها المضيف فقط عند الضغط على "ابدأ اللعبة" */
  startGame(gameId: string): Promise<void>;
  subscribeToGame(gameId: string, onUpdate: (snapshot: GameSnapshot) => void): () => void;
  updatePlayerState(gameId: string, player: Player): Promise<void>;
  advanceTurn(gameId: string, nextPlayerId: string): Promise<void>;

  /** إضافة Phase 4 — إثبات حدث بسجل اللعبة (append-only) */
  logEvent(gameId: string, entry: GameLogEntry): Promise<void>;

  /**
   * إضافات Phase B — دورة حياة المزاد. الأربعة إضافية بحتة على الواجهة (additive)،
   * ولا تغيّر أي توقيع موجود، بنفس نهج إضافة startGame سابقاً. activeAuction يُقرأ
   * ضمن subscribeToGame العادي (نفس مستند games/{gameId})، فلا حاجة لاشتراك منفصل.
   */
  startAuction(gameId: string, auction: AuctionState): Promise<void>;
  placeAuctionBid(gameId: string, auction: AuctionState): Promise<void>;
  passAuctionBid(gameId: string, auction: AuctionState): Promise<void>;
  /** ينهي المزاد ويمسح activeAuction — يُستدعى بعد تحديث حالة الفائز (أو بدون تحديث لو ما حدا زايد) */
  endAuction(gameId: string): Promise<void>;

  /**
   * إضافة Bug4/بطاقات — يحفظ حالة الرزمتين بعد أي سحب أو استخدام بطاقة اخرج-من-السجن.
   * additive بحتة (نفس نمط activeAuction) — تُقرأ ضمن subscribeToGame العادي.
   */
  updateDeckState(gameId: string, deckState: DeckState): Promise<void>;
  /**
   * اشتراك مستقل عن subscribeToGame عمداً: سجل الأحداث له استعلام مختلف تماماً
   * (ترتيب بالوقت + حد أقصى لعدد النتائج)، ودمجه بـGameSnapshot كان يُحمّل شكلاً
   * غير مرتبط بحالة اللعبة نفسها على كل مستهلكي subscribeToGame الحاليين
   * (اللوبي مثلاً) رغم إنهم لا يحتاجون السجل إطلاقاً.
   */
  subscribeToLog(gameId: string, onUpdate: (entries: readonly GameLogEntry[]) => void): () => void;
}
