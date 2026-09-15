import { Player } from '../../domain/entities/Player';
import { Money } from '../../domain/valueObjects/Money';
import { BOARD_TILES } from '../../domain/entities/BoardTile';

export type SellPropertyFailureReason = 'not-a-property' | 'not-owned' | 'has-buildings';

export type SellPropertyOutcome =
  | { readonly success: true; readonly player: Player; readonly refundAmount: number }
  | { readonly success: false; readonly reason: SellPropertyFailureReason };

/**
 * Item 5 — نسخة مؤقتة مبسّطة لحد نظام الرهن الكامل بـPhase C: بيع عقار غير
 * مبني للبنك مقابل نصف سعر شرائه فقط (بروح القاعدة الرسمية لبيع المنازل/الفنادق
 * "نصف السعر المدفوع" — لا يوجد نظام رهن عقارات (mortgage) بهذا المشروع بعد،
 * فاستخدمنا نصف purchasePrice كقاعدة مرحلية معقولة). مطارات وشركات المرافق
 * غير مشمولة بهذا البند تحديداً (المهمة نصّت على "عقاراتي" فقط) — يمكن توسيعها
 * لاحقاً بنفس المبدأ إن احتجنا.
 *
 * عقار عليه بناء (مستوى > 0) ممنوع بيعه إطلاقاً هنا — يطابق القاعدة الرسمية
 * "لا يمكن بيع عقار عليه مبانٍ قائمة" (لازم تبيع المباني أولاً، غير مطبّق بعد).
 */
export function sellProperty(player: Player, tileId: number): SellPropertyOutcome {
  const tile = BOARD_TILES.find((candidate) => candidate.id === tileId);
  if (!tile || tile.type !== 'property') {
    return { success: false, reason: 'not-a-property' };
  }

  if (!player.ownsTile(tileId)) {
    return { success: false, reason: 'not-owned' };
  }

  const buildLevel = player.buildLevels[tileId] ?? 0;
  if (buildLevel > 0) {
    return { success: false, reason: 'has-buildings' };
  }

  const refundAmount = Math.floor(tile.purchasePrice / 2);
  const updatedPlayer = player.receive(Money.of(refundAmount)).releaseProperty(tileId);
  return { success: true, player: updatedPlayer, refundAmount };
}
