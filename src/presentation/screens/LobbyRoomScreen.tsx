import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';
import type { GameSnapshot } from '../../domain/interfaces/IGameRepository';
import { ColorAlreadyTakenError } from '../../domain/interfaces/IGameRepository';
import { useGameSession } from '../hooks/useGameSession';
import { TOKEN_COLOR_PALETTE } from '../../shared/constants/gameConfig';
import { Spinner } from '../components/common/Spinner';

const MIN_PLAYERS_TO_START = 2;
/**
 * Item 1: كانت 1000ms — لم نجد أي تأخير غير ضروري حقيقي بمسار startGame نفسه
 * (كتابة Firestore واحدة بسيطة)، لكن قصّرنا القيمة شوي لأنها بحتة تجميلية (مهلة
 * مجاملة بس حتى كل اللاعبين يشوفوا شاشة "اللعبة تبدأ..." قبل الانتقال، مش أي
 * انتظار وظيفي فعلي) — مع إضافة spinner فوري بالزر نفسه (تحت) يغطي الفجوة الحسّية
 * بين الضغطة وظهور شاشة الانتقال، بدل الاعتماد على تقصير المهلة وحدها.
 */
const START_TRANSITION_MS = 600;

export function LobbyRoomScreen() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { userId, gameRepository } = useGameSession();

  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [colorError, setColorError] = useState<string | null>(null);
  /**
   * Bug 1 (السبب الفعلي المؤكَّد): لم يكن فيه أي تحديث تفاؤلي إطلاقاً — الشارة
   * (swatch) كانت تعكس فقط `me.tokenColor`/`hasConfirmedColor` القادمين من
   * snapshot Firestore، فالضغطة كانت "منتظرة" بصرياً لحد اكتمال round-trip كامل
   * (معاملة compare-and-set تقرأ كل مستندات اللاعبين الآخرين ثم تكتب) — وهذا فعلياً
   * مئات الميلي ثانية محسوسة كتجمّد. الإصلاح: حالة محلية تفاؤلية تنعكس فوراً
   * بالضغط، وتُصحَّح لاحقاً بالخلفية (تُصفَّر تلقائياً بمجرد وصول التأكيد الحقيقي
   * من Firestore، أو تُلغى وتظهر رسالة خطأ فقط لو خسر اللاعب فعلياً سباق التوقيت).
   */
  const [optimisticColor, setOptimisticColor] = useState<string | null>(null);
  /** آخر لون طلبه المستخدم فعلياً — يمنع نتيجة معاملة قديمة متأخرة من الكتابة فوق ضغطة أحدث */
  const latestRequestedColorRef = useRef<string | null>(null);

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

  // بمجرد ما snapshot الحقيقي يطابق آخر لون تفاؤلي طلبناه، نصفّره — ما عاد فيه داعي له
  useEffect(() => {
    const me = snapshot?.players.find((player) => player.id === userId) ?? null;
    if (me?.hasConfirmedColor && me.tokenColor === optimisticColor) {
      setOptimisticColor(null);
    }
  }, [snapshot, userId, optimisticColor]);

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

  /**
   * Bug 6: نداء واحد لمعاملة compare-and-set (FirestoreGameRepository.confirmPlayerColor).
   * لو خسر اللاعب سباق التوقيت (لاعب آخر أخذ نفس اللون بنفس اللحظة تقريباً)، الرفض
   * يصل هنا كـColorAlreadyTakenError، ونعرض رسالة واضحة ونطلب يختار غيره — الحالة
   * المعروضة (منتزع/متاح) نفسها بترجع صح تلقائياً بمجرد وصول تحديث الاشتراك.
   */
  async function handleSelectColor(color: string) {
    if (!roomId || !userId) return;
    setColorError(null);
    setOptimisticColor(color); // فوري — ما فيه أي انتظار لشبكة قبل هذا السطر
    latestRequestedColorRef.current = color;

    try {
      await gameRepository.confirmPlayerColor(roomId, userId, color);
      // نجاح: useEffect تحت بيصفّر optimisticColor تلقائياً بمجرد ما snapshot يعكس نفس اللون فعلياً
    } catch (error) {
      // لو المستخدم ضغط لوناً آخر بالمدة اللي انتظرنا فيها الشبكة، هذا الخطأ يخص طلباً قديماً — تجاهله
      if (latestRequestedColorRef.current !== color) return;

      setOptimisticColor(null);
      if (error instanceof ColorAlreadyTakenError) {
        setColorError('هذا اللون تم اختياره للتو، اختر لوناً آخر');
      } else {
        console.error('confirmPlayerColor failed', error);
        setColorError('تعذّر تأكيد اللون، حاول مرة أخرى');
      }
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
  const me = players.find((player) => player.id === userId) ?? null;
  const everyoneConfirmedColor = players.length > 0 && players.every((player) => player.hasConfirmedColor);
  const canStart = isHost && players.length >= MIN_PLAYERS_TO_START && everyoneConfirmedColor;

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
              {!player.hasConfirmedColor && (
                <span className="text-xs text-gray-500">يختار لونه الآن...</span>
              )}
            </li>
          ))}
          {players.length === 0 && (
            <li className="text-sm text-gray-500">بانتظار انضمام اللاعبين...</li>
          )}
        </ul>
      </div>

      {me && (
        <div className="flex w-full flex-col gap-2">
          <span className="text-sm text-gray-300">
            {me.hasConfirmedColor ? 'لونك' : 'اختر لون رمزك'}
          </span>
          <div className="flex flex-wrap gap-2">
            {TOKEN_COLOR_PALETTE.map((color) => {
              const takenBy = players.find(
                (player) => player.tokenColor === color && player.hasConfirmedColor && player.id !== me.id,
              );
              // أثناء انتظار تأكيد Firestore، اللون التفاؤلي هو مصدر الحقيقة البصري —
              // وإلا نرجع للون الحقيقي المؤكَّد من snapshot (Bug 1: هذا بالضبط ما كان ناقصاً)
              const isMine = optimisticColor ? optimisticColor === color : me.tokenColor === color && me.hasConfirmedColor;
              const isDisabled = Boolean(takenBy);

              return (
                <button
                  key={color}
                  type="button"
                  aria-label={takenBy ? `${color} — أخذه ${takenBy.nickname}` : `اختر اللون ${color}`}
                  aria-pressed={isMine}
                  disabled={isDisabled}
                  onClick={() => handleSelectColor(color)}
                  className={[
                    'relative h-9 w-9 rounded-full border-2 transition-transform disabled:cursor-not-allowed',
                    isMine ? 'scale-110 border-white' : 'border-transparent',
                    takenBy ? 'opacity-30' : '',
                  ].join(' ')}
                  style={{ backgroundColor: color }}
                >
                  {isMine && (
                    <Check aria-hidden="true" className="absolute inset-0 m-auto h-4 w-4 text-white" />
                  )}
                </button>
              );
            })}
          </div>
          {colorError && (
            <p role="alert" className="text-xs text-red-400">
              {colorError}
            </p>
          )}
        </div>
      )}

      {isHost ? (
        <button
          type="button"
          disabled={!canStart || isStarting}
          onClick={handleStartGame}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-amber-400 px-4 py-2 font-bold text-board-bg disabled:opacity-50"
        >
          {isStarting && <Spinner className="h-4 w-4 text-board-bg" />}
          {isStarting
            ? 'جاري البدء...'
            : players.length < MIN_PLAYERS_TO_START
              ? `بانتظار لاعب آخر (الحد الأدنى ${MIN_PLAYERS_TO_START})`
              : !everyoneConfirmedColor
                ? 'بانتظار تأكيد الجميع لألوانهم'
                : 'ابدأ اللعبة'}
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
