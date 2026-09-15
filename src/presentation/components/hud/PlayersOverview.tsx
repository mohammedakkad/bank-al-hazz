import { useCountUp } from '../../hooks/useCountUp';
import type { Player } from '../../../domain/entities/Player';

export interface PlayersOverviewProps {
  readonly players: readonly Player[];
  readonly currentPlayerId: string | null;
}

/**
 * Item 6 — شريط مُلخَّص مضغوط بمال كل اللاعبين، وليس فقط اللاعب المحلي (PlayerHud
 * يعرض مال "أنا" فقط، وهذا هو الفراغ الفعلي المؤكَّد). كل صف لاعب يستخدم useCountUp
 * بشكل مستقل (نفس الأنيميشن المستخدم أصلاً بـPlayerHud لمالي أنا) — أي تغيّر
 * بمال أي لاعب يتحرّك بصرياً عند كل من يشاهد الشاشة، وليس فقط صاحب المال نفسه.
 *
 * الموضع: تحت اللوحة مباشرة وفوق PlayerHud — المنطقة بين اللوحة وشريط النرد
 * كانت فاضية سابقاً (فقط رسائل/سجل الأحداث)، فما فيه أي تزاحم مع اللوحة أو واجهة
 * النرد/الدور الحالية. البطاقة بالمركز (Item 3/4 من مهمة سابقة) مخصَّصة لمعلومات
 * العقار عند الاختيار، فمش مكان مناسب لعرض دائم لكل اللاعبين.
 */
export function PlayersOverview({ players, currentPlayerId }: PlayersOverviewProps) {
  return (
    <div className="flex flex-wrap gap-2 overflow-x-auto">
      {players.map((player) => (
        <PlayerMoneyChip key={player.id} player={player} isCurrentTurn={player.id === currentPlayerId} />
      ))}
    </div>
  );
}

function PlayerMoneyChip({ player, isCurrentTurn }: { readonly player: Player; readonly isCurrentTurn: boolean }) {
  const displayedMoney = useCountUp(player.money.value);

  return (
    <span
      className={[
        'flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 text-xs',
        isCurrentTurn ? 'border-amber-400 bg-board-tile' : 'border-board-line bg-board-bg',
      ].join(' ')}
    >
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: player.tokenColor }} aria-hidden="true" />
      <span className="text-gray-300">{player.nickname}</span>
      <span className="font-bold tabular-nums text-amber-400">{displayedMoney.toLocaleString('ar-EG')}</span>
    </span>
  );
}
