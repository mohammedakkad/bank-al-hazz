import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import type { GameSnapshot } from '../../domain/interfaces/IGameRepository';
import { useGameSession } from '../hooks/useGameSession';

const MIN_PLAYERS_TO_START = 2;
/** مدة شاشة "اللعبة تبدأ..." — نفس القيمة لكل اللاعبين حتى ينتقلوا معًا تقريبًا بنفس اللحظة */
const START_TRANSITION_MS = 1000;

export function LobbyRoomScreen() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { userId, gameRepository } = useGameSession();

  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // اشتراك حي واحد فقط لهذه الشاشة — يغذي كل من قائمة اللاعبين وإشارة بدء اللعبة معًا
  useEffect(() => {
    if (!roomId) return;
    const unsubscribe = gameRepository.subscribeToGame(roomId, setSnapshot);
    return unsubscribe;
  }, [roomId, gameRepository]);

  // كل عميل (مضيف وغيره) يتفاعل مع نفس الإشارة القادمة من Firestore — مش navigate محلي بس عند المضيف
  useEffect(() => {
    if (snapshot?.status !== 'in-progress' || !roomId) return;
    setIsTransitioning(true);
    const timeout = window.setTimeout(() => {
      navigate(`/game/${roomId}`);
    }, START_TRANSITION_MS);
    return () => window.clearTimeout(timeout);
  }, [snapshot?.status, roomId, navigate]);

  async function handleStartGame() {
    if (!roomId || isStarting) return;
    setIsStarting(true);
    try {
      await gameRepository.startGame(roomId);
      // لا navigate هون — الانتقال يصير لكل اللاعبين معًا عبر الـuseEffect أعلاه
      // لما يوصل status: 'in-progress' من الاشتراك، حتى المضيف نفسه ينتقل بنفس المسار
    } catch {
      setIsStarting(false);
    }
  }

  if (!roomId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-board-bg text-white">
        <p>كود غرفة غير صالح</p>
      </main>
    );
  }

  const players = snapshot?.players ?? [];
  // أول لاعب بالمصفوفة = صاحب الغرفة (مرتّبة بوقت الانضمام من الـrepository)
  const hostId = players[0]?.id ?? null;
  const isHost = userId !== null && userId === hostId;
  const canStart = isHost && players.length >= MIN_PLAYERS_TO_START;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center gap-6 bg-board-bg p-6 text-white">
      <div className="flex flex-col items-center gap-1">
        <span className="text-sm text-gray-400">كود الغرفة</span>
        <span className="text-3xl font-bold tracking-[0.3em] text-amber-400">{roomId}</span>
      </div>

      <div className="w-full flex-1">
        <h2 className="mb-2 text-sm text-gray-300">اللاعبون ({players.length})</h2>
        <ul className="flex flex-col gap-2">
          {players.map((player) => (
            <li
              key={player.id}
              className="flex items-center gap-3 rounded-md border border-board-line bg-board-tile px-3 py-2"
            >
              <span
                className="h-4 w-4 shrink-0 rounded-full"
                style={{ backgroundColor: player.tokenColor }}
                aria-hidden="true"
              />
              <span>{player.nickname}</span>
              {player.id === hostId && (
                <span className="text-xs text-amber-400">(المضيف)</span>
              )}
            </li>
          ))}
          {players.length === 0 && (
            <li className="text-sm text-gray-500">بانتظار انضمام اللاعبين...</li>
          )}
        </ul>
      </div>

      {isHost ? (
        <button
          type="button"
          disabled={!canStart || isStarting}
          onClick={handleStartGame}
          className="w-full rounded-md bg-amber-400 px-4 py-2 font-bold text-board-bg disabled:opacity-50"
        >
          {isStarting
            ? 'جاري البدء...'
            : canStart
              ? 'ابدأ اللعبة'
              : `بانتظار لاعب آخر (الحد الأدنى ${MIN_PLAYERS_TO_START})`}
        </button>
      ) : (
        <p className="text-sm text-gray-400">بانتظار المضيف لبدء اللعبة</p>
      )}

      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-board-bg"
          >
            <motion.span
              animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
              className="h-4 w-4 rounded-full bg-amber-400"
              aria-hidden="true"
            />
            <p className="text-lg font-bold text-white">اللعبة تبدأ...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
