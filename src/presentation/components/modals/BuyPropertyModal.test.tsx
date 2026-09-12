import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BuyPropertyModal } from './BuyPropertyModal';
import { BOARD_TILES, type PropertyTile } from '../../../domain/entities/BoardTile';

const JERUSALEM_TILE = BOARD_TILES.find((tile) => tile.id === 6) as PropertyTile;

describe('BuyPropertyModal', () => {
  it('لا يعرض شيئاً لو tile فاضي (null)', () => {
    render(<BuyPropertyModal tile={null} currentMoney={1200} onBuy={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.queryByText('شراء')).not.toBeInTheDocument();
  });

  it('يعرض بيانات العقار الصحيحة', () => {
    render(<BuyPropertyModal tile={JERUSALEM_TILE} currentMoney={1200} onBuy={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByText('القدس')).toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.textContent === '١٠٠ جنيه')).toBeInTheDocument();
  });

  it('يستدعي onBuy عند الضغط على شراء', async () => {
    const onBuy = vi.fn().mockResolvedValue(undefined);
    render(<BuyPropertyModal tile={JERUSALEM_TILE} currentMoney={1200} onBuy={onBuy} onSkip={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'شراء' }));
    expect(onBuy).toHaveBeenCalledOnce();
  });

  it('يستدعي onSkip عند الضغط على تخطي، وليس onBuy', async () => {
    const onBuy = vi.fn();
    const onSkip = vi.fn();
    render(<BuyPropertyModal tile={JERUSALEM_TILE} currentMoney={1200} onBuy={onBuy} onSkip={onSkip} />);
    await userEvent.click(screen.getByRole('button', { name: 'تخطي' }));
    expect(onSkip).toHaveBeenCalledOnce();
    expect(onBuy).not.toHaveBeenCalled();
  });
});
