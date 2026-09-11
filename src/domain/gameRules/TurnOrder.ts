import type { Player } from '../entities/Player';

/**
 * الدور التالي = اللاعب اللي بعد صاحب الدور الحالي بترتيب المصفوفة، بالتفاف دائري.
 * ترتيب المصفوفة نفسه (وليس أي حقل منفصل) هو مصدر الحقيقة لترتيب الأدوار — نفس
 * الافتراض المستخدم أصلاً لتحديد "المضيف" بالـLobby (أول عنصر بالمصفوفة).
 */
export function getNextPlayerId(players: readonly Player[], currentPlayerId: string): string {
  const currentIndex = players.findIndex((player) => player.id === currentPlayerId);
  if (currentIndex === -1 || players.length === 0) {
    throw new Error('getNextPlayerId: current player not found in players list');
  }
  const nextIndex = (currentIndex + 1) % players.length;
  const nextPlayer = players[nextIndex];
  if (!nextPlayer) {
    throw new Error('getNextPlayerId: unexpected empty players list');
  }
  return nextPlayer.id;
}
