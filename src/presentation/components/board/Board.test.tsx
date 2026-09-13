import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Board } from './Board';
import { DEMO_PLAYERS } from './demoPlayers';
import { Player } from '../../../domain/entities/Player';
import { Money } from '../../../domain/valueObjects/Money';

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

  it('Bug 5 — لو وصلت players بمدخلين لنفس المعرّف (بيانات مكرَّرة)، يُرسم رمز واحد فقط لهذا اللاعب', () => {
    const original = Player.create('dup-1', 'أحمد الأصلي', '#E24B4A', Money.of(1200)).moveTo(6);
    const duplicate = Player.create('dup-1', 'أحمد المكرَّر', '#E24B4A', Money.of(1200)).moveTo(6);

    render(<Board players={[original, duplicate]} />);

    // دمج دفاعي بمعرّف اللاعب: أول ظهور فقط هو من يُرسم، مهما كان مصدر التكرار
    expect(screen.getAllByRole('img')).toHaveLength(1);
    expect(screen.getByLabelText('أحمد الأصلي')).toBeInTheDocument();
    expect(screen.queryByLabelText('أحمد المكرَّر')).not.toBeInTheDocument();
  });
});
