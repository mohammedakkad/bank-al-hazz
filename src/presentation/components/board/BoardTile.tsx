import { memo } from 'react';
import type { BoardTile as BoardTileData } from '../../../domain/entities/BoardTile';
import { COLOR_GROUP_HEX } from '../../../shared/constants/colorGroups';
import type { BoardSide } from '../../../shared/utils/boardLayout';
import { TILE_ICONS, getUtilityIcon } from './tileIcons';

export interface BoardTileProps {
  readonly tile: BoardTileData;
  readonly isCorner: boolean;
  /** Item 2 — أي ضلع يقع عليه هذا المربع، لتدوير/تموضع شريط لون المجموعة نحو المركز */
  readonly side: BoardSide | null;
  readonly ownerColor?: string | undefined;
  /** Item 4 — مستوى البناء الحالي (0-5) لرسم شارات المنازل/الفندق */
  readonly buildLevel?: number;
  readonly isSelected: boolean;
  readonly onSelect: (tileId: number) => void;
}

/**
 * Item 2 — شريط لون المجموعة يجب يكون دائماً على الحافة المواجهة لمركز اللوحة،
 * وليس ثابتاً بأعلى المربع كما كان سابقاً (صحيح فقط للصف السفلي بالصدفة).
 * بما إن هذا المشروع لا يرسم اللوحة بـSVG فعلياً (تحقّقنا من الكود — تموضع فيزيائي
 * بـleft/top% عادي)، النظير الصحيح لـ"تدوير SVG" هنا هو تموضع مطلق على الحافة
 * الصحيحة من كل مربع حسب ضلعه، بدل محاولة تدوير عنصر بعرض كامل بـCSS transform
 * (اللي كان سيُبقيه بمنتصف المربع بدل تثبيته على حافة فعلية).
 */
function getColorBandStyle(side: BoardSide | null): string {
  switch (side) {
    case 'top':
      return 'absolute bottom-0 left-0 h-1.5 w-full sm:h-2.5'; // يواجه الأسفل (نحو المركز)
    case 'left':
      return 'absolute right-0 top-0 h-full w-1.5 sm:w-2.5'; // يواجه اليمين (نحو المركز)
    case 'right':
      return 'absolute left-0 top-0 h-full w-1.5 sm:w-2.5'; // يواجه اليسار (نحو المركز)
    case 'bottom':
    default:
      return 'absolute left-0 top-0 h-1.5 w-full sm:h-2.5'; // يواجه الأعلى (نحو المركز)
  }
}

/** Item 4 — منازل (مستوى 1-4): مربّعات صغيرة متراصّة بنفس اللون الكلاسيكي (أخضر) لكل المستويات 1-4 */
const HOUSE_MARKER_COLOR = '#3BA776';
/** الفندق (مستوى 5): شارة واحدة مميّزة الشكل واللون تماماً — تستبدل المنازل الأربعة، لا تُضاف عليها */
const HOTEL_MARKER_COLOR = '#E24B4A';

function BuildLevelMarkers({ level }: { readonly level: number }) {
  if (level <= 0) return null;

  if (level >= 5) {
    return (
      <span
        aria-label="فندق"
        title="فندق"
        className="h-2 w-2.5 rounded-sm sm:h-3 sm:w-4"
        style={{ backgroundColor: HOTEL_MARKER_COLOR }}
      />
    );
  }

  return (
    <span className="flex items-center gap-[1px]" aria-label={`${level} منازل`} title={`${level} منازل`}>
      {Array.from({ length: level }, (_, index) => (
        <span
          key={index}
          className="h-1.5 w-1.5 rounded-[1px] sm:h-2 sm:w-2"
          style={{ backgroundColor: HOUSE_MARKER_COLOR }}
        />
      ))}
    </span>
  );
}

function BoardTileComponent({ tile, isCorner, side, ownerColor, buildLevel = 0, isSelected, onSelect }: BoardTileProps) {
  const isProperty = tile.type === 'property';
  const isStart = tile.type === 'start';
  const Icon = tile.type === 'utility' ? getUtilityIcon(tile.name) : TILE_ICONS[tile.type];

  return (
    <button
      type="button"
      onClick={() => onSelect(tile.id)}
      aria-pressed={isSelected}
      aria-label={tile.name}
      className={[
        'relative flex h-full w-full flex-col overflow-hidden bg-board-tile',
        'transition-colors duration-150 ease-out',
        'hover:bg-[#1D2740] focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400',
        isSelected ? 'ring-2 ring-amber-400 ring-inset z-10' : '',
        isCorner
          ? 'z-10 items-center justify-center gap-1 border-2 border-amber-400/70 p-1'
          : 'items-stretch justify-between border border-board-line p-0.5',
      ].join(' ')}
    >
      {isProperty && (
        <span className={getColorBandStyle(side)} style={{ backgroundColor: COLOR_GROUP_HEX[tile.colorGroup] }} aria-hidden="true" />
      )}

      {isProperty ? (
        <span className="flex flex-1 flex-col items-center justify-center gap-0.5 px-0.5 text-center">
          <span aria-hidden="true" className="text-xs leading-none sm:text-base">
            {tile.countryFlag}
          </span>
          <span className="line-clamp-2 text-[9px] font-semibold leading-tight text-white sm:text-xs">
            {tile.name}
          </span>
          <span className="text-[8px] font-bold leading-none text-amber-400 sm:text-[11px]">
            {tile.purchasePrice}
          </span>
          {buildLevel > 0 && (
            <span className="mt-0.5">
              <BuildLevelMarkers level={buildLevel} />
            </span>
          )}
        </span>
      ) : (
        <span className="flex flex-1 flex-col items-center justify-center gap-1 text-center">
          {Icon && (
            <Icon
              aria-hidden="true"
              className={isCorner ? 'h-5 w-5 text-amber-400 sm:h-7 sm:w-7' : 'h-3.5 w-3.5 text-amber-400 sm:h-5 sm:w-5'}
            />
          )}
          <span className={['font-medium leading-tight text-white', isCorner ? 'text-[9px] sm:text-xs' : 'text-[8px] sm:text-[11px]'].join(' ')}>
            {tile.name}
          </span>
          {isStart && <span className="text-[8px] font-bold text-amber-400 sm:text-[11px]">+200 جنيه</span>}
        </span>
      )}

      {ownerColor && (
        <svg
          viewBox="0 0 16 16"
          aria-hidden="true"
          className="absolute left-0 top-0 h-3 w-3 sm:h-4 sm:w-4"
          style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5))' }}
        >
          <path d="M0 0h16L0 16V0z" fill={ownerColor} stroke="white" strokeWidth="0.75" />
        </svg>
      )}
    </button>
  );
}

// memo يمنع إعادة رسم كل الـ40 مربع لما يتحرك لاعب واحد فقط أو يتغير tile واحد.
export const BoardTile = memo(BoardTileComponent);
