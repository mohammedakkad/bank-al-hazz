import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameSession } from '../hooks/useGameSession';
import { Board, type PropertyOwnership } from '../components/board/Board';
import { PlayerHud } from '../components/hud/PlayerHud';
import { EventLog } from '../components/hud/EventLog';
import { BuyPropertyModal } from '../components/modals/BuyPropertyModal';
import { BOARD_TILES, type PropertyTile } from '../../domain/entities/BoardTile';
import { Money } from '../../domain/valueObjects/Money';
import type { Player } from '../../domain/entities/Player';
import type { DiceResult } from '../../domain/gameRules/DiceRoller';
import type { GameSnapshot, GameLogEntry } from '../../domain/interfaces/IGameRepository';
import { rollDiceAndMove } from '../../application/useCases/RollDiceAndMoveUseCase';
import { buyProperty, type BuyPropertyFailureReason } from '../../application/useCases/BuyPropertyUseCase';
import { payRent } from '../../application/useCases/PayRentUseCase';
import { buildOnProperty, type BuildFailureReason } from '../../application/useCases/BuildOnPropertyUseCase';
import { getNextPlayerId } from '../../domain/gameRules/TurnOrder';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

const BUY_FAILURE_MESSAGES: Record<BuyPropertyFailureReason, string> = {
  'not-a-property': 'هذا المربع غير قابل للتملك',
  'already-owned': 'العقار مملوك لغيرك',
  'insufficient-funds': 'رصيدك لا يكفي لشراء هذا العقار',
};

const BUILD_FAILURE_MESSAGES: Record<BuildFailureReason, string> = {
  'not-a-property': 'هذا المربع غير قابل للبناء عليه',
  'not-owned': 'لازم تملك العقار أول قبل البناء عليه',
  'max-level': 'وصلت الحد الأقصى للبناء على هذا العقار',
  'insufficient-funds': 'رصيدك لا يكفي لتكلفة البناء',
};

const DICE_TUMBLE_MS = 550;

interface PendingBuy {
  readonly tileId: number;
  readonly movedPlayer: Player;
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

  async function handleRollDice() {
    if (!me || !roomId || !snapshot || isBusy) return;
    setIsBusy(true);
    setIsRolling(true);
    setMessage(null);

    const { dice, player: movedPlayer } = rollDiceAndMove(me);

    // تأخير مقصود: النرد "يتقلّب" بصرياً على HUD قبل ما نطبّق فعلياً نتيجة الحركة
    // ونحفظها — بدون هذا التأخير ستظهر النتيجة النهائية فوراً بلا أي إحساس بالرمي.
    await new Promise((resolve) => setTimeout(resolve, prefersReducedMotion ? 0 : DICE_TUMBLE_MS));

    setLastDiceResult(dice);
    setIsRolling(false);

    await gameRepository.updatePlayerState(roomId, movedPlayer);
    await gameRepository.logEvent(roomId, {
      type: 'dice-rolled',
      playerId: me.id,
      playerNickname: me.nickname,
      die1: dice.die1,
      die2: dice.die2,
      total: dice.total,
    });

    const othersBeforeMove = snapshot.players.filter((player) => player.id !== me.id);
    const rosterAfterMove = [...othersBeforeMove, movedPlayer];
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

    if (tile && tile.type === 'property') {
      const isOwnedByAnyone = rosterAfterMove.some((player) => player.ownsTile(tile.id));

      if (!isOwnedByAnyone) {
        setPendingBuy({ tileId: tile.id, movedPlayer });
        setIsBusy(false);
        return; // ننتظر قرار اللاعب (شراء/تخطي) قبل إنهاء الدور
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
    }

    await endTurn(movedPlayer.id);
    setIsBusy(false);
  }

  async function handleBuyAccept() {
    if (!pendingBuy || !roomId || !snapshot) return;
    const othersBeforeMove = snapshot.players.filter((player) => player.id !== pendingBuy.movedPlayer.id);
    const roster = [...othersBeforeMove, pendingBuy.movedPlayer];
    const tile = BOARD_TILES.find((candidate) => candidate.id === pendingBuy.tileId);
    const result = buyProperty(pendingBuy.movedPlayer, roster, pendingBuy.tileId);

    if (result.success) {
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
      await endTurn(result.player.id);
    } else {
      setMessage(BUY_FAILURE_MESSAGES[result.reason]);
      await endTurn(pendingBuy.movedPlayer.id);
    }
    setPendingBuy(null);
  }

  async function handleBuySkip() {
    if (!pendingBuy) return;
    setIsBusy(true);
    await endTurn(pendingBuy.movedPlayer.id);
    setPendingBuy(null);
    setIsBusy(false);
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

      <PlayerHud
        myMoney={me.money.value}
        isMyTurn={isMyTurn}
        currentPlayerNickname={currentPlayer?.nickname ?? '...'}
        currentPlayerColor={currentPlayer?.tokenColor ?? '#888888'}
        isRolling={isRolling}
        lastDiceResult={lastDiceResult}
        onRollDice={handleRollDice}
        disabled={isBusy || pendingBuy !== null}
      />
    </main>
  );
}
