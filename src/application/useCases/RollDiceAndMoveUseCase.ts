import { Player } from '../../domain/entities/Player';
import { Money } from '../../domain/valueObjects/Money';
import { rollDice, type DiceResult } from '../../domain/gameRules/DiceRoller';
import { calculateMove, START_BONUS } from '../../domain/gameRules/MovementRules';

export interface RollDiceAndMoveResult {
  readonly dice: DiceResult;
  readonly player: Player;
}

/**
 * Use Case = خطوة عمل واحدة كاملة (رمي النرد + تحريك اللاعب + منح مكافأة المرور بالبداية).
 * لا يعرف شيئاً عن React أو Firebase — يُستدعى من الـpresentation layer
 * ويُمرَّر ناتجه لاحقاً إلى الـrepository لحفظه.
 * هذا الفصل يجعل قاعدة "رمي نرد → حركة → مكافأة" قابلة للاختبار بمعزل عن الواجهة والشبكة.
 */
export function rollDiceAndMove(player: Player): RollDiceAndMoveResult {
  const dice = rollDice();
  const { newPosition, passedStart } = calculateMove(player.position, dice.total);

  let updatedPlayer = player.moveTo(newPosition);
  if (passedStart) {
    updatedPlayer = updatedPlayer.receive(Money.of(START_BONUS));
  }

  return { dice, player: updatedPlayer };
}
