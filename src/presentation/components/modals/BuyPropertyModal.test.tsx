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

  it('Bug 3 — لو فشل onBuy (خطأ Firestore مثلاً)، الزر يرجع تفاعلياً بدل ما يعلّق على "جاري الشراء" للأبد', async () => {
    const onBuy = vi.fn().mockRejectedValue(new Error('permission-denied'));
    render(<BuyPropertyModal tile={JERUSALEM_TILE} currentMoney={1200} onBuy={onBuy} onSkip={vi.fn()} />);

    const buyButton = screen.getByRole('button', { name: 'شراء' });
    await userEvent.click(buyButton);

    // بعد فشل onBuy، الزر يرجع لنصّه الأصلي "شراء" وما يضل معطّلاً، ويظهر خطأ واضح
    expect(await screen.findByText('شراء')).toBeEnabled();
    expect(screen.getByRole('alert')).toHaveTextContent('تعذّر إتمام الشراء');
    expect(screen.getByRole('button', { name: 'تخطي' })).toBeEnabled();
  });

  it('Bug 3 — تصفير حالة "جاري الشراء" تلقائياً لو تغيّر العقار المعروض (استمرار دور بـdoubles على عقار ثانٍ)', async () => {
    const onBuy = vi.fn().mockImplementation(() => new Promise<void>(() => {})); // يبقى معلّقاً أبداً بقصد
    const { rerender } = render(
      <BuyPropertyModal tile={JERUSALEM_TILE} currentMoney={1200} onBuy={onBuy} onSkip={vi.fn()} />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'شراء' }));
    expect(screen.getByText('...جارِ الشراء')).toBeInTheDocument();

    const SECOND_TILE = BOARD_TILES.find((tile) => tile.id === 8) as PropertyTile; // حلب
    rerender(<BuyPropertyModal tile={SECOND_TILE} currentMoney={1200} onBuy={vi.fn()} onSkip={vi.fn()} />);

    // نفس نسخة المكوّن أُعيد استخدامها لعقار جديد تماماً — يجب ألا يرث حالة "جاري الشراء" القديمة
    expect(await screen.findByText('شراء')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'شراء' })).toBeEnabled();
  });
});
