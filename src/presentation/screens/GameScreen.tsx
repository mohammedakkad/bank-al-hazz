import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameSession } from '../hooks/useGameSession';
import { Board, type PropertyOwnership } from '../components/board/Board';
import { BOARD_TILES, type PropertyTile } from '../../domain/entities/BoardTile';
import { Money } from '../../domain/valueObjects/Money';
import type { Player } from '../../domain/entities/Player';
import type { GameSnapshot } from '../../domain/interfaces/IGameRepository';
import { rollDiceAndMove } from '../../application/useCases/RollDiceAndMoveUseCase';
import { buyProperty, type BuyPropertyFailureReason } from '../../application/useCases/BuyPropertyUseCase';
import { payRent } from '../../application/useCases/PayRentUseCase';
import { buildOnProperty, type BuildFailureReason } from '../../application/useCases/BuildOnPropertyUseCase';
import { getNextPlayerId } from '../../domain/gameRules/TurnOrder';

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

interface PendingBuy {
  readonly tileId: number;
  readonly movedPlayer: Player;
}

export function GameScreen() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { userId, gameRepository } = useGameSession();

  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingBuy, setPendingBuy] = useState<PendingBuy | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  // اشتراك حي واحد فقط لهذه الشاشة — نفس نمط LobbyRoomScreen، بلا آلية ثانية
  useEffect(() => {
    if (!roomId) return;
    const unsubscribe = gameRepository.subscribeToGame(roomId, setSnapshot);
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
    setMessage(null);

    const { player: movedPlayer } = rollDiceAndMove(me);
    await gameRepository.updatePlayerState(roomId, movedPlayer);

    const othersBeforeMove = snapshot.players.filter((player) => player.id !== me.id);
    const rosterAfterMove = [...othersBeforeMove, movedPlayer];
    const tile = BOARD_TILES.find((candidate) => candidate.id === movedPlayer.position);

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
        setMessage(`دفعت ${rentResult.rentAmount.format()} إيجار على ${tile.name}`);
      }
      // rentResult.success == false هنا يعني العقار ملكك أنت (self-rent) — لا إجراء مطلوب
    }

    await endTurn(movedPlayer.id);
    setIsBusy(false);
  }

  async function handleBuyAccept() {
    if (!pendingBuy || !roomId || !snapshot) return;
    setIsBusy(true);
    const othersBeforeMove = snapshot.players.filter((player) => player.id !== pendingBuy.movedPlayer.id);
    const roster = [...othersBeforeMove, pendingBuy.movedPlayer];
    const result = buyProperty(pendingBuy.movedPlayer, roster, pendingBuy.tileId);

    if (result.success) {
      await gameRepository.updatePlayerState(roomId, result.player);
      await endTurn(result.player.id);
    } else {
      setMessage(BUY_FAILURE_MESSAGES[result.reason]);
      await endTurn(pendingBuy.movedPlayer.id);
    }
    setPendingBuy(null);
    setIsBusy(false);
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
    const result = buildOnProperty(me, tileId);
    if (result.success) {
      await gameRepository.updatePlayerState(roomId, result.player);
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

  const currentPlayerNickname = snapshot.players.find((player) => player.id === snapshot.currentPlayerId)?.nickname;
  const myPropertyTiles: PropertyTile[] = BOARD_TILES.filter(
    (tile): tile is PropertyTile => tile.type === 'property' && me.ownsTile(tile.id),
  );

  return (
    <main className="flex min-h-screen flex-col gap-4 bg-board-bg p-3 text-white sm:p-6">
      <header className="flex items-center justify-between text-sm sm:text-base">
        <span>
          رصيدك: <strong className="text-amber-400">{me.money.format()}</strong>
        </span>
        <span>{isMyTurn ? 'دورك الآن' : `دور: ${currentPlayerNickname ?? '...'}`}</span>
      </header>

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

      {pendingBuy ? (
        <div className="flex flex-col gap-2 rounded-md border border-amber-400 bg-board-tile p-3">
          <p className="text-sm">
            تريد شراء {BOARD_TILES.find((tile) => tile.id === pendingBuy.tileId)?.name}؟
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleBuyAccept}
              disabled={isBusy}
              className="flex-1 rounded-md bg-amber-400 px-3 py-2 font-bold text-board-bg disabled:opacity-50"
            >
              شراء
            </button>
            <button
              type="button"
              onClick={handleBuySkip}
              disabled={isBusy}
              className="flex-1 rounded-md border border-board-line px-3 py-2 disabled:opacity-50"
            >
              تخطي
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleRollDice}
          disabled={!isMyTurn || isBusy}
          className="w-full rounded-md bg-amber-400 px-4 py-3 font-bold text-board-bg disabled:opacity-50"
        >
          ارمِ النرد
        </button>
      )}

      <section>
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
    </main>
  );
}
