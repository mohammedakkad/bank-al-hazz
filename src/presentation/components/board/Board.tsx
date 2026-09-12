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
 */
function groupPlayersByPosition(players: readonly Player[]): ReadonlyMap<number, readonly Player[]> {
  const grouped = new Map<number, Player[]>();
  for (const player of players) {
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
