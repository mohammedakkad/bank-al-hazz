import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameSession } from '../hooks/useGameSession';
import { Board, type PropertyOwnership } from '../components/board/Board';
import { PlayerHud } from '../components/hud/PlayerHud';
import { EventLog } from '../components/hud/EventLog';
import { BuyPropertyModal } from '../components/modals/BuyPropertyModal';
import { AuctionModal } from '../components/modals/AuctionModal';
import { BOARD_TILES, type PropertyTile } from '../../domain/entities/BoardTile';
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
import { buildOnProperty, type BuildFailureReason } from '../../application/useCases/BuildOnPropertyUseCase';
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

const DICE_TUMBLE_MS = 550;

interface PendingBuy {
  readonly tileId: number;
  readonly movedPlayer: Player;
  /** عدد الـdoubles المتتالية لحد الآن بهذا الدور — لو أكبر من صفر، بعد قرار الشراء/التخطي بيكمل رمي إضافي بدل إنهاء الدور */
  readonly consecutiveDoubles: number;
}

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
  const [isBusy, setIsBusy] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [lastDiceResult, setLastDiceResult] = useState<DiceResult | null>(null);

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
    if (consecutiveDoubles > 0) {
      void performRoll(actingPlayer, consecutiveDoubles);
    } else {
      void endTurn(actingPlayerId).then(() => setIsBusy(false));
    }
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
        map.set(tileId, { ownerId: player.id, ownerColor: player.tokenColor });
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
  ): Promise<'paused' | 'continue'> {
    if (!roomId) return 'continue';
    const tile = BOARD_TILES.find((candidate) => candidate.id === movedPlayer.position);
    if (!tile) return 'continue';

    if (tile.type === 'go-to-jail') {
      const jailedPlayer = movedPlayer.sendToJail();
      await gameRepository.updatePlayerState(roomId, jailedPlayer);
      setMessage('اذهب إلى السجن!');
      await endTurn(jailedPlayer.id);
      return 'paused'; // الدور انتهى فعليًا (مش استمرار عادي)
    }

    if (tile.type !== 'property') return 'continue';

    const rosterAfterMove = [...othersBeforeMove, movedPlayer];
    const isOwnedByAnyone = rosterAfterMove.some((player) => player.ownsTile(tile.id));

    if (!isOwnedByAnyone) {
      setPendingBuy({ tileId: tile.id, movedPlayer, consecutiveDoubles });
      return 'paused';
    }

    const rentResult = payRent(movedPlayer, rosterAfterMove, tile.id);
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
      });
    }

    const nextConsecutiveDoubles = dice.isDouble ? consecutiveDoublesSoFar + 1 : 0;
    const othersBeforeMove = snapshot.players.filter((player) => player.id !== currentPlayer.id);
    const landingOutcome = await resolveLanding(movedPlayer, othersBeforeMove, nextConsecutiveDoubles);

    if (landingOutcome === 'paused') {
      // إما وقف بانتظار قرار الشراء (isBusy يضل true لحد قرار المستخدم)، أو انتهى الدور فعليًا (سجن)
      if (!pendingBuy) setIsBusy(false);
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
    const landingOutcome = await resolveLanding(result.player, othersBeforeMove, 0);
    if (landingOutcome === 'paused') {
      if (!pendingBuy) setIsBusy(false);
      return;
    }

    await endTurn(result.player.id);
    setIsBusy(false);
  }

  async function handleRollDice() {
    if (!me || !roomId || !snapshot || isBusy) return;
    setIsBusy(true);
    setMessage(null);

    if (me.isInJail) {
      await performJailRoll(me);
    } else {
      await performRoll(me, 0);
    }
  }

  async function handleBuyAccept() {
    if (!pendingBuy || !roomId || !snapshot) return;
    const othersBeforeMove = snapshot.players.filter((player) => player.id !== pendingBuy.movedPlayer.id);
    const roster = [...othersBeforeMove, pendingBuy.movedPlayer];
    const tile = BOARD_TILES.find((candidate) => candidate.id === pendingBuy.tileId);
    const result = buyProperty(pendingBuy.movedPlayer, roster, pendingBuy.tileId);

    let finalPlayer = pendingBuy.movedPlayer;
    if (result.success) {
      finalPlayer = result.player;
      await gameRepository.updatePlayerState(roomId, result.player);
      if (tile) {
        await gameRepository.logEvent(roomId, {
          type: 'property-bought',
          playerId: result.player.id,
          playerNickname: result.player.nickname,
          tileId: tile.id,
          tileName: tile.name,
          price: 'purchasePrice' in tile ? tile.purchasePrice : 0,
        });
      }
    } else {
      setMessage(BUY_FAILURE_MESSAGES[result.reason]);
    }

    const consecutiveDoubles = pendingBuy.consecutiveDoubles;
    setPendingBuy(null);

    if (consecutiveDoubles > 0) {
      await performRoll(finalPlayer, consecutiveDoubles);
    } else {
      await endTurn(finalPlayer.id);
      setIsBusy(false);
    }
  }

  async function handleBuySkip() {
    if (!pendingBuy || !roomId || !snapshot) return;
    const { movedPlayer, consecutiveDoubles, tileId } = pendingBuy;
    setPendingBuy(null);

    const auction = startAuction(tileId, snapshot.players, movedPlayer.id);
    setAuctionPending({ consecutiveDoubles, actingPlayerId: movedPlayer.id });
    await gameRepository.startAuction(roomId, auction);
    // isBusy يضل true — الـeffect فوق (auctionPending) هو من يكمل الدور لما المزاد ينتهي.
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
    if (!roomId || !snapshot?.activeAuction || !me) return;
    const result = placeBid(snapshot.activeAuction, snapshot.players, me.id, amount);
    if (!result.success) {
      setMessage(AUCTION_BID_FAILURE_MESSAGES[result.reason]);
      return;
    }
    if (isAuctionOver(result.auction)) {
      await finishAuction(result.auction);
    } else {
      await gameRepository.placeAuctionBid(roomId, result.auction);
    }
  }

  async function handleAuctionPass() {
    if (!roomId || !snapshot?.activeAuction || !me) return;
    const result = passBid(snapshot.activeAuction, me.id);
    if (!result.success) {
      setMessage(AUCTION_PASS_FAILURE_MESSAGES[result.reason]);
      return;
    }
    if (isAuctionOver(result.auction)) {
      await finishAuction(result.auction);
    } else {
      await gameRepository.passAuctionBid(roomId, result.auction);
    }
  }

  async function handleBuild(tileId: number) {
    if (!me || !roomId || isBusy) return;
    const tile = BOARD_TILES.find((candidate) => candidate.id === tileId);
    const result = buildOnProperty(me, tileId);
    if (result.success) {
      await gameRepository.updatePlayerState(roomId, result.player);
      if (tile) {
        await gameRepository.logEvent(roomId, {
          type: 'property-built',
          playerId: result.player.id,
          playerNickname: result.player.nickname,
          tileId: tile.id,
          tileName: tile.name,
          newLevel: result.player.buildLevels[tileId] ?? 0,
        });
      }
    } else {
      setMessage(BUILD_FAILURE_MESSAGES[result.reason]);
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
  const pendingBuyTile = pendingBuy
    ? (BOARD_TILES.find((tile): tile is PropertyTile => tile.type === 'property' && tile.id === pendingBuy.tileId) ?? null)
    : null;
  const auctionTile = snapshot.activeAuction
    ? (BOARD_TILES.find((tile): tile is PropertyTile => tile.type === 'property' && tile.id === snapshot.activeAuction?.tileId) ?? null)
    : null;
  const nicknameById = new Map(snapshot.players.map((player) => [player.id, player.nickname]));

  return (
    <main className="flex min-h-screen flex-col gap-3 bg-board-bg p-3 pb-0 text-white sm:p-6 sm:pb-0">
      <Board
        players={snapshot.players}
        ownershipByTileId={ownershipByTileId}
        currentPlayerId={snapshot.currentPlayerId ?? undefined}
      />

      {message && (
        <p role="status" className="rounded-md border border-board-line bg-board-tile px-3 py-2 text-sm text-amber-300">
          {message}
        </p>
      )}

      <EventLog entries={logEntries} />

      <section className="pb-3">
        <h2 className="mb-2 text-sm text-gray-300">عقاراتي ({myPropertyTiles.length})</h2>
        <ul className="flex flex-col gap-2">
          {myPropertyTiles.map((tile) => {
            const level = me.buildLevels[tile.id] ?? 0;
            const canAfford = me.money.isGreaterThanOrEqual(Money.of(tile.buildCost));
            const canBuild = isMyTurn && level < 5 && canAfford;

            return (
              <li
                key={tile.id}
                className="flex items-center justify-between rounded-md border border-board-line bg-board-tile px-3 py-2 text-sm"
              >
                <span>
                  {tile.countryFlag} {tile.name} — مستوى {level}
                </span>
                <button
                  type="button"
                  onClick={() => handleBuild(tile.id)}
                  disabled={!canBuild || isBusy}
                  className="rounded-md border border-amber-400 px-2 py-1 text-xs text-amber-400 disabled:opacity-40"
                >
                  ابنِ ({tile.buildCost})
                </button>
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
