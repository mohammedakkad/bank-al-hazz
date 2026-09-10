import { Plane, Zap, Droplets, HelpCircle, Gift, Landmark, ParkingCircle, Lock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { TileType } from '../../../domain/entities/BoardTile';

export const TILE_ICONS: Partial<Record<TileType, LucideIcon>> = {
  airport: Plane,
  utility: Zap,
  chance: HelpCircle,
  community: Gift,
  jail: Lock,
  'go-to-jail': Lock,
  'free-parking': ParkingCircle,
  tax: Landmark,
};

/** أيقونة المياه لها استثناء واحد بين المرافق (شركة الماء بدل الكهرباء) */
export function getUtilityIcon(name: string): LucideIcon {
  return name.includes('مياه') ? Droplets : Zap;
}
