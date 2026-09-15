import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameSession } from '../hooks/useGameSession';
import { Board, type PropertyOwnership } from '../components/board/Board';
import { PlayerHud } from '../components/hud/PlayerHud';
import { PlayersOverview } from '../components/hud/PlayersOverview';
import { EventLog } from '../components/hud/EventLog';
import { BuyPropertyModal } from '../components/modals/BuyPropertyModal';
import { AuctionModal } from '../components/modals/AuctionModal';
import { CardModal } from '../components/modals/CardModal';
import { BOARD_TILES, isBuyableTile, type PropertyTile } from '../../domain/entities/BoardTile';
import type { Card, DeckType } from '../../domain/entities/Card';
import { Money } from '../../domain/valueObjects/Money';
import type { Player } from '../../domain/entities/Player';
import type { AuctionState } from '../../domain/interfaces/AuctionState';
import type { DiceResult } from '../../domain/gameRules/DiceRoller';
import { rollDice } from '../../domain/gameRules/DiceRoller';
import { calculateMove, START_BONUS } from '../../domain/gameRules/MovementRules';
import { isTripleDoubles, JAIL_FINE } from '../../domain/gameRules/JailRules';
import type { GameSnapshot, GameLogEntry } from '../../domain/interfaces/IGameRepository';
import { playJailTurn } from '../../application/useCases/JailTurnUseCase';
import { buyProperty, type BuyPropertyFailureReason } from '../../application/useCases/BuyPropertyUseCase';
import { applyCardEffect } from '../../application/useCases/CardEffectUseCase';
import { drawCard, returnGetOutOfJailFreeCard, holdsGetOutOfJailFree } from '../../domain/gameRules/CardDeck';
import {
  startAuction,
  placeBid,
  passBid,
  isAuctionOver,
  resolveAuction,
  type BidFailureReason,
  type PassFailureReason,
} from '../../application/useCases/AuctionUseCase';
import { payRent } from '../../application/useCases/PayRentUseCase';
import { calculateTaxAmount } from '../../domain/gameRules/TaxRules';
import { buildOnProperty, type BuildFailureReason } from '../../application/useCases/BuildOnPropertyUseCase';
import { sellProperty, type SellPropertyFailureReason } from '../../application/useCases/SellPropertyUseCase';
import { COLOR_GROUP_HEX } from '../../shared/constants/colorGroups';
import { getNextPlayerId } from '../../domain/gameRules/TurnOrder';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

const BUY_FAILURE_MESSAGES: Record<BuyPropertyFailureReason, string> = {
  'not-a-property': 'هذا المربع غير قابل للتملك',
  'already-owned': 'العقار مملوك لغيرك',
  'insufficient-funds': 'رصيدك لا يكفي لشراء هذا العقار',
};

const AUCTION_BID_FAILURE_MESSAGES: Record<BidFailureReason, string> = {
  'not-your-turn': 'ليس دورك بالمزايدة الآن',
  'already-passed': 'لقد انسحبت من هذا المزاد',
  'bid-too-low': 'لازم تزيد المزايدة عن أعلى مزايدة حالية',
  'insufficient-funds': 'رصيدك لا يكفي لهذه المزايدة',
  'unknown-bidder': 'حدث خطأ غير متوقع بالمزاد',
};

const AUCTION_PASS_FAILURE_MESSAGES: Record<PassFailureReason, string> = {
  'not-your-turn': 'ليس دورك الآن',
  'already-passed': 'لقد انسحبت من هذا المزاد بالفعل',
};

const BUILD_FAILURE_MESSAGES: Record<BuildFailureReason, string> = {
  'not-a-property': 'هذا المربع غير قابل للبناء عليه',
  'not-owned': 'لازم تملك العقار أول قبل البناء عليه',
  'incomplete-color-group': 'لازم تملك كل عقارات نفس المنطقة قبل ما تقدر تبني',
  'uneven-building': 'لازم تبني بالتساوي — أكمل باقي عقارات المنطقة لنفس المستوى أول',
  'max-level': 'وصلت الحد الأقصى للبناء على هذا العقار',
  'insufficient-funds': 'رصيدك لا يكفي لتكلفة البناء',
};

const SELL_FAILURE_MESSAGES: Record<SellPropertyFailureReason, string> = {
  'not-a-property': 'هذا المربع غير قابل للبيع',
  'not-owned': 'لازم تملك العقار أول قبل بيعه',
  'has-buildings': 'لازم تبيع المباني الأول',
};

const DICE_TUMBLE_MS = 550;

interface PendingBuy {
  readonly tileId: number;
  readonly movedPlayer: Player;
  /** عدد الـdoubles المتتالية لحد الآن بهذا الدور — لو أكبر من صفر، بعد قرار الشراء/التخطي بيكمل رمي إضافي بدل إنهاء الدور */
  readonly consecutiveDoubles: number;
}

