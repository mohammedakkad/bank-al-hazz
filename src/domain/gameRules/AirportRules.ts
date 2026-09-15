/**
 * إيجار المطارات — القاعدة الرسمية لمونوبولي (محطات القطار الأربعة): الإيجار
 * يتضاعف حسب عدد المطارات اللي يملكها نفس اللاعب، وليس جدول ألوان كالعقارات
 * العادية. جدول القيم مطابق للنسخة الرسمية (25/50/100/200) لأن سعر الشراء هنا
 * (200) اخترناه مطابقاً للأصل أيضاً — نفس المقياس المالي.
 */
const AIRPORT_RENT_BY_COUNT_OWNED: Readonly<Record<1 | 2 | 3 | 4, number>> = {
  1: 25,
  2: 50,
  3: 100,
  4: 200,
};

export function calculateAirportRent(ownedAirportCount: number): number {
  if (ownedAirportCount <= 0) return 0;
  const clampedCount = Math.min(ownedAirportCount, 4) as 1 | 2 | 3 | 4;
  return AIRPORT_RENT_BY_COUNT_OWNED[clampedCount];
}
