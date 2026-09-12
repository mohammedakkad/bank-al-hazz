import { Player } from '../../domain/entities/Player';
import { Money } from '../../domain/valueObjects/Money';
import { rollDice, type DiceResult } from '../../domain/gameRules/DiceRoller';
import { calculateMove, START_BONUS } from '../../domain/gameRules/MovementRules';
import { isForcedFineTurn, JAIL_FINE } from '../../domain/gameRules/JailRules';

export interface JailTurnResult {
  readonly dice: DiceResult;
  readonly player: Player;
  readonly exitedJail: boolean;
  readonly paidFine: boolean;
}

/**
 * يُستدعى فقط لما يكون اللاعب بالسجن فعليًا (player.isInJail === true).
 * قواعد مونوبولي الرسمية للخروج بالنرد/الغرامة الإجبارية:
 * - doubles → يخرج فورًا ويتحرك بمجموع النرد، لكن بدون دور إضافي رغم إنه doubles
 *   (القاعدة الرسمية: "you do not take another turn" حتى لو طلع doubles).
 * - مو doubles ولسا ما وصل للدور الإجباري (أقل من 3 محاولات) → يضل بالسجن، دوره
 *   ينتهي بدون حركة، وتُسجَّل محاولة فاشلة.
 * - مو doubles ووصل للدور الثالث (jailTurnsElapsed >= 2) → غرامة $50 إجبارية،
 *   يطلع من السجن ويتحرك بمجموع النرد.
 *
 * ملاحظة نطاق: الدفع الطوعي المبكر (قبل الدور الثالث) قاعدة رسمية موجودة بالمونوبولي،
 * لكن ما فيه زر/واجهة لها بالتطبيق لهلق — غير منفّذة بهاي المرحلة، مؤجلة لحد ما تُضاف
 * واجهة مخصصة لها.
 */
export function playJailTurn(player: Player, randomFn: () => number = Math.random): JailTurnResult {
  const dice = rollDice(randomFn);

  if (dice.isDouble) {
    return { dice, player: exitJailAndMove(player, dice.total), exitedJail: true, paidFine: false };
  }

  if (isForcedFineTurn(player.jailTurnsElapsed)) {
    const finedPlayer = player.pay(Money.of(JAIL_FINE));
    return { dice, player: exitJailAndMove(finedPlayer, dice.total), exitedJail: true, paidFine: true };
  }

  return { dice, player: player.recordJailAttempt(), exitedJail: false, paidFine: false };
}

function exitJailAndMove(player: Player, steps: number): Player {
  const { newPosition, passedStart } = calculateMove(player.position, steps);
  let updated = player.releaseFromJail().moveTo(newPosition);
  if (passedStart) {
    updated = updated.receive(Money.of(START_BONUS));
  }
  return updated;
}
