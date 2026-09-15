/**
 * إيجار شركات المرافق (الكهرباء/المياه) — القاعدة الرسمية: مضاعف لمجموع النرد
 * اللي طلع بنفس الرمية، وليس مبلغاً ثابتاً: 4× لو اللاعب يملك شركة واحدة فقط،
 * 10× لو يملك الاثنتين معاً.
 */
const SINGLE_UTILITY_MULTIPLIER = 4;
const BOTH_UTILITIES_MULTIPLIER = 10;

export function calculateUtilityRent(diceTotal: number, ownedUtilityCount: number): number {
  if (ownedUtilityCount <= 0) return 0;
  const multiplier = ownedUtilityCount >= 2 ? BOTH_UTILITIES_MULTIPLIER : SINGLE_UTILITY_MULTIPLIER;
  return diceTotal * multiplier;
}