/**
 * Bug 2 (جزء من السبب الجذري): كان resolveLanding يرجع 'paused' لحالتين مختلفتين
 * تماماً — "الدور انتهى فعلياً" (سجن) و"الدور متوقّف بانتظار قرار شراء" — والمستدعي
 * (performRoll/performJailRoll) كان يفرّق بينهما بقراءة `pendingBuy` (state) مباشرة
 * بعد استدعاء resolveLanding، رغم إن `setPendingBuy` بالداخل قد لا يكون انعكس على
 * الـclosure المحلي بعد (تحديثات React state غير متزامنة مع القراءة الفورية) —
 * فكان أحياناً يُصفّر isBusy رغم إن مودال الشراء لسا مفتوح، فيسمح برمي نرد ثانٍ
 * متزامن. الحل: نوع نتيجة صريح بثلاث حالات بدل بوليان واحد ملتبس.
 */
type LandingOutcome = 'continue' | 'awaiting-buy' | 'turn-ended';

export function GameScreen() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { userId, gameRepository } = useGameSession();
  const prefersReducedMotion = usePrefersReducedMotion();

  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [logEntries, setLogEntries] = useState<readonly GameLogEntry[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingBuy, setPendingBuy] = useState<PendingBuy | null>(null);
  const [auctionPending, setAuctionPending] = useState<{ readonly consecutiveDoubles: number; readonly actingPlayerId: string } | null>(null);
  const [drawnCard, setDrawnCard] = useState<{ readonly card: Card; readonly deckType: DeckType } | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [lastDiceResult, setLastDiceResult] = useState<DiceResult | null>(null);

  /**
   * Bug 2 (السبب الفعلي المؤكَّد): `isBusy` (state) لا يكفي وحده كقفل — تحديث الـstate
   * غير متزامن مع إعادة الرسم؛ لو ضغط اللاعب مرتين بسرعة كبيرة (أو حتى نقرة مزدوجة
   * حقيقية بمسة واحدة على الموبايل)، النقرة الثانية ممكن تُنفَّذ بنفس الـclosure
   * القديم قبل ما React يُحدّث `disabled` بالـDOM فعلياً — فتُنفَّذ دالة الرمي مرتين
   * فعلياً بالتوازي، كل واحدة تحسب نردها الخاص وتكتب فوق الأخرى بترتيب غير متوقَّع
   * (لا توجد أي فحوصات تعارض إصدار/نسخة على كتابات Firestore هنا) — وهذا بالضبط ما
   * يسبّب "تحرّك مرتين"/"شراء مرتين"، وأحياناً رسالة خطأ زائفة لما إحدى النسختين
   * المتوازيتين تصادف حالة محلية (pendingBuy مثلاً) غيّرتها النسخة الأخرى تحتها.
   * الإصلاح: قفل بـref عادي (مزامنته فورية، لا تنتظر إعادة رسم) يُفحص ويُضبط كأول
   * سطر تنفيذي بكل معالج مخاطرة، قبل أي await أو حتى أي تحقق آخر.
   */
  const actionInFlightRef = useRef(false);

  useEffect(() => {
    if (!roomId) return;
    const unsubscribe = gameRepository.subscribeToGame(roomId, setSnapshot);
    return unsubscribe;
  }, [roomId, gameRepository]);

  useEffect(() => {
    if (!roomId) return;
    const unsubscribe = gameRepository.subscribeToLog(roomId, setLogEntries);
    return unsubscribe;
  }, [roomId, gameRepository]);

  // حماية من دخول مباشر/رابط قديم لشاشة اللعب قبل ما المضيف يبدأ اللعبة فعليًا
  useEffect(() => {
    if (snapshot && snapshot.status === 'lobby' && roomId) {
      navigate(`/lobby/${roomId}`, { replace: true });
    }
  }, [snapshot, roomId, navigate]);

  /**
   * يكمل تدفق الدور بعد انتهاء مزاد بدأه هذا العميل تحديداً (auctionPending مخزَّن
   * محلياً فقط لدى عميل اللاعب صاحب الدور الأصلي — بقية العملاء auctionPending عندهم
   * يضل null دائماً، فهذا الـeffect ما بيعمل إشي عندهم). لما activeAuction يرجع null
   * (سواء حسمه هذا العميل نفسه أو عميل آخر بمزايدة/تمرير أنهت المزاد)، نكمل نفس
   * منطق ما بعد قرار الشراء تماماً: دور إضافي لو doubles، وإلا إنهاء الدور.
   */
  useEffect(() => {
    if (!auctionPending || snapshot?.activeAuction) return;
    const { consecutiveDoubles, actingPlayerId } = auctionPending;
    setAuctionPending(null);
    const actingPlayer = snapshot?.players.find((player) => player.id === actingPlayerId);
    if (!actingPlayer) {
      setIsBusy(false);
      return;
    }
    async function resumeAfterAuction() {
      try {
        if (consecutiveDoubles > 0) {
          await performRoll(actingPlayer!, consecutiveDoubles);
        } else {
          await endTurn(actingPlayerId);
          setIsBusy(false);
        }
      } catch (error) {
        console.error('resumeAfterAuction failed', error);
        setMessage('حدث خطأ بعد انتهاء المزاد، حاول رمي النرد مرة أخرى إن ظهر الزر');
        setIsBusy(false);
      }
    }
    void resumeAfterAuction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot?.activeAuction, auctionPending]);


  const me = useMemo(
    () => snapshot?.players.find((player) => player.id === userId) ?? null,
    [snapshot, userId],
  );
  const isMyTurn = snapshot !== null && snapshot.currentPlayerId === userId;

  const ownershipByTileId = useMemo(() => {
    const map = new Map<number, PropertyOwnership>();
    for (const player of snapshot?.players ?? []) {
      for (const tileId of player.ownedTileIds) {
        map.set(tileId, {
          ownerId: player.id,
          ownerColor: player.tokenColor,
          buildLevel: player.buildLevels[tileId] ?? 0,
        });
      }
    }
    return map;
  }, [snapshot]);

  async function endTurn(actingPlayerId: string) {
    if (!roomId || !snapshot) return;
    const nextPlayerId = getNextPlayerId(snapshot.players, actingPlayerId);
    await gameRepository.advanceTurn(roomId, nextPlayerId);
  }

  /**
   * يحسم "هبوط" اللاعب على مربع بعد الحركة: شراء عقار فاضي (يوقف الدور وينتظر قرار)،
   * دفع إيجار، أو "اذهب للسجن". يرجع true لو الدور توقف مؤقتًا (بانتظار قرار الشراء).
   */
  async function resolveLanding(
    movedPlayer: Player,
    othersBeforeMove: readonly Player[],
    consecutiveDoubles: number,
    diceTotal: number,
  ): Promise<LandingOutcome> {
    if (!roomId) return 'continue';
    const tile = BOARD_TILES.find((candidate) => candidate.id === movedPlayer.position);
    if (!tile) return 'continue';

    if (tile.type === 'go-to-jail') {
      const jailedPlayer = movedPlayer.sendToJail();
      await gameRepository.updatePlayerState(roomId, jailedPlayer);
      setMessage('اذهب إلى السجن!');
      await endTurn(jailedPlayer.id);
      return 'turn-ended'; // الدور انتهى فعليًا (مش استمرار عادي)
    }

    if (tile.type === 'chance' || tile.type === 'community') {
      return resolveCardDraw(movedPlayer, othersBeforeMove, consecutiveDoubles, tile.type, diceTotal);
    }

    /**
     * Item 3 (إصلاح فجوة حقيقية مؤكَّدة): مربعات الضريبة كانت بلا أي أثر إطلاقاً —
     * resolveLanding ما كان يتحقق من type === 'tax' على الإطلاق، فالهبوط عليها
     * كان بلا أي خصم مالي ولا تسجيل بالسجل رغم وجود بيانات المبلغ بـBoardTile.ts.
     */
    if (tile.type === 'tax') {
      const taxAmount = calculateTaxAmount(tile);
      const taxedPlayer = movedPlayer.pay(Money.of(taxAmount));
      await gameRepository.updatePlayerState(roomId, taxedPlayer);
      setMessage(`دفعت ${taxAmount} جنيه ${tile.name}`);
      await gameRepository.logEvent(roomId, {
        type: 'tax-paid',
        playerId: taxedPlayer.id,
        playerNickname: taxedPlayer.nickname,
        tileId: tile.id,
        tileName: tile.name,
        amount: taxAmount,
      });
      return 'continue';
    }

    if (!isBuyableTile(tile)) return 'continue';

    const rosterAfterMove = [...othersBeforeMove, movedPlayer];
    const isOwnedByAnyone = rosterAfterMove.some((player) => player.ownsTile(tile.id));

    if (!isOwnedByAnyone) {
      setPendingBuy({ tileId: tile.id, movedPlayer, consecutiveDoubles });
      return 'awaiting-buy';
    }

    const rentResult = payRent(movedPlayer, rosterAfterMove, tile.id, diceTotal);
    if (rentResult.success) {
      await gameRepository.updatePlayerState(roomId, rentResult.payer);
      await gameRepository.updatePlayerState(roomId, rentResult.owner);
      const owner = rosterAfterMove.find((player) => player.ownsTile(tile.id));
      setMessage(`دفعت ${rentResult.rentAmount.format()} إيجار على ${tile.name}`);
      await gameRepository.logEvent(roomId, {
        type: 'rent-paid',
        playerId: movedPlayer.id,
        playerNickname: movedPlayer.nickname,
        ownerId: owner?.id ?? '',
        ownerNickname: owner?.nickname ?? '',
        tileId: tile.id,
        tileName: tile.name,
        amount: rentResult.rentAmount.value,
      });
    }
    // rentResult.success == false هنا يعني العقار ملكك أنت (self-rent) — لا إجراء مطلوب
    return 'continue';
  }

  /**
   * Bug 4/Feature — يسحب بطاقة فرصة/صندوق مجتمع، يطبّق أثرها، ويعرضها بالـmodal.
   * لو الأثر حرّك اللاعب لمربع جديد، نُعيد استدعاء resolveLanding على المربع الجديد
   * (نفس القاعدة الرسمية: الهبوط الناتج عن بطاقة يُحسَم بنفس طريقة أي هبوط عادي —
   * عقار فاضي يفتح شراء، عقار مملوك يدفع إيجار، حتى لو أدّى لمربع بطاقة آخر).
   */
  async function resolveCardDraw(
    movedPlayer: Player,
    othersBeforeMove: readonly Player[],
    consecutiveDoubles: number,
    deckType: DeckType,
    diceTotal: number,
  ): Promise<LandingOutcome> {
    if (!roomId || !snapshot) return 'continue';

    const { card, deckState: deckStateAfterDraw } = drawCard(snapshot.deckState, deckType, movedPlayer.id);
    await gameRepository.updateDeckState(roomId, deckStateAfterDraw);
    setDrawnCard({ card, deckType });

    const effectResult = applyCardEffect(card.effect, movedPlayer, othersBeforeMove);
    await gameRepository.updatePlayerState(roomId, effectResult.player);

    // pay-each-player/collect-from-each-player فقط هي اللي تُرجع مصفوفة others جديدة فعلياً
    if (effectResult.others !== othersBeforeMove) {
      for (const updatedOther of effectResult.others) {
        await gameRepository.updatePlayerState(roomId, updatedOther);
      }
    }

    await gameRepository.logEvent(roomId, {
      type: 'card-drawn',
      playerId: effectResult.player.id,
      playerNickname: effectResult.player.nickname,
      deckType,
      cardText: card.text,
    });

    if (effectResult.sentToJail) {
      setMessage('اذهب إلى السجن!');
      await endTurn(effectResult.player.id);
      return 'turn-ended';
    }

    if (effectResult.heldGetOutOfJailFree) {
      setMessage('حصلت على بطاقة اخرج من السجن مجاناً! 🎉');
      return 'continue';
    }

    // الأثر حرّك اللاعب فعلياً لمربع جديد — لازم نحسم هبوطه هناك بنفس القاعدة العادية
    if (effectResult.player.position !== movedPlayer.position) {
      const updatedOthers = othersBeforeMove.map(
        (other) => effectResult.others.find((updated) => updated.id === other.id) ?? other,
      );
      return resolveLanding(effectResult.player, updatedOthers, consecutiveDoubles, diceTotal);
    }

    return 'continue';
  }

  /**
   * دور عادي (اللاعب مو بالسجن). بيرمي النرد، يحرّك اللاعب، يحسم الهبوط، وبيكرر
   * نفسه تلقائيًا لو طلعت doubles (دور إضافي) — إلا لو صارت 3 doubles متتالية، عندها
   * يروح اللاعب للسجن مباشرة بدل الحركة، بدل أي دور إضافي.
   */
  async function performRoll(currentPlayer: Player, consecutiveDoublesSoFar: number) {
    if (!roomId || !snapshot) return;
    setIsRolling(true);

    const dice = rollDice();
    await new Promise((resolve) => setTimeout(resolve, prefersReducedMotion ? 0 : DICE_TUMBLE_MS));
    setLastDiceResult(dice);
    setIsRolling(false);

    await gameRepository.logEvent(roomId, {
      type: 'dice-rolled',
      playerId: currentPlayer.id,
      playerNickname: currentPlayer.nickname,
      die1: dice.die1,
      die2: dice.die2,
      total: dice.total,
    });

    // القاعدة الرسمية: ثالث doubles متتالية بنفس الدور → للسجن فورًا بدل الحركة
    if (dice.isDouble && isTripleDoubles(consecutiveDoublesSoFar)) {
      const jailedPlayer = currentPlayer.sendToJail();
      await gameRepository.updatePlayerState(roomId, jailedPlayer);
      setMessage('رميت doubles 3 مرات متتالية — رحت للسجن!');
      await endTurn(jailedPlayer.id);
      setIsBusy(false);
      return;
    }

    const { newPosition, passedStart } = calculateMove(currentPlayer.position, dice.total);
    let movedPlayer = currentPlayer.moveTo(newPosition);
    if (passedStart) {
      movedPlayer = movedPlayer.receive(Money.of(START_BONUS));
      setMessage(`${movedPlayer.nickname} مرّ من البداية، قبض 200 جنيه`);
    }
    await gameRepository.updatePlayerState(roomId, movedPlayer);

    const tile = BOARD_TILES.find((candidate) => candidate.id === movedPlayer.position);
    if (tile) {
      await gameRepository.logEvent(roomId, {
        type: 'player-moved',
        playerId: movedPlayer.id,
        playerNickname: movedPlayer.nickname,
        tileId: tile.id,
        tileName: tile.name,
        collectedGoBonus: passedStart,
      });
    }

    const nextConsecutiveDoubles = dice.isDouble ? consecutiveDoublesSoFar + 1 : 0;
    const othersBeforeMove = snapshot.players.filter((player) => player.id !== currentPlayer.id);
    const landingOutcome = await resolveLanding(movedPlayer, othersBeforeMove, nextConsecutiveDoubles, dice.total);

    if (landingOutcome === 'turn-ended') {
      setIsBusy(false);
      return;
    }
    if (landingOutcome === 'awaiting-buy') {
      // isBusy يضل true عمداً لحد ما اللاعب يقرر بمودال الشراء (BuyPropertyModal.onBuy/onSkip)
      return;
    }

    if (nextConsecutiveDoubles > 0) {
      // دور إضافي بسبب doubles — نفس اللاعب يرمي مرة ثانية
      await performRoll(movedPlayer, nextConsecutiveDoubles);
      return;
    }

    await endTurn(movedPlayer.id);
    setIsBusy(false);
  }

  /** دور اللاعب وهو بالسجن فعليًا — منطق مختلف تمامًا عن الدور العادي */
  async function performJailRoll(player: Player) {
    if (!roomId || !snapshot) return;
    setIsRolling(true);

    const result = playJailTurn(player);
    await new Promise((resolve) => setTimeout(resolve, prefersReducedMotion ? 0 : DICE_TUMBLE_MS));
    setLastDiceResult(result.dice);
    setIsRolling(false);

    await gameRepository.updatePlayerState(roomId, result.player);
    await gameRepository.logEvent(roomId, {
      type: 'dice-rolled',
      playerId: player.id,
      playerNickname: player.nickname,
      die1: result.dice.die1,
      die2: result.dice.die2,
      total: result.dice.total,
    });

    if (!result.exitedJail) {
      setMessage('ما طلعت doubles — لسا بالسجن');
      await endTurn(player.id);
      setIsBusy(false);
      return;
    }

    setMessage(
      result.paidFine
        ? `دفعت غرامة ${JAIL_FINE}$ وطلعت من السجن`
        : 'طلعت من السجن برمية doubles!',
    );

    const tile = BOARD_TILES.find((candidate) => candidate.id === result.player.position);
    if (tile) {
      await gameRepository.logEvent(roomId, {
        type: 'player-moved',
        playerId: result.player.id,
        playerNickname: result.player.nickname,
        tileId: tile.id,
        tileName: tile.name,
      });
    }

    // الخروج من السجن ما بيمنح دور إضافي حتى لو كان بـdoubles — القاعدة الرسمية صريحة بهيك
    const othersBeforeMove = snapshot.players.filter((p) => p.id !== player.id);
    const landingOutcome = await resolveLanding(result.player, othersBeforeMove, 0, result.dice.total);
    if (landingOutcome === 'turn-ended') {
      setIsBusy(false);
      return;
    }
    if (landingOutcome === 'awaiting-buy') {
      return;
    }

    await endTurn(result.player.id);
    setIsBusy(false);
  }

  async function handleRollDice() {
    if (!me || !roomId || !snapshot || isBusy || actionInFlightRef.current) return;
    actionInFlightRef.current = true;
    setIsBusy(true);
    setMessage(null);

    try {
      if (me.isInJail) {
        await performJailRoll(me);
      } else {
        await performRoll(me, 0);
      }
    } catch (error) {
      // Bug 3 (دفاع إضافي): أي خطأ غير متوقع بسلسلة رمي النرد/الحركة/الهبوط بالكامل
      // ما عاد يعلّق isBusy للأبد — اللاعب يقدر يعيد المحاولة فوراً.
      console.error('handleRollDice failed', error);
      setMessage('حدث خطأ غير متوقع، حاول رمي النرد مرة أخرى');
      setPendingBuy(null);
      setIsBusy(false);
    } finally {
      actionInFlightRef.current = false;
    }
  }

  /**
   * Bug 3 (السبب الفعلي المؤكَّد): الكتابة الجوهرية (updatePlayerState) وكتابة
   * السجل غير الحرجة (logEvent) كانتا بنفس try/catch — فلو نجحت الكتابة الجوهرية
   * لكن كتابة السجل بعدها فشلت لأي سبب (تعارض مؤقت، تأخر شبكة، إلخ)، كانت رسالة
   * "تعذّر إتمام الشراء" تظهر رغم إن الشراء نفسه نجح فعلياً ونُقل بالفعل. الإصلاح:
   * فصل معالجة الخطأ تماماً — فشل الكتابة الجوهرية فقط هو ما يُعتبر "فشل شراء".
   */
  async function handleBuyAccept() {
    if (!pendingBuy || !roomId || !snapshot || actionInFlightRef.current) return;
    actionInFlightRef.current = true;
    const othersBeforeMove = snapshot.players.filter((player) => player.id !== pendingBuy.movedPlayer.id);
    const roster = [...othersBeforeMove, pendingBuy.movedPlayer];
    const tile = BOARD_TILES.find((candidate) => candidate.id === pendingBuy.tileId);
    const result = buyProperty(pendingBuy.movedPlayer, roster, pendingBuy.tileId);
    let finalPlayer = pendingBuy.movedPlayer;

    try {
      if (result.success) {
        finalPlayer = result.player;
        await gameRepository.updatePlayerState(roomId, result.player); // الكتابة الجوهرية — فشلها فقط = فشل شراء حقيقي
      } else {
        setMessage(BUY_FAILURE_MESSAGES[result.reason]);
      }
    } catch (error) {
      console.error('handleBuyAccept: فشلت الكتابة الجوهرية فعلياً', error);
      setMessage('تعذّر إتمام الشراء بسبب خطأ غير متوقع، حاول لاحقاً');
      setPendingBuy(null);
      setAuctionPending(null);
      setIsBusy(false);
      actionInFlightRef.current = false;
      throw error; // إعادة الرمي مقصودة: BuyPropertyModal.handleBuyClick يلتقطها لعرض رسالته الخاصة أيضاً
    }

    // كتابة السجل غير حرجة — فشلها لا يعني فشل الشراء (اللي نجح فعلياً بالأعلى)، فمعالجتها منفصلة تماماً ولا تُظهر أي رسالة فشل للاعب
    if (result.success && tile) {
      try {
        await gameRepository.logEvent(roomId, {
          type: 'property-bought',
          playerId: result.player.id,
          playerNickname: result.player.nickname,
          tileId: tile.id,
          tileName: tile.name,
          price: 'purchasePrice' in tile ? tile.purchasePrice : 0,
        });
      } catch (logError) {
        console.error('handleBuyAccept: فشل تسجيل الحدث بالسجل (غير حرج، الشراء نفسه نجح)', logError);
      }
    }

    const consecutiveDoubles = pendingBuy.consecutiveDoubles;
    setPendingBuy(null);

    try {
      if (consecutiveDoubles > 0) {
        await performRoll(finalPlayer, consecutiveDoubles);
      } else {
        await endTurn(finalPlayer.id);
        setIsBusy(false);
      }
    } catch (error) {
      console.error('handleBuyAccept: فشل استئناف الدور بعد الشراء', error);
      setMessage('حدث خطأ بعد الشراء، حاول رمي النرد إن ظهر الزر');
      setIsBusy(false);
    } finally {
      actionInFlightRef.current = false;
    }
  }

  async function handleBuySkip() {
    if (!pendingBuy || !roomId || !snapshot || actionInFlightRef.current) return;
    actionInFlightRef.current = true;
    const { movedPlayer, consecutiveDoubles, tileId } = pendingBuy;
    setPendingBuy(null);

    try {
      const auction = startAuction(tileId, snapshot.players, movedPlayer.id);
      setAuctionPending({ consecutiveDoubles, actingPlayerId: movedPlayer.id });
      await gameRepository.startAuction(roomId, auction);
      // isBusy يضل true — الـeffect فوق (auctionPending) هو من يكمل الدور لما المزاد ينتهي.
    } catch (error) {
      console.error('handleBuySkip failed', error);
      setMessage('تعذّر بدء المزاد بسبب خطأ غير متوقع');
      setAuctionPending(null);
      setIsBusy(false);
    } finally {
      actionInFlightRef.current = false;
    }
  }

  /**
   * يحسم مزاداً وصل لنهايته فعلياً: ينقل العقار والمال للفائز (لو وُجد)، يسجّل
   * الحدث بالسجل، ثم يمسح activeAuction. يُستدعى من نفس العميل اللي مزايدته أو
   * تمريره أنهى المزاد تحديداً (لا سباق بين عدة عملاء لأن الاستدعاء متزامن مع
   * فعل ذلك العميل نفسه، وليس عبر مراقبة تغييرات لاحقة).
   */
  async function finishAuction(finalAuction: AuctionState) {
    if (!roomId || !snapshot) return;
    const tile = BOARD_TILES.find((candidate) => candidate.id === finalAuction.tileId);
    const resolution = resolveAuction(finalAuction, snapshot.players);

    if (resolution.sold) {
      await gameRepository.updatePlayerState(roomId, resolution.winner);
    }

    await gameRepository.logEvent(roomId, {
      type: 'property-auctioned',
      tileId: finalAuction.tileId,
      tileName: tile?.name ?? '',
      winnerId: resolution.sold ? resolution.winner.id : null,
      winnerNickname: resolution.sold ? resolution.winner.nickname : null,
      amount: resolution.sold ? resolution.amount : 0,
    });

    await gameRepository.endAuction(roomId);
  }

  async function handleAuctionBid(amount: number) {
    if (!roomId || !snapshot?.activeAuction || !me || actionInFlightRef.current) return;
    const result = placeBid(snapshot.activeAuction, snapshot.players, me.id, amount);
    if (!result.success) {
      setMessage(AUCTION_BID_FAILURE_MESSAGES[result.reason]);
      return;
    }
    actionInFlightRef.current = true;
    try {
      if (isAuctionOver(result.auction)) {
        await finishAuction(result.auction);
      } else {
        await gameRepository.placeAuctionBid(roomId, result.auction);
      }
    } catch (error) {
      console.error('handleAuctionBid failed', error);
      setMessage('تعذّرت المزايدة بسبب خطأ غير متوقع، حاول مرة أخرى');
    } finally {
      actionInFlightRef.current = false;
    }
  }

  async function handleAuctionPass() {
    if (!roomId || !snapshot?.activeAuction || !me || actionInFlightRef.current) return;
    const result = passBid(snapshot.activeAuction, me.id);
    if (!result.success) {
      setMessage(AUCTION_PASS_FAILURE_MESSAGES[result.reason]);
      return;
    }
    actionInFlightRef.current = true;
    try {
      if (isAuctionOver(result.auction)) {
        await finishAuction(result.auction);
      } else {
        await gameRepository.passAuctionBid(roomId, result.auction);
      }
    } catch (error) {
      console.error('handleAuctionPass failed', error);
      setMessage('تعذّر تسجيل الانسحاب بسبب خطأ غير متوقع، حاول مرة أخرى');
    } finally {
      actionInFlightRef.current = false;
    }
  }

  async function handleUseGetOutOfJailFree() {
    if (!me || !roomId || !snapshot || isBusy || actionInFlightRef.current) return;
    const deckType = holdsGetOutOfJailFree(snapshot.deckState, me.id);
    if (!deckType || !me.isInJail) return;

    actionInFlightRef.current = true;
    try {
      const releasedPlayer = me.releaseFromJail();
      await gameRepository.updatePlayerState(roomId, releasedPlayer);
      await gameRepository.updateDeckState(roomId, returnGetOutOfJailFreeCard(snapshot.deckState, deckType));
      setMessage('استخدمت بطاقة اخرج من السجن مجاناً — دورك الآن يكمل عادي');
    } catch (error) {
      console.error('handleUseGetOutOfJailFree failed', error);
      setMessage('تعذّر استخدام البطاقة بسبب خطأ غير متوقع، حاول مرة أخرى');
    } finally {
      actionInFlightRef.current = false;
    }
  }

  async function handleBuild(tileId: number) {
    if (!me || !roomId || isBusy || actionInFlightRef.current) return;
    actionInFlightRef.current = true;
    try {
      const tile = BOARD_TILES.find((candidate) => candidate.id === tileId);
      const result = buildOnProperty(me, tileId);
      if (result.success) {
        await gameRepository.updatePlayerState(roomId, result.player);
        if (tile) {
          try {
            await gameRepository.logEvent(roomId, {
              type: 'property-built',
              playerId: result.player.id,
              playerNickname: result.player.nickname,
              tileId: tile.id,
              tileName: tile.name,
              newLevel: result.player.buildLevels[tileId] ?? 0,
            });
          } catch (logError) {
            // Bug 3 نفس النمط: فشل تسجيل السجل غير حرج، لا يعني فشل البناء نفسه
            console.error('handleBuild: فشل تسجيل الحدث بالسجل (غير حرج)', logError);
          }
        }
      } else {
        setMessage(BUILD_FAILURE_MESSAGES[result.reason]);
      }
    } catch (error) {
      console.error('handleBuild: فشلت الكتابة الجوهرية فعلياً', error);
      setMessage('تعذّر إتمام البناء بسبب خطأ غير متوقع، حاول مرة أخرى');
    } finally {
      actionInFlightRef.current = false;
    }
  }

  async function handleSell(tileId: number) {
    if (!me || !roomId || isBusy || actionInFlightRef.current) return;
    actionInFlightRef.current = true;
    try {
      const tile = BOARD_TILES.find((candidate) => candidate.id === tileId);
      const result = sellProperty(me, tileId);
      if (result.success) {
        await gameRepository.updatePlayerState(roomId, result.player);
        if (tile) {
          try {
            await gameRepository.logEvent(roomId, {
              type: 'property-sold',
              playerId: result.player.id,
              playerNickname: result.player.nickname,
              tileId: tile.id,
              tileName: tile.name,
              refundAmount: result.refundAmount,
            });
          } catch (logError) {
            // نفس نمط handleBuild: فشل تسجيل السجل غير حرج، لا يعني فشل البيع نفسه
            console.error('handleSell: فشل تسجيل الحدث بالسجل (غير حرج)', logError);
          }
        }
      } else {
        setMessage(SELL_FAILURE_MESSAGES[result.reason]);
      }
    } catch (error) {
      console.error('handleSell: فشلت الكتابة الجوهرية فعلياً', error);
      setMessage('تعذّر إتمام البيع بسبب خطأ غير متوقع، حاول مرة أخرى');
    } finally {
      actionInFlightRef.current = false;
    }
  }

  if (!roomId || !snapshot || !me) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-board-bg text-white">
        <p>جاري تحميل اللعبة...</p>
      </main>
    );
  }

  const currentPlayer = snapshot.players.find((player) => player.id === snapshot.currentPlayerId);
  const myPropertyTiles: PropertyTile[] = BOARD_TILES.filter(
    (tile): tile is PropertyTile => tile.type === 'property' && me.ownsTile(tile.id),
  );
  /**
   * Item 3 (إصلاح خلل حرج كان سيُدخَل بهذا التعديل نفسه لولا اكتشافه): كان هذان
   * الاستعلامان يقيّدان النتيجة بـtile.type === 'property' فقط — أي إن الهبوط
   * على مطار أو مرفق فاضي كان سيُنتج pendingBuy فعلياً (resolveLanding) لكن
   * pendingBuyTile يرجع null دائماً له، فالمودال ما كان يظهر أبداً وتبقى اللعبة
   * معلّقة للأبد (isBusy=true بلا أي وسيلة للمستخدم يقرر). isBuyableTile الآن
   * تشمل الثلاثة أنواع.
   */
  const pendingBuyTile = pendingBuy
    ? (BOARD_TILES.find((tile) => isBuyableTile(tile) && tile.id === pendingBuy.tileId) ?? null)
    : null;
  const auctionTile = snapshot.activeAuction
    ? (BOARD_TILES.find((tile) => isBuyableTile(tile) && tile.id === snapshot.activeAuction?.tileId) ?? null)
    : null;
  const nicknameById = new Map(snapshot.players.map((player) => [player.id, player.nickname]));
  const myGetOutOfJailFreeDeck = holdsGetOutOfJailFree(snapshot.deckState, me.id);

  return (
    <main className="flex min-h-screen flex-col gap-3 bg-board-bg p-3 pb-0 text-white sm:p-6 sm:pb-0">
      {/*
       * Item 2 (السبب الفعلي: padding الحاوية الخارجية كان "يتنازع" مع حجم
       * المربعات، مش نقص برقم خام بحجم المربع نفسه — كل تكبير سابق كان يُبتلع
       * جزئياً بهذا الـpadding). على الموبايل تحديداً، نُلغي padding الأب أفقياً
       * (-mx-3) فقط لهذه اللوحة (bleed لحافة الشاشة، نمط شائع بتطبيقات ألعاب
       * اللوحة على الموبايل)، مع إبقاء باقي عناصر الواجهة (السجل، الرسائل)
       * بنفس الـpadding العادي تحتها.
       */}
      <div className="-mx-3 sm:mx-0">
        <Board
          players={snapshot.players}
          ownershipByTileId={ownershipByTileId}
          currentPlayerId={snapshot.currentPlayerId ?? undefined}
        />
      </div>

      <PlayersOverview players={snapshot.players} currentPlayerId={snapshot.currentPlayerId} />

      {message && (
        <p role="status" className="rounded-md border border-board-line bg-board-tile px-3 py-2 text-sm text-amber-300">
          {message}
        </p>
      )}

      {me.isInJail && myGetOutOfJailFreeDeck && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-amber-400 bg-board-tile px-3 py-2 text-sm">
          <span>معك بطاقة اخرج من السجن مجاناً ({myGetOutOfJailFreeDeck === 'chance' ? 'فرصة' : 'صندوق المجتمع'})</span>
          <button
            type="button"
            onClick={handleUseGetOutOfJailFree}
            disabled={isBusy}
            className="shrink-0 rounded-md bg-amber-400 px-2 py-1 text-xs font-bold text-board-bg disabled:opacity-40"
          >
            استخدمها الآن
          </button>
        </div>
      )}

      <EventLog entries={logEntries} />

      <section className="pb-3">
        <h2 className="mb-2 text-sm text-gray-300">عقاراتي ({myPropertyTiles.length})</h2>
        <ul className="flex flex-col gap-2">
          {myPropertyTiles.map((tile) => {
            const level = me.buildLevels[tile.id] ?? 0;
            const canAfford = me.money.isGreaterThanOrEqual(Money.of(tile.buildCost));
            const canBuild = isMyTurn && level < 5 && canAfford;
            const canSell = isMyTurn && level === 0;

            return (
              <li
                key={tile.id}
                className="flex items-center justify-between gap-2 rounded-md border border-board-line bg-board-tile px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: COLOR_GROUP_HEX[tile.colorGroup] }}
                    aria-hidden="true"
                  />
                  {tile.countryFlag} {tile.name} — مستوى {level}
                </span>
                <span className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => handleBuild(tile.id)}
                    disabled={!canBuild || isBusy}
                    className="rounded-md border border-amber-400 px-2 py-1 text-xs text-amber-400 disabled:opacity-40"
                  >
                    ابنِ ({tile.buildCost})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSell(tile.id)}
                    disabled={!canSell || isBusy}
                    title={level > 0 ? 'لازم تبيع المباني الأول' : undefined}
                    className="rounded-md border border-red-400 px-2 py-1 text-xs text-red-400 disabled:opacity-40"
                  >
                    بيع
                  </button>
                </span>
              </li>
            );
          })}
          {myPropertyTiles.length === 0 && <li className="text-sm text-gray-500">ما عندك عقارات بعد</li>}
        </ul>
      </section>

      <BuyPropertyModal
        tile={pendingBuyTile}
        currentMoney={pendingBuy?.movedPlayer.money.value ?? me.money.value}
        onBuy={handleBuyAccept}
        onSkip={handleBuySkip}
      />

      <AuctionModal
        auction={snapshot.activeAuction}
        tile={auctionTile}
        myPlayerId={me.id}
        nicknameById={nicknameById}
        myMoney={me.money.value}
        onBid={handleAuctionBid}
        onPass={handleAuctionPass}
      />

      <CardModal
        card={drawnCard?.card ?? null}
        deckType={drawnCard?.deckType ?? null}
        onDismiss={() => setDrawnCard(null)}
      />

      <PlayerHud
        myMoney={me.money.value}
        isMyTurn={isMyTurn}
        currentPlayerNickname={currentPlayer?.nickname ?? '...'}
        currentPlayerColor={currentPlayer?.tokenColor ?? '#888888'}
        isRolling={isRolling}
        lastDiceResult={lastDiceResult}
        onRollDice={handleRollDice}
        disabled={isBusy || pendingBuy !== null || snapshot.activeAuction !== null}
      />
    </main>
  );
}
