import { useCallback, useMemo, useState } from 'react';
import { BOARD_TILES } from '../../../domain/entities/BoardTile';
import type { Player } from '../../../domain/entities/Player';
import { getTileBoxPercent, isCornerTile } from '../../../shared/utils/boardLayout';
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
       * Bug 1 (الإصلاح الجذري): ما عاد فيه أي اعتماد على CSS Grid line numbers ولا
       * على أي خاصية اتجاهية (dir/direction) إطلاقاً — كل موضع (مربعات ورموز) يُحسب
       * بـleft/top فيزيائية بحتة عبر getTileBoxPercent/getTileCenterPercent
       * (boardLayout.ts)، وهما المصدر الوحيد لأي إحداثي بهذا المكوّن. لا حاجة لـ
       * dir="ltr" بعد الآن لأن left/top لا تتأثران بـdirection من الأساس.
       */
      className="relative mx-auto aspect-square w-full max-w-4xl bg-board-bg p-2 sm:p-4"
      role="group"
      aria-label="لوحة اللعبة"
    >
      <CenterPanel currentPlayerNickname={currentPlayerNickname} />

      {BOARD_TILES.map((tile) => {
        const box = getTileBoxPercent(tile.id);
        const ownership = ownershipByTileId?.get(tile.id);

        return (
          <div key={tile.id} className="absolute" style={box}>
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
