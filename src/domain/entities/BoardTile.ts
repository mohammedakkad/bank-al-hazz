export type TileType =
  | 'start'
  | 'property'
  | 'airport'
  | 'utility'
  | 'chance'
  | 'community'
  | 'tax'
  | 'jail'
  | 'go-to-jail'
  | 'free-parking';

export type RegionGroup =
  | 'الخليج العربي'
  | 'بلاد الشام'
  | 'وادي النيل'
  | 'المغرب العربي'
  | 'الجزيرة العربية'
  | 'القرن الإفريقي والخليج'
  | 'ليبيا وموريتانيا';

export interface PropertyTile {
  readonly id: number;
  readonly type: 'property';
  readonly name: string;
  readonly countryFlag: string;
  readonly region: RegionGroup;
  readonly colorGroup: string;
  readonly purchasePrice: number;
  readonly baseRent: number;
  readonly rentPerLevel: readonly [number, number, number, number, number];
  readonly buildCost: number;
}

export interface NonPropertyTile {
  readonly id: number;
  readonly type: Exclude<TileType, 'property'>;
  readonly name: string;
  readonly amount?: number;
  /**
   * إضافة Item 3 (فجوة حقيقية مؤكَّدة): المطارات وشركات المرافق كانت بدون أي
   * سعر شراء إطلاقاً بالبيانات، رغم إن BuyPropertyUseCase/PayRentUseCase كانا
   * يرفضان أي مربع type !== 'property' كلياً — أي إنها لم تكن قابلة للشراء أو
   * الإيجار إطلاقاً (تحقّقنا من سجل أحداث حقيقي: لا يوجد أي "اشترى مطار..." رغم
   * الهبوط عليه عدة مرات). محدَّدة فقط للمطارات (200) والمرافق (150) — بقية
   * الأنواع (بداية/فرصة/سجن/إلخ) تبقى بدون سعر (undefined) لأنها غير قابلة للتملك أصلاً.
   */
  readonly purchasePrice?: number;
}

export type BoardTile = PropertyTile | NonPropertyTile;

/** يشمل property والمطار والمرافق — أي مربع فعلياً قابل للتملك بهذه اللعبة */
export function isBuyableTile(tile: BoardTile): boolean {
  return tile.type === 'property' || tile.type === 'airport' || tile.type === 'utility';
}

export function getTilePurchasePrice(tile: BoardTile): number | null {
  if (tile.type === 'property') return tile.purchasePrice;
  if (isBuyableTile(tile) && tile.purchasePrice !== undefined) return tile.purchasePrice;
  return null;
}

/**
 * ترتيب اللوحة (40 مربع) بعكس اتجاه عقارب الساعة بدءاً من "البداية" عند index 0،
 * مطابق لتسلسل مونوبولي الأصلي هيكلياً مع محتوى عربي بالكامل.
 */
