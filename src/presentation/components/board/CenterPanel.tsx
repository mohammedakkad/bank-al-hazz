export interface CenterPanelProps {
  readonly currentPlayerNickname?: string | undefined;
}

export function CenterPanel({ currentPlayerNickname }: CenterPanelProps) {
  return (
    <div
      className="col-start-2 col-end-11 row-start-2 row-end-11 flex flex-col items-center justify-center gap-2 rounded-lg border border-board-line bg-board-bg"
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
