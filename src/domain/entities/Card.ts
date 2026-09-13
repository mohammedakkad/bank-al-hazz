import type { CardEffect } from '../gameRules/CardEffects';

export type DeckType = 'chance' | 'community';

export interface Card {
  readonly id: string;
  readonly text: string;
  readonly effect: CardEffect;
}

/**
 * كل بطاقات "فرصة" — نص عربي بلهجة المشروع، بدائل هذه اللوحة بدل الأصل الأمريكي:
 * "أقرب مطار" بدل "أقرب محطة قطار" (نفس اختيار التصميم المتّبع أصلاً بمربعات النوع
 * 'airport')، وأغلى عقار باللوحة (المدينة المنورة، id 39) بدل Boardwalk.
 */
export const CHANCE_DECK: readonly Card[] = [
  { id: 'chance-01', text: 'تقدّم إلى البداية — اقبض 200 جنيه', effect: { kind: 'advance-to-tile', tileId: 0, grantsGoBonusIfPassed: true } },
  { id: 'chance-02', text: 'تقدّم إلى المدينة المنورة', effect: { kind: 'advance-to-tile', tileId: 39, grantsGoBonusIfPassed: true } },
  { id: 'chance-03', text: 'تقدّم إلى أقرب مطار — اشترِه إن كان بلا مالك، أو ادفع ضعف الإيجار إن كان مملوكاً', effect: { kind: 'advance-to-nearest-of-type', tileType: 'airport', grantsGoBonusIfPassed: true } },
  { id: 'chance-04', text: 'تقدّم إلى أقرب مطار — اشترِه إن كان بلا مالك، أو ادفع ضعف الإيجار إن كان مملوكاً', effect: { kind: 'advance-to-nearest-of-type', tileType: 'airport', grantsGoBonusIfPassed: true } },
  { id: 'chance-05', text: 'البنك يدفع لك أرباح أسهم بقيمة 50 جنيه', effect: { kind: 'collect-fixed', amount: 50 } },
  { id: 'chance-06', text: 'بطاقة "اخرج من السجن مجاناً" — احتفظ بها لحد ما تستخدمها', effect: { kind: 'get-out-of-jail-free' } },
  { id: 'chance-07', text: 'ارجع 3 مربعات للخلف', effect: { kind: 'go-back-n-spaces', spaces: 3 } },
  { id: 'chance-08', text: 'اذهب مباشرة إلى السجن — لا تمرّ بالبداية ولا تقبض 200 جنيه', effect: { kind: 'go-to-jail' } },
  { id: 'chance-09', text: 'إصلاحات عامة على كل عقاراتك: ادفع 25 جنيه عن كل منزل و100 جنيه عن كل فندق', effect: { kind: 'pay-per-house-hotel', perHouse: 25, perHotel: 100 } },
  { id: 'chance-10', text: 'غرامة فقر — ادفع 15 جنيه', effect: { kind: 'pay-fixed', amount: 15 } },
  { id: 'chance-11', text: 'تقدّم إلى أقرب مطار — لو مررت بالبداية بالطريق، اقبض 200 جنيه أيضاً', effect: { kind: 'advance-to-nearest-of-type', tileType: 'airport', grantsGoBonusIfPassed: true } },
  { id: 'chance-12', text: 'تقدّم إلى أقرب شركة مرافق — اشترِها إن كانت بلا مالك، أو ادفع لصاحبها 10× ما ظهر بالنرد', effect: { kind: 'advance-to-nearest-of-type', tileType: 'utility', grantsGoBonusIfPassed: true } },
  { id: 'chance-13', text: 'انتُخبت رئيساً لمجلس الإدارة — ادفع 50 جنيه لكل لاعب آخر', effect: { kind: 'pay-each-player', amount: 50 } },
  { id: 'chance-14', text: 'استحقاق قرض بناء — اقبض 150 جنيه', effect: { kind: 'collect-fixed', amount: 150 } },
  { id: 'chance-15', text: 'فزت بمسابقة كلمات متقاطعة — اقبض 100 جنيه', effect: { kind: 'collect-fixed', amount: 100 } },
  { id: 'chance-16', text: 'تقدّم إلى أقرب مطار — اشترِه إن كان بلا مالك، أو ادفع ضعف الإيجار إن كان مملوكاً', effect: { kind: 'advance-to-nearest-of-type', tileType: 'airport', grantsGoBonusIfPassed: true } },
];

/** بطاقات "صندوق المجتمع" الرسمية الـ16، بنفس منطق التكييف */
export const COMMUNITY_CHEST_DECK: readonly Card[] = [
  { id: 'community-01', text: 'تقدّم إلى البداية — اقبض 200 جنيه', effect: { kind: 'advance-to-tile', tileId: 0, grantsGoBonusIfPassed: true } },
  { id: 'community-02', text: 'خطأ بنكي لصالحك — اقبض 200 جنيه', effect: { kind: 'collect-fixed', amount: 200 } },
  { id: 'community-03', text: 'أجرة طبيب — ادفع 50 جنيه', effect: { kind: 'pay-fixed', amount: 50 } },
  { id: 'community-04', text: 'من بيع أسهمك، تقبض 50 جنيه', effect: { kind: 'collect-fixed', amount: 50 } },
  { id: 'community-05', text: 'بطاقة "اخرج من السجن مجاناً" — احتفظ بها لحد ما تستخدمها', effect: { kind: 'get-out-of-jail-free' } },
  { id: 'community-06', text: 'اذهب مباشرة إلى السجن — لا تمرّ بالبداية ولا تقبض 200 جنيه', effect: { kind: 'go-to-jail' } },
  { id: 'community-07', text: 'استحقاق صندوق إجازة — اقبض 100 جنيه', effect: { kind: 'collect-fixed', amount: 100 } },
  { id: 'community-08', text: 'استرداد ضريبة دخل — اقبض 20 جنيه', effect: { kind: 'collect-fixed', amount: 20 } },
  { id: 'community-09', text: 'عيد ميلادك اليوم — اقبض 10 جنيه من كل لاعب آخر', effect: { kind: 'collect-from-each-player', amount: 10 } },
  { id: 'community-10', text: 'استحقاق بوليصة تأمين على الحياة — اقبض 100 جنيه', effect: { kind: 'collect-fixed', amount: 100 } },
  { id: 'community-11', text: 'ادفع رسوم مستشفى 100 جنيه', effect: { kind: 'pay-fixed', amount: 100 } },
  { id: 'community-12', text: 'ادفع رسوم مدرسية 150 جنيه', effect: { kind: 'pay-fixed', amount: 150 } },
  { id: 'community-13', text: 'تقبض 25 جنيه أتعاب استشارة', effect: { kind: 'collect-fixed', amount: 25 } },
  { id: 'community-14', text: 'إصلاحات شوارع: ادفع 40 جنيه عن كل منزل و115 جنيه عن كل فندق', effect: { kind: 'pay-per-house-hotel', perHouse: 40, perHotel: 115 } },
  { id: 'community-15', text: 'فزت بالجائزة الثانية بمسابقة مواهب — اقبض 10 جنيه', effect: { kind: 'collect-fixed', amount: 10 } },
  { id: 'community-16', text: 'ورثت 100 جنيه', effect: { kind: 'collect-fixed', amount: 100 } },
];

export function getDeck(deckType: DeckType): readonly Card[] {
  return deckType === 'chance' ? CHANCE_DECK : COMMUNITY_CHEST_DECK;
}

export function findCardById(deckType: DeckType, cardId: string): Card | undefined {
  return getDeck(deckType).find((card) => card.id === cardId);
}
