import type { BoardTile } from '../../../domain/entities/BoardTile';
import { COLOR_GROUP_HEX } from '../../../shared/constants/colorGroups';
import { CELL_PERCENT } from '../../../shared/utils/boardLayout';
import { calculateAirportRent } from '../../../domain/gameRules/AirportRules';

export interface CenterPanelProps {
  readonly currentPlayerNickname?: string | undefined;
  /** Item 4 — المربع المختار حالياً (أو null لعرض مؤشّر الدور الافتراضي) */
  readonly selectedTile?: BoardTile | null;
}

const BUILD_LEVEL_LABELS = ['بدون بناء', 'منزل 1', 'منزل 2', 'منزل 3', 'منزل 4', 'فندق'] as const;

export function CenterPanel({ currentPlayerNickname, selectedTile }: CenterPanelProps) {
  return (
    <div
      className="absolute flex flex-col items-center justify-center gap-2 overflow-y-auto rounded-lg border border-board-line bg-board-bg p-2"
      style={{
        left: `${CELL_PERCENT}%`,
        top: `${CELL_PERCENT}%`,
        width: `${CELL_PERCENT * 9}%`,
        height: `${CELL_PERCENT * 9}%`,
      }}
    >
      {selectedTile ? (
        <TileInfoCard tile={selectedTile} />
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

/**
 * Item 4: بطاقة معلومات كاملة (سعر + جدول إيجار كل مستويات البناء) — نفس تسلسل
 * المعلومات المعروض أصلاً بـBuyPropertyModal (اسم/علم/سعر) بدون اختراع تصميم
 * جديد، فقط بإضافة جدول الإيجار الكامل غير الموجود هناك.
 */
function TileInfoCard({ tile }: { readonly tile: BoardTile }) {
  if (tile.type === 'property') {
    return (
      <div className="flex w-full flex-col items-center gap-1 overflow-y-auto px-1 text-center">
        <span
          className="h-1.5 w-10 rounded-full sm:h-2 sm:w-16"
          style={{ backgroundColor: COLOR_GROUP_HEX[tile.colorGroup] }}
          aria-hidden="true"
        />
        <span className="text-base sm:text-xl">{tile.countryFlag}</span>
        <h3 className="text-[10px] font-bold sm:text-sm">{tile.name}</h3>
        <p className="text-[8px] text-gray-400 sm:text-xs">السعر: {tile.purchasePrice} جنيه</p>
        <table className="mt-1 w-full text-[7px] sm:text-[10px]">
          <tbody>
            <tr className="text-gray-300">
              <td className="py-0.5 text-right">{BUILD_LEVEL_LABELS[0]}</td>
              <td className="py-0.5 text-left text-amber-400">{tile.baseRent}</td>
            </tr>
            {tile.rentPerLevel.map((rent, index) => (
              <tr key={index} className="text-gray-300">
                <td className="py-0.5 text-right">{BUILD_LEVEL_LABELS[index + 1]}</td>
                <td className="py-0.5 text-left text-amber-400">{rent}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-[7px] text-gray-500 sm:text-[10px]">تكلفة البناء: {tile.buildCost} / مستوى</p>
      </div>
    );
  }

  if (tile.type === 'airport') {
    return (
      <div className="flex w-full flex-col items-center gap-1 px-1 text-center">
        <h3 className="text-[10px] font-bold sm:text-sm">{tile.name}</h3>
        <p className="text-[8px] text-gray-400 sm:text-xs">السعر: {tile.purchasePrice ?? 0} جنيه</p>
        <table className="mt-1 w-full text-[7px] sm:text-[10px]">
          <tbody>
            {[1, 2, 3, 4].map((count) => (
              <tr key={count} className="text-gray-300">
                <td className="py-0.5 text-right">{count} مطارات مملوكة</td>
                <td className="py-0.5 text-left text-amber-400">{calculateAirportRent(count)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (tile.type === 'utility') {
    return (
      <div className="flex w-full flex-col items-center gap-1 px-1 text-center">
        <h3 className="text-[10px] font-bold sm:text-sm">{tile.name}</h3>
        <p className="text-[8px] text-gray-400 sm:text-xs">السعر: {tile.purchasePrice ?? 0} جنيه</p>
        <p className="text-[7px] text-gray-300 sm:text-[10px]">شركة واحدة: 4× مجموع النرد</p>
        <p className="text-[7px] text-gray-300 sm:text-[10px]">الشركتان معاً: 10× مجموع النرد</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1 px-1 text-center">
      <h3 className="text-[10px] font-bold sm:text-sm">{tile.name}</h3>
      {tile.type === 'tax' && (
        <p className="text-[8px] text-gray-400 sm:text-xs">الضريبة: {tile.amount} جنيه</p>
      )}
    </div>
  );
}
