import { motion } from 'framer-motion';
import type { DiceResult } from '../../../domain/gameRules/DiceRoller';
import { useCountUp } from '../../hooks/useCountUp';
import { DicePair } from './DicePair';

export interface PlayerHudProps {
  readonly myMoney: number;
  readonly isMyTurn: boolean;
  readonly currentPlayerNickname: string;
  readonly currentPlayerColor: string;
  readonly isRolling: boolean;
  readonly lastDiceResult: DiceResult | null;
  readonly onRollDice: () => void;
  readonly disabled: boolean;
}

export function PlayerHud({
  myMoney,
  isMyTurn,
  currentPlayerNickname,
  currentPlayerColor,
  isRolling,
  lastDiceResult,
  onRollDice,
  disabled,
}: PlayerHudProps) {
  const animatedMoney = useCountUp(myMoney);

  return (
    <div
      className="sticky bottom-0 z-30 flex items-center justify-between gap-3 border-t border-board-line bg-board-tile px-3 py-3"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-[10px] text-gray-400 sm:text-xs">رصيدك</span>
        <span className="text-lg font-bold text-amber-400 tabular-nums sm:text-xl">
          {animatedMoney.toLocaleString('ar-EG')}
        </span>
      </div>

      <div className="flex flex-1 items-center justify-center gap-2 overflow-hidden">
        <motion.span
          className="h-2.5 w-2.5 shrink-0 rounded-full sm:h-3 sm:w-3"
          style={{ backgroundColor: currentPlayerColor }}
          animate={isMyTurn ? { boxShadow: ['0 0 0px', '0 0 8px', '0 0 0px'] } : { boxShadow: '0 0 0px' }}
          transition={isMyTurn ? { duration: 1.2, repeat: Infinity } : { duration: 0 }}
        />
        <span className="truncate text-xs text-gray-200 sm:text-sm">
          {isMyTurn ? 'دورك الآن' : `دور ${currentPlayerNickname}`}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <DicePair result={lastDiceResult} isRolling={isRolling} />
        <button
          type="button"
          onClick={onRollDice}
          disabled={disabled || !isMyTurn}
          className="rounded-md bg-amber-400 px-3 py-2 text-xs font-bold text-board-bg disabled:opacity-40 sm:px-4 sm:text-sm"
        >
          ارمِ النرد
        </button>
      </div>
    </div>
  );
}
