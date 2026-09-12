import { describe, it, expect, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlayerHud } from './PlayerHud';

function renderHud(overrides: Partial<ComponentProps<typeof PlayerHud>> = {}) {
  const onRollDice = vi.fn();
  const props: ComponentProps<typeof PlayerHud> = {
    myMoney: 1200,
    isMyTurn: true,
    currentPlayerNickname: 'أحمد',
    currentPlayerColor: '#E24B4A',
    isRolling: false,
    lastDiceResult: null,
    onRollDice,
    disabled: false,
    ...overrides,
  };
  render(<PlayerHud {...props} />);
  return { onRollDice };
}

describe('PlayerHud', () => {
  it('يظهر "دورك الآن" لما يكون دور اللاعب المحلي', () => {
    renderHud({ isMyTurn: true });
    expect(screen.getByText('دورك الآن')).toBeInTheDocument();
  });

  it('يظهر اسم اللاعب صاحب الدور لما ما يكون دور اللاعب المحلي', () => {
    renderHud({ isMyTurn: false, currentPlayerNickname: 'سارة' });
    expect(screen.getByText('دور سارة')).toBeInTheDocument();
  });

  it('زر ارمِ النرد مفعّل بدوري ومعطّل بدور غيري', () => {
    const { rerender } = render(
      <PlayerHud
        myMoney={1200}
        isMyTurn={true}
        currentPlayerNickname="أحمد"
        currentPlayerColor="#E24B4A"
        isRolling={false}
        lastDiceResult={null}
        onRollDice={() => {}}
        disabled={false}
      />,
    );
    expect(screen.getByRole('button', { name: 'ارمِ النرد' })).not.toBeDisabled();

    rerender(
      <PlayerHud
        myMoney={1200}
        isMyTurn={false}
        currentPlayerNickname="سارة"
        currentPlayerColor="#3BA776"
        isRolling={false}
        lastDiceResult={null}
        onRollDice={() => {}}
        disabled={false}
      />,
    );
    expect(screen.getByRole('button', { name: 'ارمِ النرد' })).toBeDisabled();
  });

  it('يستدعي onRollDice عند الضغط', async () => {
    const { onRollDice } = renderHud({ isMyTurn: true });
    await userEvent.click(screen.getByRole('button', { name: 'ارمِ النرد' }));
    expect(onRollDice).toHaveBeenCalledOnce();
  });

  it('الزر معطّل لو disabled=true حتى لو دوري', () => {
    renderHud({ isMyTurn: true, disabled: true });
    expect(screen.getByRole('button', { name: 'ارمِ النرد' })).toBeDisabled();
  });
});
