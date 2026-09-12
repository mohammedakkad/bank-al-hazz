import { describe, it, expect } from 'vitest';
import { playJailTurn } from './JailTurnUseCase';
import { Player } from '../../domain/entities/Player';
import { Money } from '../../domain/valueObjects/Money';

function jailedPlayer(money = 1000, jailTurnsElapsed = 0) {
  let player = Player.create('p1', 'p1', '#E24B4A', Money.of(money)).sendToJail();
  for (let i = 0; i < jailTurnsElapsed; i++) {
    player = player.recordJailAttempt();
  }
  return player;
}

/** randomFn قابل للحقن بنفس نمط rollDice — نتحكم بنتيجة النرد بدقة بدل الاعتماد على العشوائية */
function fixedRandom(...values: readonly number[]): () => number {
  let i = 0;
  return () => {
    const value = values[i % values.length];
    i += 1;
    return value as number;
  };
}

describe('playJailTurn', () => {
  it('doubles → يخرج فورًا ويتحرك بمجموع النرد، بدون دور إضافي', () => {
    const player = jailedPlayer();
    // القيمتان 0 و0 → die1=1, die2=1 (double)
    const result = playJailTurn(player, fixedRandom(0, 0));

    expect(result.exitedJail).toBe(true);
    expect(result.paidFine).toBe(false);
    expect(result.player.isInJail).toBe(false);
    expect(result.player.position).toBe(12); // 10 (السجن) + 2 (1+1)
  });

  it('مو doubles وأول محاولة → يضل بالسجن، تُسجَّل محاولة فاشلة', () => {
    const player = jailedPlayer();
    // die1=1 (قيمة 0)، die2=3 (قيمة 2/6≈0.34) → غير متساويين
    const result = playJailTurn(player, fixedRandom(0, 0.4));

    expect(result.exitedJail).toBe(false);
    expect(result.player.isInJail).toBe(true);
    expect(result.player.jailTurnsElapsed).toBe(1);
  });

  it('الدور الثالث بدون doubles → غرامة إجبارية 50 والخروج', () => {
    const player = jailedPlayer(1000, 2); // محاولتان فاشلتان سابقتان
    const result = playJailTurn(player, fixedRandom(0, 0.4)); // مو doubles

    expect(result.exitedJail).toBe(true);
    expect(result.paidFine).toBe(true);
    expect(result.player.isInJail).toBe(false);
    expect(result.player.money.value).toBe(950); // 1000 - 50
  });

  it('doubles بالدور الثالث → يخرج بالنرد بدون غرامة (doubles له أولوية)', () => {
    const player = jailedPlayer(1000, 2);
    const result = playJailTurn(player, fixedRandom(0, 0));

    expect(result.exitedJail).toBe(true);
    expect(result.paidFine).toBe(false);
    expect(result.player.money.value).toBe(1000); // بدون خصم غرامة
  });
});
