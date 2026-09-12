import type { GameLogEntry } from '../../domain/interfaces/IGameRepository';

export function formatLogEntry(entry: GameLogEntry): string {
  switch (entry.type) {
    case 'dice-rolled':
      return `${entry.playerNickname} رمى النرد (${entry.die1} + ${entry.die2} = ${entry.total})`;
    case 'player-moved':
      return `${entry.playerNickname} تحرّك إلى ${entry.tileName}`;
    case 'property-bought':
      return `${entry.playerNickname} اشترى ${entry.tileName} مقابل ${entry.price} جنيه`;
    case 'rent-paid':
      return `${entry.playerNickname} دفع ${entry.amount} جنيه إيجار لـ${entry.ownerNickname} على ${entry.tileName}`;
    case 'property-built':
      return `${entry.playerNickname} بنى على ${entry.tileName} (مستوى ${entry.newLevel})`;
  }
}
