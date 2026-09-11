import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { GameSessionContext, type GameSessionValue } from './GameSessionContext';
import { ensureAnonymousSession, onAuthStateChange } from '../../infrastructure/firebase/authService';
import { FirestoreGameRepository } from '../../infrastructure/firebase/FirestoreGameRepository';
import { TOKEN_COLOR_PALETTE } from '../../shared/constants/gameConfig';

export interface GameSessionProviderProps {
  readonly children: ReactNode;
}

export function GameSessionProvider({ children }: GameSessionProviderProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [nickname, setNickname] = useState('');
  const [tokenColor, setTokenColor] = useState<string>(TOKEN_COLOR_PALETTE[0] ?? '#E24B4A');

  // مثيل واحد ثابت للـrepository طوال عمر التطبيق (بدون إعادة إنشاء كل render)
  const gameRepository = useMemo(() => new FirestoreGameRepository(), []);

  useEffect(() => {
    void ensureAnonymousSession();

    const unsubscribe = onAuthStateChange((user) => {
      setUserId(user?.uid ?? null);
      setIsAuthReady(true);
    });

    return unsubscribe;
  }, []);

  const value: GameSessionValue = {
    userId,
    isAuthReady,
    gameRepository,
    nickname,
    setNickname,
    tokenColor,
    setTokenColor,
  };

  return <GameSessionContext.Provider value={value}>{children}</GameSessionContext.Provider>;
}
