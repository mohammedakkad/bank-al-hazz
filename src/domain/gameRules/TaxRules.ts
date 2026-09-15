import type { NonPropertyTile } from '../entities/BoardTile';

/**
 * ضريبة ثابتة (دخل/ثروة) — كانت غير مُطبَّقة إطلاقاً سابقاً (الهبوط على مربع
 * ضريبة كان بلا أي أثر، `resolveLanding` بـGameScreen.tsx ما كان يتحقق من
 * type === 'tax' إطلاقاً). القيمة مأخوذة من BoardTile.amount مباشرة.
 */
export function calculateTaxAmount(taxTile: NonPropertyTile): number {
  if (taxTile.type !== 'tax') return 0;
  return taxTile.amount ?? 0;
}
