import type { BoardTile } from '../../../domain/entities/BoardTile';
import { CORNER_SIZE_PERCENT } from '../../../shared/utils/boardLayout';
import { PropertyCard } from '../shared/PropertyCard';

export interface CenterPanelProps {
  readonly currentPlayerNickname?: string | undefined;
  /** Item 4 — المربع المختار حالياً (أو null لعرض مؤشّر الدور الافتراضي) */
  readonly selectedTile?: BoardTile | null;
}

/** Item 3 — استُبدلت البطاقة الداخلية القديمة (TileInfoCard) بمكوّن PropertyCard المشترك مع BuyPropertyModal */
export function CenterPanel({ currentPlayerNickname, selectedTile }: CenterPanelProps) {
  return (
    <div
      className="absolute flex flex-col items-center justify-center gap-2 overflow-y-auto rounded-lg border border-board-line bg-board-bg p-2"
      style={{
        left: `${CORNER_SIZE_PERCENT}%`,
        top: `${CORNER_SIZE_PERCENT}%`,
        width: `${100 - 2 * CORNER_SIZE_PERCENT}%`,
        height: `${100 - 2 * CORNER_SIZE_PERCENT}%`,
      }}
    >
      {selectedTile ? (
        <PropertyCard tile={selectedTile} />
      ) : (
        <>
          <h2 className="text-xl font-bold text-amber-400 sm:text-3xl">بنك الحظ</h2>
          {currentPlayerNickname ? (
            <p className="text-xs text-gray-300 sm:text-sm">دور: {currentPlayerNickname}</p>
          ) : (
            <p className="text-xs text-gray-500 sm:text-sm">بانتظار بدء اللعبة</p>
          )}
        </>
      )}
    </div>
  );
}
