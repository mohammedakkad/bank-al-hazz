import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BoardTile } from './BoardTile';
import { BOARD_TILES } from '../../../domain/entities/BoardTile';

const JERUSALEM_TILE = BOARD_TILES.find((tile) => tile.id === 6 && tile.type === 'property')!;

function renderTile(buildLevel: number) {
  return render(
    <BoardTile
      tile={JERUSALEM_TILE}
      isCorner={false}
      side="bottom"
      buildLevel={buildLevel}
      isSelected={false}
      onSelect={() => {}}
    />,
  );
}

describe('BoardTile — شارات مستوى البناء (Item 4)', () => {
  it('buildLevel=0 لا يرسم أي شارة إطلاقاً', () => {
    renderTile(0);
    expect(screen.queryByLabelText(/منزل|منازل|فندق/)).not.toBeInTheDocument();
  });

  it('buildLevel=3 يرسم بالضبط 3 مربّعات منازل صغيرة، بدون شارة فندق', () => {
    const { container } = renderTile(3);
    expect(screen.getByLabelText('3 منازل')).toBeInTheDocument();
    expect(screen.queryByLabelText('فندق')).not.toBeInTheDocument();
    // نتحقق من العدد الفعلي للعناصر الصغيرة المتراصّة (مربّع واحد لكل منزل)
    const houseSquares = container.querySelectorAll('[aria-label="3 منازل"] > span');
    expect(houseSquares).toHaveLength(3);
  });

  it('buildLevel=5 يرسم شارة فندق واحدة مميّزة فقط، وصفر مربّعات منازل صغيرة', () => {
    renderTile(5);
    expect(screen.getByLabelText('فندق')).toBeInTheDocument();
    expect(screen.queryByLabelText(/منازل/)).not.toBeInTheDocument();
  });

  it('buildLevel=1..4 يطابق العدد بالضبط لكل مستوى', () => {
    for (const level of [1, 2, 4]) {
      const { unmount } = renderTile(level);
      expect(screen.getByLabelText(`${level} منازل`)).toBeInTheDocument();
      unmount();
    }
  });
});
