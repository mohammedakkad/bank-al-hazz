import { useContext } from 'react';
import { GameSessionContext, type GameSessionValue } from '../../app/providers/GameSessionContext';

export function useGameSession(): GameSessionValue {
  const context = useContext(GameSessionContext);
  if (!context) {
    throw new Error('useGameSession must be used within a GameSessionProvider');
  }
  return context;
}
