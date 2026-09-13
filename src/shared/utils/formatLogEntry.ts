import type { GameLogEntry } from '../../domain/interfaces/IGameRepository';

export function formatLogEntry(entry: GameLogEntry): string {
  switch (entry.type) {
    case 'dice-rolled':
      return `${entry.playerNickname} رمى النرد (${entry.die1} + ${entry.die2} = ${entry.total})`;
    case 'player-moved':
      return entry.collectedGoBonus
        ? `${entry.playerNickname} مرّ من البداية وقبض 200 جنيه! 🎉`
        : `${entry.playerNickname} تحرّك إلى ${entry.tileName}`;
    case 'property-bought':
      return `${entry.playerNickname} اشترى ${entry.tileName} مقابل ${entry.price} جنيه`;
    case 'rent-paid':
      return `${entry.playerNickname} دفع ${entry.amount} جنيه إيجار لـ${entry.ownerNickname} على ${entry.tileName}`;
    case 'property-built':
      return `${entry.playerNickname} بنى على ${entry.tileName} (مستوى ${entry.newLevel})`;
    case 'property-auctioned':
      return entry.winnerId
        ? `${entry.winnerNickname} فاز بمزاد ${entry.tileName} مقابل ${entry.amount} جنيه`
        : `انتهى مزاد ${entry.tileName} بدون فائز — بقي العقار بدون مالك`;
    case 'card-drawn':
      return `${entry.playerNickname} سحب بطاقة ${entry.deckType === 'chance' ? 'فرصة' : 'صندوق المجتمع'}: ${entry.cardText}`;
  }
}
