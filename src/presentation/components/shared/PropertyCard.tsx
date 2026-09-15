import type { BoardTile } from '../../../domain/entities/BoardTile';
import { COLOR_GROUP_HEX } from '../../../shared/constants/colorGroups';
import { calculateAirportRent } from '../../../domain/gameRules/AirportRules';

export interface PropertyCardProps {
  readonly tile: BoardTile;
}

const BUILD_LEVEL_LABELS = ['بدون', 'منزل 1', 'منزل 2', 'منزل 3', 'منزل 4', 'فندق'] as const;

/**
 * Item 3 — مكوّن واحد مشترك لأي عرض تفصيلي لعقار (بطاقة "6سم×2.5سم" حسب قياس
 * اللوحة الحقيقية — بطاقة عريضة وقصيرة نسبياً بدل بطاقة طويلة ضيقة). يُستخدم من
 * مكانين: BuyPropertyModal (مع زر الشراء أسفلها) وCenterPanel (بدون زر، عرض فقط
 * عند الضغط على مربع) — بدل بناء واجهتين مختلفتين لنفس المعلومة كما حذّرت المهمة.
 *
 * جدول الإيجار الكامل مسحوب مباشرة من بيانات BoardTile (rentPerLevel/baseRent)
 * — لا يُعاد اشتقاق أي رقم إيجار هنا، فقط عرض القيم الموجودة أصلاً (مصدر الحقيقة
 * الوحيد يبقى RentCalculator/BoardTile.ts نفسهما).
 */
export function PropertyCard({ tile }: PropertyCardProps) {
  if (tile.type === 'property') {
    return (
      <div className="w-full">
        <div className="mb-2 flex items-center gap-2">
          <span
            className="h-2 w-10 shrink-0 rounded-sm"
            style={{ backgroundColor: COLOR_GROUP_HEX[tile.colorGroup] }}
            aria-hidden="true"
          />
          <span className="text-lg leading-none">{tile.countryFlag}</span>
          <div>
            <h3 className="font-bold leading-tight">{tile.name}</h3>
            <p className="text-[10px] text-gray-400">{tile.region}</p>
          </div>
          <span className="mr-auto font-bold text-amber-400">{tile.purchasePrice.toLocaleString('ar-EG')} جنيه</span>
        </div>

        {/* جدول أفقي (مستويات كأعمدة) بدل عمودي — يناسب بطاقة عريضة قصيرة بدل طويلة ضيقة */}
        <table className="w-full text-center text-[9px] sm:text-[11px]">
          <thead>
            <tr className="text-gray-400">
              {BUILD_LEVEL_LABELS.map((label) => (
                <th key={label} className="pb-0.5 font-normal">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="font-bold text-amber-400">
              <td>{tile.baseRent}</td>
              {tile.rentPerLevel.map((rent, index) => (
                <td key={index}>{rent}</td>
              ))}
            </tr>
          </tbody>
        </table>
        <p className="mt-1 text-[9px] text-gray-500">تكلفة البناء: {tile.buildCost} جنيه / مستوى</p>
      </div>
    );
  }

  if (tile.type === 'airport') {
    return (
      <div className="w-full text-center">
        <h3 className="font-bold">{tile.name}</h3>
        <p className="mb-1 font-bold text-amber-400">{(tile.purchasePrice ?? 0).toLocaleString('ar-EG')} جنيه</p>
        <table className="w-full text-center text-[9px] sm:text-[11px]">
          <thead>
            <tr className="text-gray-400">
              {[1, 2, 3, 4].map((count) => (
                <th key={count} className="font-normal">{count} مطارات</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="font-bold text-amber-400">
              {[1, 2, 3, 4].map((count) => (
                <td key={count}>{calculateAirportRent(count)}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  if (tile.type === 'utility') {
    return (
      <div className="w-full text-center">
        <h3 className="font-bold">{tile.name}</h3>
        <p className="mb-1 font-bold text-amber-400">{(tile.purchasePrice ?? 0).toLocaleString('ar-EG')} جنيه</p>
        <p className="text-[10px] text-gray-300">شركة واحدة: 4× مجموع النرد</p>
        <p className="text-[10px] text-gray-300">الشركتان معاً: 10× مجموع النرد</p>
      </div>
    );
  }

  return (
    <div className="w-full text-center">
      <h3 className="font-bold">{tile.name}</h3>
      {tile.type === 'tax' && <p className="text-[10px] text-gray-400">الضريبة: {tile.amount} جنيه</p>}
    </div>
  );
}
