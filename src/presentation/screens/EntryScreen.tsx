import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Player } from '../../domain/entities/Player';
import { Money } from '../../domain/valueObjects/Money';
import { useGameSession } from '../hooks/useGameSession';
import { validateNickname } from '../../shared/utils/nicknameValidation';
import { normalizeRoomCode } from '../../shared/utils/roomCode';
import { STARTING_MONEY_AMOUNT, TOKEN_COLOR_PALETTE } from '../../shared/constants/gameConfig';

type EntryMode = 'idle' | 'join';

export function EntryScreen() {
  const navigate = useNavigate();
  const { userId, isAuthReady, gameRepository, nickname, setNickname, tokenColor, setTokenColor } =
    useGameSession();

  const [mode, setMode] = useState<EntryMode>('idle');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = isAuthReady && userId !== null && !isSubmitting;

  function buildPlayer(): Player | null {
    const nicknameResult = validateNickname(nickname);
    if (!nicknameResult.valid) {
      setErrorMessage('الاسم يجب أن يكون بين 2 و20 حرفاً');
      return null;
    }
    if (!userId) {
      setErrorMessage('جاري تجهيز الجلسة، حاول بعد لحظات');
      return null;
    }
    return Player.create(userId, nickname.trim(), tokenColor, Money.of(STARTING_MONEY_AMOUNT));
  }

  async function handleCreateRoom(event: FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    const player = buildPlayer();
    if (!player) return;

    setIsSubmitting(true);
    try {
      const roomId = await gameRepository.createGame(player);
      navigate(`/lobby/${roomId}`);
    } catch {
      setErrorMessage('تعذّر إنشاء الغرفة، حاول مرة أخرى');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleJoinRoom(event: FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    const player = buildPlayer();
    if (!player) return;

    const roomId = normalizeRoomCode(roomCodeInput);
    if (roomId.length === 0) {
      setErrorMessage('أدخل كود الغرفة');
      return;
    }

    setIsSubmitting(true);
    try {
      await gameRepository.joinGame(roomId, player);
      navigate(`/lobby/${roomId}`);
    } catch {
      setErrorMessage('تعذّر الانضمام، تأكد من صحة الكود');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-6 bg-board-bg p-6 text-white">
      <h1 className="text-2xl font-bold">بنك الحظ</h1>

      <div className="flex w-full flex-col gap-2">
        <label htmlFor="nickname" className="text-sm text-gray-300">
          اسمك
        </label>
        <input
          id="nickname"
          type="text"
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          maxLength={20}
          placeholder="اكتب اسمك هنا"
          className="rounded-md border border-board-line bg-board-tile px-3 py-2 text-white outline-none focus:border-amber-400"
        />
      </div>

      <div className="flex w-full flex-col gap-2">
        <span className="text-sm text-gray-300">لون رمزك</span>
        <div className="flex gap-2">
          {TOKEN_COLOR_PALETTE.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={`اختر اللون ${color}`}
              aria-pressed={tokenColor === color}
              onClick={() => setTokenColor(color)}
              className={[
                'h-8 w-8 rounded-full border-2 transition-transform',
                tokenColor === color ? 'scale-110 border-white' : 'border-transparent',
              ].join(' ')}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      {errorMessage && (
        <p role="alert" className="text-sm text-red-400">
          {errorMessage}
        </p>
      )}

      {mode === 'idle' ? (
        <div className="flex w-full flex-col gap-3">
          <form onSubmit={handleCreateRoom}>
            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-md bg-amber-400 px-4 py-2 font-bold text-board-bg disabled:opacity-50"
            >
              إنشاء غرفة
            </button>
          </form>
          <button
            type="button"
            onClick={() => setMode('join')}
            className="w-full rounded-md border border-board-line px-4 py-2 text-white"
          >
            الانضمام لغرفة
          </button>
        </div>
      ) : (
        <form onSubmit={handleJoinRoom} className="flex w-full flex-col gap-3">
          <input
            type="text"
            value={roomCodeInput}
            onChange={(event) => setRoomCodeInput(event.target.value)}
            placeholder="كود الغرفة"
            className="rounded-md border border-board-line bg-board-tile px-3 py-2 text-center uppercase tracking-widest text-white outline-none focus:border-amber-400"
          />
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-md bg-amber-400 px-4 py-2 font-bold text-board-bg disabled:opacity-50"
          >
            انضمام
          </button>
          <button
            type="button"
            onClick={() => setMode('idle')}
            className="w-full text-sm text-gray-400"
          >
            رجوع
          </button>
        </form>
      )}
    </main>
  );
}