export const BOARD_TILES: readonly BoardTile[] = [
  { id: 0, type: 'start', name: 'البداية' },

  // بلاد الشام
  { id: 1, type: 'property', name: 'دمشق', countryFlag: '🇸🇾', region: 'بلاد الشام', colorGroup: 'brown', purchasePrice: 60, baseRent: 2, rentPerLevel: [10, 30, 90, 160, 250], buildCost: 50 },
  { id: 2, type: 'community', name: 'صندوق المجتمع' },
  { id: 3, type: 'property', name: 'بيروت', countryFlag: '🇱🇧', region: 'بلاد الشام', colorGroup: 'brown', purchasePrice: 60, baseRent: 4, rentPerLevel: [20, 60, 180, 320, 450], buildCost: 50 },
  { id: 4, type: 'tax', name: 'ضريبة الدخل', amount: 200 },
  { id: 5, type: 'airport', name: 'مطار دمشق الدولي', purchasePrice: 200 },
  { id: 6, type: 'property', name: 'القدس', countryFlag: '🇵🇸', region: 'بلاد الشام', colorGroup: 'lightblue', purchasePrice: 100, baseRent: 6, rentPerLevel: [30, 90, 270, 400, 550], buildCost: 50 },
  { id: 7, type: 'chance', name: 'فرصة' },
  { id: 8, type: 'property', name: 'حلب', countryFlag: '🇸🇾', region: 'بلاد الشام', colorGroup: 'lightblue', purchasePrice: 100, baseRent: 6, rentPerLevel: [30, 90, 270, 400, 550], buildCost: 50 },

  // وادي النيل
  { id: 9, type: 'property', name: 'القاهرة', countryFlag: '🇪🇬', region: 'وادي النيل', colorGroup: 'lightblue', purchasePrice: 120, baseRent: 8, rentPerLevel: [40, 100, 300, 450, 600], buildCost: 50 },
  { id: 10, type: 'jail', name: 'السجن / زيارة فقط' },

  // الجزيرة العربية
  { id: 11, type: 'property', name: 'الرياض', countryFlag: '🇸🇦', region: 'الجزيرة العربية', colorGroup: 'pink', purchasePrice: 140, baseRent: 10, rentPerLevel: [50, 150, 450, 625, 750], buildCost: 100 },
  { id: 12, type: 'utility', name: 'شركة الكهرباء', purchasePrice: 150 },
  { id: 13, type: 'property', name: 'صنعاء', countryFlag: '🇾🇪', region: 'الجزيرة العربية', colorGroup: 'pink', purchasePrice: 140, baseRent: 10, rentPerLevel: [50, 150, 450, 625, 750], buildCost: 100 },
  { id: 14, type: 'property', name: 'مسقط', countryFlag: '🇴🇲', region: 'الجزيرة العربية', colorGroup: 'pink', purchasePrice: 160, baseRent: 12, rentPerLevel: [60, 180, 500, 700, 900], buildCost: 100 },
  { id: 15, type: 'airport', name: 'مطار الرياض الدولي', purchasePrice: 200 },

  // الخليج العربي
  { id: 16, type: 'property', name: 'الكويت', countryFlag: '🇰🇼', region: 'الخليج العربي', colorGroup: 'orange', purchasePrice: 180, baseRent: 14, rentPerLevel: [70, 200, 550, 750, 950], buildCost: 100 },
  { id: 17, type: 'community', name: 'صندوق المجتمع' },
  { id: 18, type: 'property', name: 'الدوحة', countryFlag: '🇶🇦', region: 'الخليج العربي', colorGroup: 'orange', purchasePrice: 180, baseRent: 14, rentPerLevel: [70, 200, 550, 750, 950], buildCost: 100 },
  { id: 19, type: 'property', name: 'دبي', countryFlag: '🇦🇪', region: 'الخليج العربي', colorGroup: 'orange', purchasePrice: 200, baseRent: 16, rentPerLevel: [80, 220, 600, 800, 1000], buildCost: 100 },
  { id: 20, type: 'free-parking', name: 'وقوف حر' },

  // القرن الإفريقي والخليج
  { id: 21, type: 'property', name: 'مقديشو', countryFlag: '🇸🇴', region: 'القرن الإفريقي والخليج', colorGroup: 'red', purchasePrice: 220, baseRent: 18, rentPerLevel: [90, 250, 700, 875, 1050], buildCost: 150 },
  { id: 22, type: 'chance', name: 'فرصة' },
  { id: 23, type: 'property', name: 'جيبوتي', countryFlag: '🇩🇯', region: 'القرن الإفريقي والخليج', colorGroup: 'red', purchasePrice: 220, baseRent: 18, rentPerLevel: [90, 250, 700, 875, 1050], buildCost: 150 },
  { id: 24, type: 'property', name: 'الخرطوم', countryFlag: '🇸🇩', region: 'وادي النيل', colorGroup: 'red', purchasePrice: 240, baseRent: 20, rentPerLevel: [100, 300, 750, 925, 1100], buildCost: 150 },
  { id: 25, type: 'airport', name: 'مطار القاهرة الدولي', purchasePrice: 200 },

  // المغرب العربي
  { id: 26, type: 'property', name: 'الرباط', countryFlag: '🇲🇦', region: 'المغرب العربي', colorGroup: 'yellow', purchasePrice: 260, baseRent: 22, rentPerLevel: [110, 330, 800, 975, 1150], buildCost: 150 },
  { id: 27, type: 'property', name: 'تونس', countryFlag: '🇹🇳', region: 'المغرب العربي', colorGroup: 'yellow', purchasePrice: 260, baseRent: 22, rentPerLevel: [110, 330, 800, 975, 1150], buildCost: 150 },
  { id: 28, type: 'utility', name: 'شركة المياه', purchasePrice: 150 },
  { id: 29, type: 'property', name: 'الجزائر', countryFlag: '🇩🇿', region: 'المغرب العربي', colorGroup: 'yellow', purchasePrice: 280, baseRent: 24, rentPerLevel: [120, 360, 850, 1025, 1200], buildCost: 150 },
  { id: 30, type: 'go-to-jail', name: 'اذهب إلى السجن' },

  // ليبيا وموريتانيا
  { id: 31, type: 'property', name: 'طرابلس', countryFlag: '🇱🇾', region: 'ليبيا وموريتانيا', colorGroup: 'green', purchasePrice: 300, baseRent: 26, rentPerLevel: [130, 390, 900, 1100, 1275], buildCost: 200 },
  { id: 32, type: 'property', name: 'نواكشوط', countryFlag: '🇲🇷', region: 'ليبيا وموريتانيا', colorGroup: 'green', purchasePrice: 300, baseRent: 26, rentPerLevel: [130, 390, 900, 1100, 1275], buildCost: 200 },
  { id: 33, type: 'community', name: 'صندوق المجتمع' },
  { id: 34, type: 'property', name: 'بنغازي', countryFlag: '🇱🇾', region: 'ليبيا وموريتانيا', colorGroup: 'green', purchasePrice: 320, baseRent: 28, rentPerLevel: [150, 450, 1000, 1200, 1400], buildCost: 200 },
  { id: 35, type: 'airport', name: 'مطار دبي الدولي', purchasePrice: 200 },
  { id: 36, type: 'chance', name: 'فرصة' },

  // الجزيرة العربية (المجموعة الأغلى)
  { id: 37, type: 'property', name: 'مكة المكرمة', countryFlag: '🇸🇦', region: 'الجزيرة العربية', colorGroup: 'darkblue', purchasePrice: 350, baseRent: 35, rentPerLevel: [175, 500, 1100, 1300, 1500], buildCost: 200 },
  { id: 38, type: 'tax', name: 'ضريبة الثروة', amount: 100 },
  { id: 39, type: 'property', name: 'المدينة المنورة', countryFlag: '🇸🇦', region: 'الجزيرة العربية', colorGroup: 'darkblue', purchasePrice: 400, baseRent: 50, rentPerLevel: [200, 600, 1400, 1700, 2000], buildCost: 200 },
] as const;
