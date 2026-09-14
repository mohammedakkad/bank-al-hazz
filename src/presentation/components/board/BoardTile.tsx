import { memo } from 'react';
import type { BoardTile as BoardTileData } from '../../../domain/entities/BoardTile';
import { COLOR_GROUP_HEX } from '../../../shared/constants/colorGroups';
import { TILE_ICONS, getUtilityIcon } from './tileIcons';

export interface BoardTileProps {
  readonly tile: BoardTileData;
  readonly isCorner: boolean;
  readonly ownerColor?: string | undefined;
  readonly isSelected: boolean;
  readonly onSelect: (tileId: number) => void;
}

function BoardTileComponent({ tile, isCorner, ownerColor, isSelected, onSelect }: BoardTileProps) {
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
        // الزوايا الأربع (البداية/السجن/وقوف حر/اذهب للسجن) بنفس البروز البصري تماماً —
        // Bug 2 كان البداية تحديداً بلا حدود مميّزة رغم إن باقي الزوايا كانت كذلك أصلاً
        // بنفس شرط isCorner، فقط الحدود اللونية كانت ناقصة على المستوى العام لكل الزوايا.
        isCorner
          ? 'z-10 items-center justify-center gap-1 border-2 border-amber-400/70 p-1'
          : 'items-stretch justify-between border border-board-line p-0.5',
      ].join(' ')}
    >
      {isProperty && (
        <span
          className="block h-2 w-full shrink-0 sm:h-3"
          style={{ backgroundColor: COLOR_GROUP_HEX[tile.colorGroup] }}
          aria-hidden="true"
        />
      )}

      {isProperty ? (
        <span className="flex flex-1 flex-col items-center justify-center gap-0.5 px-0.5 text-center">
          <span aria-hidden="true" className="text-xs leading-none sm:text-base">
            {tile.countryFlag}
          </span>
          {/*
           * Bug 2 (السبب الفعلي المؤكَّد): السعر كان معروضاً فعلياً بالكود من قبل،
           * لكن بخط 6px/9px فقط — غير مقروء عملياً على شاشة موبايل حقيقية (كل مربع
           * ~30-70px بالعرض)، فكان يُرى وكأنه "غير موجود إطلاقاً". رفعت التسلسل
           * الهرمي كاملاً (اسم أكبر/أوضح، سعر أصغر لكن لسا مقروء + لون كهرماني
           * بارز بدل رمادي باهت) بدل تكبير رقم عشوائي واحد بمعزل عن الباقي.
           */}
          <span className="line-clamp-2 text-[9px] font-semibold leading-tight text-white sm:text-xs">
            {tile.name}
          </span>
          <span className="text-[8px] font-bold leading-none text-amber-400 sm:text-[11px]">
            {tile.purchasePrice}
          </span>
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
          {/* Bug 2: تغذية راجعة دائمة ("لمّة" مونوبولي الكلاسيكية) إن الهبوط/المرور من هنا يمنح 200 جنيه */}
          {isStart && <span className="text-[8px] font-bold text-amber-400 sm:text-[11px]">+200 جنيه</span>}
        </span>
      )}

      {ownerColor && (
        // Bug 4: شارة "علم ملكية" مثلّثة بزاوية المربع — شكل مختلف كلياً عن دبّوس
        // اللاعب الدائري بمنتصف المربع (PlayerToken.tsx)، فلا يلتبس أحدهما بالآخر
        // حتى لو تطابق اللون صدفة، ويبقى ظاهراً حتى لو وقف لاعب فوق نفس المربع
        // لأنه مثبّت بزاوية المربع نفسها وليس بمنتصفه.
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
