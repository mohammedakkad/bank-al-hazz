/**
 * CardEffect — Bug4/Feature: بطاقات "فرصة" و"صندوق المجتمع"
 *
 * الـ32 بطاقة الرسمية (16 فرصة + 16 صندوق مجتمع) تتوزّع فعلياً على ~10 "أشكال أثر"
 * فقط، بمعاملات مختلفة — فبدل 32 دالة منفصلة، نموذج واحد نقي (بدون Firebase/React)
 * قابل لإعادة الاستخدام والاختبار بمعزل عن أي بطاقة معيّنة. هذا بالضبط النوع من
 * المنطق يستاهل يكون نظيفاً بما إن المشروع مخطط يتحوّل SaaS لاحقاً.
 */
export type CardEffect =
  /** انتقال لمربع محدد بالرقم (مثال: البداية = 0، أو أغلى عقار باللوحة) */
  | { readonly kind: 'advance-to-tile'; readonly tileId: number; readonly grantsGoBonusIfPassed: boolean }
  /** انتقال لأقرب مربع من نوع معيّن (مطار/شركة مرافق) بعد موقع اللاعب الحالي، بالتفاف دائري */
  | { readonly kind: 'advance-to-nearest-of-type'; readonly tileType: 'airport' | 'utility'; readonly grantsGoBonusIfPassed: boolean }
  | { readonly kind: 'go-back-n-spaces'; readonly spaces: number }
  | { readonly kind: 'collect-fixed'; readonly amount: number }
  | { readonly kind: 'pay-fixed'; readonly amount: number }
  | { readonly kind: 'collect-per-house-hotel'; readonly perHouse: number; readonly perHotel: number }
  | { readonly kind: 'pay-per-house-hotel'; readonly perHouse: number; readonly perHotel: number }
  | { readonly kind: 'pay-each-player'; readonly amount: number }
  | { readonly kind: 'collect-from-each-player'; readonly amount: number }
  | { readonly kind: 'go-to-jail' }
  /** تُحفَظ عند اللاعب لحد ما يستخدمها أو يبيعها/يتبادلها — لا تُطبَّق فوراً */
  | { readonly kind: 'get-out-of-jail-free' };
