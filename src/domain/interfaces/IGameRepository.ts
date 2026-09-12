import type { Player } from '../entities/Player';

export interface GameSnapshot {
  readonly gameId: string;
  readonly status: 'lobby' | 'in-progress' | 'finished';
  readonly currentPlayerId: string | null;
  readonly turnNumber: number;
  readonly players: readonly Player[];
}

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
  /** ينقل حالة اللعبة من 'lobby' إلى 'in-progress' — يستدعيها المضيف فقط عند الضغط على "ابدأ اللعبة" */
  startGame(gameId: string): Promise<void>;
  subscribeToGame(gameId: string, onUpdate: (snapshot: GameSnapshot) => void): () => void;
  updatePlayerState(gameId: string, player: Player): Promise<void>;
  advanceTurn(gameId: string, nextPlayerId: string): Promise<void>;
}
