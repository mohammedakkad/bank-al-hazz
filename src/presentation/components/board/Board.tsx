import { useCallback, useMemo, useState } from 'react';
import { BOARD_TILES } from '../../../domain/entities/BoardTile';
import type { Player } from '../../../domain/entities/Player';
import { BOARD_GRID_SIZE, TILE_GRID_POSITIONS, isCornerTile } from '../../../shared/utils/boardLayout';
import { BoardTile } from './BoardTile';
import { PlayerToken } from './PlayerToken';
import { CenterPanel } from './CenterPanel';

export interface PropertyOwnership {
  readonly ownerId: string;
  readonly ownerColor: string;
}

export interface BoardProps {
  readonly players: readonly Player[];
  readonly ownershipByTileId?: ReadonlyMap<number, PropertyOwnership>;
  readonly currentPlayerId?: string | undefined;
  readonly onTileSelect?: (tileId: number) => void;
}

/**
 * يبني خريطة (tileId -> لاعبين واقفين عليه) مرة واحدة لكل تغيّر بقائمة اللاعبين،
 * بدل فلترة المصفوفة كاملة 40 مرة (مرة لكل مربع) عند كل render.
 *
 * دمج دفاعي بحسب player.id (Bug 5): حتى لو وصلت `players` بمدخلين لنفس المعرّف
 * (خلل بمصدر البيانات لاحقاً، أو انضمام مزدوج)، هذا الحد يمنع ظهور رمزين لنفس
 * اللاعب على اللوحة — نتيجة كل معرّف تُبنى من أول ظهور له فقط بالمصفوفة.
 */
function groupPlayersByPosition(players: readonly Player[]): ReadonlyMap<number, readonly Player[]> {
  const seenPlayerIds = new Set<string>();
  const grouped = new Map<number, Player[]>();
  for (const player of players) {
    if (seenPlayerIds.has(player.id)) continue;
    seenPlayerIds.add(player.id);

    const existing = grouped.get(player.position);
    if (existing) {
      existing.push(player);
    } else {
      grouped.set(player.position, [player]);
    }
  }
  return grouped;
}

export function Board({ players, ownershipByTileId, currentPlayerId, onTileSelect }: BoardProps) {
  const [selectedTileId, setSelectedTileId] = useState<number | null>(null);

  const playersByTile = useMemo(() => groupPlayersByPosition(players), [players]);

  const currentPlayerNickname = useMemo(
    () => players.find((player) => player.id === currentPlayerId)?.nickname,
    [players, currentPlayerId],
  );

  const handleSelect = useCallback(
    (tileId: number) => {
      setSelectedTileId((previous) => (previous === tileId ? null : tileId));
      onTileSelect?.(tileId);
    },
    [onTileSelect],
  );

  return (
    <div
      /**
       * dir="ltr" هنا مقصود ومهم: الصفحة كاملة dir="rtl" (index.html)، وCSS Grid يفسّر
       * أرقام الأعمدة الصريحة (gridColumn: 1..11) بالنسبة لحافة "البداية المنطقية"،
       * وهذه الحافة في RTL هي اليمين الفعلي وليس اليسار. بما إن TILE_GRID_POSITIONS
       * (boardLayout.ts) يحسب col=1 على أساس إنه أقصى اليسار الفعلي (كما لو كانت
       * الحاوية LTR)، فبدون هذا الـdir الصريح كانت اللوحة كلها تُعرض معكوسة أفقياً
       * مقارنة بما يحسبه boardLayout.ts — وهذا بالضبط ما كان يُظهر رمز اللاعب الجديد
       * عند "وقوف حر" (أعلى اليمين فعلياً) بدل "البداية" (أسفل اليمين فعلياً) لأي عين
       * تراقب اللوحة بافتراض اتجاه القراءة العربي الطبيعي. عزل هذه الحاوية بـdir="ltr"
       * يضمن إن عمود 1 = أقصى اليسار الفعلي دائماً، بغض النظر عن اتجاه الصفحة المحيطة —
       * وهو نفس الحل المتّبع لأي شبكة/خريطة/رسم بياني داخل واجهة RTL.
       */
      dir="ltr"
      className="mx-auto grid aspect-square w-full max-w-3xl gap-0 bg-board-bg p-2 sm:p-4"
      style={{
        gridTemplateColumns: `repeat(${BOARD_GRID_SIZE}, 1fr)`,
        gridTemplateRows: `repeat(${BOARD_GRID_SIZE}, 1fr)`,
      }}
      role="group"
      aria-label="لوحة اللعبة"
    >
      <CenterPanel currentPlayerNickname={currentPlayerNickname} />

      {BOARD_TILES.map((tile) => {
        const gridPosition = TILE_GRID_POSITIONS.get(tile.id);
        if (!gridPosition) return null;
        const ownership = ownershipByTileId?.get(tile.id);

        return (
          <div
            key={tile.id}
            style={{ gridRow: gridPosition.row, gridColumn: gridPosition.col }}
          >
            <BoardTile
              tile={tile}
              isCorner={isCornerTile(tile.id)}
              ownerColor={ownership?.ownerColor}
              isSelected={selectedTileId === tile.id}
              onSelect={handleSelect}
            />
          </div>
        );
      })}

      {Array.from(playersByTile.entries()).flatMap(([, tilePlayers]) =>
        tilePlayers.map((player, stackIndex) => (
          <PlayerToken
            key={player.id}
            nickname={player.nickname}
            color={player.tokenColor}
            position={player.position}
            stackIndex={stackIndex}
          />
        )),
      )}
    </div>
  );
}
