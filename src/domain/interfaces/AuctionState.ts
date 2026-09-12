/**
 * AuctionState — Phase B
 *
 * تمثيل حالة مزاد جارٍ على عقار. تصميم "دور بالتناوب" (round-robin) بدل عدّاد
 * زمني (countdown) لأن اللعبة real-time-but-not-turn-based بين المتصفحات ولا
 * يوجد "بنكي" مركزي يدير المزاد؛ مزامنة نهاية جولة عدّاد زمني بدقة بين عدة
 * عملاء متصلين عبر Firestore onSnapshot معرّضة لفروقات توقيت واختلاف بترتيب
 * التحديثات، بينما "كل لاعب دوره: يزيد أو يمرّ" حالة منفصلة وواضحة لكل عميل
 * يقرأها من نفس المستند، بدون أي اعتماد على ساعة محلية.
 *
 * القاعدة الرسمية: أي لاعب، بما فيهم من رفض الشراء بالسعر المطبوع، يحق له
 * المزايدة. المزاد ينتهي لما يمرّ كل اللاعبين المؤهّلين ما عدا واحد على التوالي
 * (أو يمرّ الجميع من البداية → يبقى العقار بدون مالك، بدون بيع بصفر).
 */
export interface AuctionState {
  readonly tileId: number;
  /** كل اللاعبين المؤهّلين للمزايدة — تُحدَّد لحظة بدء المزاد ولا تتغيّر بعدها */
  readonly eligiblePlayerIds: readonly string[];
  /** لاعبون مرّوا (pass) ولن يُستشاروا مرة أخرى بهذا المزاد */
  readonly passedPlayerIds: readonly string[];
  readonly currentHighestBid: number;
  readonly currentHighestBidderId: string | null;
  /** اللاعب اللي عليه الدور الآن (يزيد أو يمرّ) */
  readonly turnPlayerId: string;
}

/** الحد الأدنى لزيادة أي مزايدة عن أعلى مزايدة حالية */
export const MIN_BID_INCREMENT = 10;
