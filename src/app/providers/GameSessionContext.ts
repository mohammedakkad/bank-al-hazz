import { createContext } from 'react';
import type { IGameRepository } from '../../domain/interfaces/IGameRepository';

export interface GameSessionValue {
  /** uid من Firebase Auth، أو null قبل اكتمال تسجيل الدخول المجهول */
  readonly userId: string | null;
  readonly isAuthReady: boolean;
  readonly gameRepository: IGameRepository;
  readonly nickname: string;
  readonly setNickname: (value: string) => void;
  readonly tokenColor: string;
  readonly setTokenColor: (value: string) => void;
}

export const GameSessionContext = createContext<GameSessionValue | null>(null);
