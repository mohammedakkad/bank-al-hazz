import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Board } from './Board';
import { DEMO_PLAYERS } from './demoPlayers';

describe('Board', () => {
  it('يرسم الـ40 مربع كاملة', () => {
    render(<Board players={DEMO_PLAYERS} />);
    const tiles = screen.getAllByRole('button');
    expect(tiles).toHaveLength(40);
  });

  it('يرسم رمز لكل لاعب', () => {
    render(<Board players={DEMO_PLAYERS} />);
    for (const player of DEMO_PLAYERS) {
      expect(screen.getByLabelText(player.nickname)).toBeInTheDocument();
    }
  });

  it('يبدّل حالة التحديد عند الضغط على مربع', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    render(<Board players={[]} />);
    const jerusalemTile = screen.getByLabelText('القدس');
    await userEvent.click(jerusalemTile);
    expect(jerusalemTile).toHaveAttribute('aria-pressed', 'true');
  });
});
