import React from 'react';
import ReactDOM from 'react-dom/client';
import { GameSessionProvider } from './app/providers/GameSessionProvider';
import { AppRoutes } from './presentation/routes';
import './shared/styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GameSessionProvider>
      <AppRoutes />
    </GameSessionProvider>
  </React.StrictMode>,
);
