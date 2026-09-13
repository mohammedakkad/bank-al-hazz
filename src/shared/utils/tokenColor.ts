import { TOKEN_COLOR_PALETTE } from '../constants/gameConfig';

/**
 * السبب الفعلي المؤكَّد وراء "دائرة حمراء غير مفسَّرة" (Bug 1) و"رموز لاعبين متداخلة"
 * (Bug 5) بالتقرير: كل جلسة متصفح جديدة تبدأ بلون افتراضي ثابت
 * TOKEN_COLOR_PALETTE[0] (#E24B4A، أحمر) لحد ما اللاعب يضغط لوناً غيره يدوياً
 * بـEntryScreen — ولا يوجد أي منع تصادم بين لاعبين بنفس الغرفة. لاعبان ما بدّلوا
 * اللون الافتراضي (سيناريو شائع جداً بالاختبار السريع بعدة تابات) ينتهي بهم نفس
 * اللون الأحمر بالضبط، فيظهر رمز واحد يبدو "مكرَّراً بلا سبب" فوق أي مربع كانا
 * واقفين عليه لحظتها (أياً كان — وليس مربوطاً بمربع "وقوف حر" تحديداً؛ لم يُعثر على
 * أي مؤشر/دائرة مُرمَّزة بثبات لمربع 20 بأي مكان بالكود بعد فحص شامل لـ
 * Board/BoardTile/PlayerToken/tileIcons).
 */
export function pickAvailableTokenColor(takenColors: ReadonlySet<string>): string {
  const firstAvailable = TOKEN_COLOR_PALETTE.find((color) => !takenColors.has(color));
  return firstAvailable ?? (TOKEN_COLOR_PALETTE[0] as string);
}
