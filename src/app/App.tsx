import { Board } from '../presentation/components/board/Board';
import { DEMO_PLAYERS } from '../presentation/components/board/demoPlayers';

export default function App() {
  return (
    <main className="flex min-h-screen flex-col items-center gap-4 bg-board-bg p-3 text-white sm:p-6">
      <h1 className="text-lg font-bold sm:text-2xl">بنك الحظ</h1>
      <Board players={DEMO_PLAYERS} currentPlayerId="p1" />
    </main>
  );
}
