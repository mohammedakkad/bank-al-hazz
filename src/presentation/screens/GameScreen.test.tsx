import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { GameScreen } from './GameScreen';
import { GameSessionContext, type GameSessionValue } from '../../app/providers/GameSessionContext';
import { Player } from '../../domain/entities/Player';
import { Money } from '../../domain/valueObjects/Money';
import { createInitialDeckState } from '../../domain/gameRules/CardDeck';
import type { GameSnapshot, IGameRepository } from '../../domain/interfaces/IGameRepository';

/**
 * نموذج DiceRoller نفسه (وليس Math.random) — DicePair.tsx يستهلك Math.random بشكل
 * مستقل تماماً لأجل رسوم التنطيط البصرية أثناء التحريك، فيبعثر أي قيم Math.random
 * محقونة لأغراض تحديد نتيجة النرد الفعلية. تثبيت rollDice نفسها أدق وأوثق.
 */
vi.mock('../../domain/gameRules/DiceRoller', () => ({
  rollDice: vi.fn(() => ({ die1: 4, die2: 5, total: 9, isDouble: false })),
}));

function makeMockRepository(): IGameRepository & {
  emitSnapshot: (snapshot: GameSnapshot) => void;
} {
  let onSnapshotUpdate: ((snapshot: GameSnapshot) => void) | null = null;

  const repo: IGameRepository & { emitSnapshot: (snapshot: GameSnapshot) => void } = {
    createGame: vi.fn().mockResolvedValue('room1'),
    joinGame: vi.fn().mockResolvedValue(undefined),
    confirmPlayerColor: vi.fn().mockResolvedValue(undefined),
    startGame: vi.fn().mockResolvedValue(undefined),
    subscribeToGame: vi.fn((_gameId: string, onUpdate: (snapshot: GameSnapshot) => void) => {
      onSnapshotUpdate = onUpdate;
      return () => {
        onSnapshotUpdate = null;
      };
    }),
    updatePlayerState: vi.fn().mockResolvedValue(undefined),
    advanceTurn: vi.fn().mockResolvedValue(undefined),
    logEvent: vi.fn().mockResolvedValue(undefined),
    startAuction: vi.fn().mockResolvedValue(undefined),
    placeAuctionBid: vi.fn().mockResolvedValue(undefined),
    passAuctionBid: vi.fn().mockResolvedValue(undefined),
    endAuction: vi.fn().mockResolvedValue(undefined),
    updateDeckState: vi.fn().mockResolvedValue(undefined),
    subscribeToLog: vi.fn((_gameId: string, onUpdate: (entries: readonly []) => void) => {
      onUpdate([]);
      return () => {};
    }),
    emitSnapshot: (snapshot: GameSnapshot) => {
      onSnapshotUpdate?.(snapshot);
    },
  };

  return repo;
}

function makeSnapshot(players: readonly Player[], overrides: Partial<GameSnapshot> = {}): GameSnapshot {
  return {
    gameId: 'room1',
    status: 'in-progress',
    currentPlayerId: players[0]?.id ?? null,
    turnNumber: 1,
    players,
    activeAuction: null,
    deckState: createInitialDeckState(),
    ...overrides,
  };
}

function renderGameScreen(repo: IGameRepository, userId: string) {
  const sessionValue: GameSessionValue = {
    userId,
    isAuthReady: true,
    gameRepository: repo,
    nickname: 'أحمد',
    setNickname: vi.fn(),
    tokenColor: '#E24B4A',
    setTokenColor: vi.fn(),
  };

  return render(
    <GameSessionContext.Provider value={sessionValue}>
      <MemoryRouter initialEntries={['/game/room1']}>
        <Routes>
          <Route path="/game/:roomId" element={<GameScreen />} />
          <Route path="/lobby/:roomId" element={<div>lobby</div>} />
        </Routes>
      </MemoryRouter>
    </GameSessionContext.Provider>,
  );
}

describe('GameScreen — Bug 2 & Bug 3 regression', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('Bug 2 — نقر متكرر وسريع على "ارمِ النرد" لا يطبّق أكثر من رمية واحدة فعلياً', async () => {
    const repo = makeMockRepository();
    const me = Player.create('p1', 'أحمد', '#E24B4A', Money.of(1200));
    renderGameScreen(repo, 'p1');

    repo.emitSnapshot(makeSnapshot([me]));

    const rollButton = await screen.findByRole('button', { name: /ارمِ النرد/ });

    // نقرتان متتاليتان بأسرع ما يمكن، بدون انتظار بين الاثنتين — هذا بالضبط سيناريو Bug 2
    fireEvent.click(rollButton);
    fireEvent.click(rollButton);
    fireEvent.click(rollButton);

    await waitFor(() => {
      expect(repo.updatePlayerState).toHaveBeenCalled();
    });

    // ننتظر اكتمال أي سلسلة async متبقية (تأخير حركة النرد) قبل التأكد من العدد النهائي
    await new Promise((resolve) => setTimeout(resolve, 700));

    // لو الحارس (ref guard) يعمل صح، رمية واحدة فقط تُطبَّق فعلياً — نقرة واحدة فقط أدّت لكتابة حالة اللاعب
    expect(repo.updatePlayerState).toHaveBeenCalledTimes(1);
  }, 10000);

  it('Bug 3 — فشل كتابة السجل (logEvent) غير الحرجة لا يُظهر رسالة "فشل الشراء" رغم نجاح الشراء الفعلي', async () => {
    const repo = makeMockRepository();
    // فشل مرة واحدة فقط لكتابة سجل "تم الشراء" تحديداً — بقية كتابات السجل (مثل حركة اللاعب) تنجح كالمعتاد
    repo.logEvent = vi.fn().mockImplementation((_gameId: string, entry: { type: string }) => {
      if (entry.type === 'property-bought') {
        return Promise.reject(new Error('log write failed'));
      }
      return Promise.resolve(undefined);
    });

    const me = Player.create('p1', 'أحمد', '#E24B4A', Money.of(1200));
    renderGameScreen(repo, 'p1');
    repo.emitSnapshot(makeSnapshot([me]));

    const rollButton = await screen.findByRole('button', { name: /ارمِ النرد/ });
    fireEvent.click(rollButton);

    // مودال الشراء يجب يظهر (هبطنا على عقار غير مملوك)
    const buyButton = await screen.findByRole('button', { name: 'شراء' }, { timeout: 3000 });
    fireEvent.click(buyButton);

    // الكتابة الجوهرية تنجح، وكتابة السجل تفشل — يجب ألا تظهر رسالة "تعذّر إتمام الشراء" أبداً
    await waitFor(() => {
      expect(repo.updatePlayerState).toHaveBeenCalled();
    });
    await new Promise((resolve) => setTimeout(resolve, 700));

    expect(screen.queryByText(/تعذّر إتمام الشراء/)).not.toBeInTheDocument();
    // تأكيد إضافي: الشراء نجح فعلياً (العقار انتقل لملكية اللاعب بالكتابة المرسَلة لـupdatePlayerState)
    const updatedPlayerArg = (repo.updatePlayerState as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[1] as Player;
    expect(updatedPlayerArg.ownsTile(9)).toBe(true);
  }, 10000);
});
