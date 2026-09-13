import { CELL_PERCENT } from '../../../shared/utils/boardLayout';

export interface CenterPanelProps {
  readonly currentPlayerNickname?: string | undefined;
}

export function CenterPanel({ currentPlayerNickname }: CenterPanelProps) {
  return (
    <div
      className="absolute flex flex-col items-center justify-center gap-2 rounded-lg border border-board-line bg-board-bg"
      style={{
        left: `${CELL_PERCENT}%`,
        top: `${CELL_PERCENT}%`,
        width: `${CELL_PERCENT * 9}%`,
        height: `${CELL_PERCENT * 9}%`,
      }}
    >
      <h2 className="text-xl font-bold text-amber-400 sm:text-3xl">بنك الحظ</h2>
      {currentPlayerNickname ? (
        <p className="text-xs text-gray-300 sm:text-sm">دور: {currentPlayerNickname}</p>
      ) : (
        <p className="text-xs text-gray-500 sm:text-sm">بانتظار بدء اللعبة</p>
      )}
    </div>
  );
}
