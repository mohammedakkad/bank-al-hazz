import { Player } from '../../domain/entities/Player';
import { Money } from '../../domain/valueObjects/Money';
import { BOARD_TILES } from '../../domain/entities/BoardTile';
import { calculateMove, BOARD_SIZE } from '../../domain/gameRules/MovementRules';
import type { CardEffect } from '../../domain/gameRules/CardEffects';

export interface CardEffectResult {
  /** اللاعب صاحب البطاقة بعد تطبيق الأثر المباشر عليه (حركة/دفع/قبض) */
  readonly player: Player;
  /** بقية اللاعبين بعد أي أثر يمسّهم (pay-each-player / collect-from-each-player فقط) */
  readonly others: readonly Player[];
  /** true لو الأثر نقل اللاعب للسجن مباشرة (go-to-jail) — الطبقة المستدعية تنهي الدور بدل الاستمرار */
  readonly sentToJail: boolean;
  /** true لو الأثر كان "اخرج من السجن مجاناً" — الطبقة المستدعية مسؤولة عن تسجيلها بحالة الرزمة، لا أثر مباشر على اللاعب هنا */
  readonly heldGetOutOfJailFree: boolean;
}

function countHousesAndHotels(player: Player): { houses: number; hotels: number } {
  let houses = 0;
  let hotels = 0;
  for (const level of Object.values(player.buildLevels)) {
    if (level >= 1 && level <= 4) houses += level;
    else if (level === 5) hotels += 1;
  }
  return { houses, hotels };
}

function findNearestTileOfType(fromPosition: number, tileType: 'airport' | 'utility'): number {
  const matches = BOARD_TILES.filter((tile) => tile.type === tileType).map((tile) => tile.id);
  const ahead = matches.filter((id) => id > fromPosition).sort((a, b) => a - b)[0];
  const wrapped = matches.sort((a, b) => a - b)[0];
  const target = ahead ?? wrapped;
  if (target === undefined) {
    throw new Error(`findNearestTileOfType: لا يوجد أي مربع من نوع ${tileType} باللوحة`);
  }
  return target;
}

function advanceTo(player: Player, targetTileId: number, grantsGoBonusIfPassed: boolean): Player {
  const rawSteps = (targetTileId - player.position + BOARD_SIZE) % BOARD_SIZE;
  const steps = rawSteps === 0 ? BOARD_SIZE : rawSteps; // لفّة كاملة لو كان أصلاً واقف على الهدف
  const { newPosition, passedStart } = calculateMove(player.position, steps);
  let moved = player.moveTo(newPosition);
  if (passedStart && grantsGoBonusIfPassed) {
    moved = moved.receive(Money.of(200));
  }
  return moved;
}

export function applyCardEffect(
  effect: CardEffect,
  player: Player,
  others: readonly Player[],
): CardEffectResult {
  switch (effect.kind) {
    case 'advance-to-tile':
      return {
        player: advanceTo(player, effect.tileId, effect.grantsGoBonusIfPassed),
        others,
        sentToJail: false,
        heldGetOutOfJailFree: false,
      };

    case 'advance-to-nearest-of-type': {
      const targetTileId = findNearestTileOfType(player.position, effect.tileType);
      return {
        player: advanceTo(player, targetTileId, effect.grantsGoBonusIfPassed),
        others,
        sentToJail: false,
        heldGetOutOfJailFree: false,
      };
    }

    case 'go-back-n-spaces': {
      const newPosition = (player.position - effect.spaces + BOARD_SIZE) % BOARD_SIZE;
      return { player: player.moveTo(newPosition), others, sentToJail: false, heldGetOutOfJailFree: false };
    }

    case 'collect-fixed':
      return { player: player.receive(Money.of(effect.amount)), others, sentToJail: false, heldGetOutOfJailFree: false };

    case 'pay-fixed':
      return { player: player.pay(Money.of(effect.amount)), others, sentToJail: false, heldGetOutOfJailFree: false };

    case 'collect-per-house-hotel': {
      const { houses, hotels } = countHousesAndHotels(player);
      const amount = houses * effect.perHouse + hotels * effect.perHotel;
      return { player: player.receive(Money.of(amount)), others, sentToJail: false, heldGetOutOfJailFree: false };
    }

    case 'pay-per-house-hotel': {
      const { houses, hotels } = countHousesAndHotels(player);
      const amount = houses * effect.perHouse + hotels * effect.perHotel;
      return { player: player.pay(Money.of(amount)), others, sentToJail: false, heldGetOutOfJailFree: false };
    }

    case 'pay-each-player': {
      let updatedPlayer = player;
      const updatedOthers: Player[] = [];
      for (const other of others) {
        updatedPlayer = updatedPlayer.pay(Money.of(effect.amount));
        updatedOthers.push(other.receive(Money.of(effect.amount)));
      }
      return { player: updatedPlayer, others: updatedOthers, sentToJail: false, heldGetOutOfJailFree: false };
    }

    case 'collect-from-each-player': {
      let updatedPlayer = player;
      const updatedOthers: Player[] = [];
      for (const other of others) {
        updatedPlayer = updatedPlayer.receive(Money.of(effect.amount));
        updatedOthers.push(other.pay(Money.of(effect.amount)));
      }
      return { player: updatedPlayer, others: updatedOthers, sentToJail: false, heldGetOutOfJailFree: false };
    }

    case 'go-to-jail':
      return { player: player.sendToJail(), others, sentToJail: true, heldGetOutOfJailFree: false };

    case 'get-out-of-jail-free':
      // ما في أثر مباشر على حالة اللاعب هنا — الطبقة المستدعية (GameScreen) هي من تسجّل
      // الحيازة بحالة الرزمة المشتركة (DeckState.heldByPlayerId) عبر drawCard نفسها.
      return { player, others, sentToJail: false, heldGetOutOfJailFree: true };
  }
}
