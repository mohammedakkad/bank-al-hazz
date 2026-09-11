import type { FieldValue } from 'firebase/firestore';
import { Player } from '../../domain/entities/Player';
import { Money } from '../../domain/valueObjects/Money';

export interface PlayerDocument {
  readonly nickname: string;
  readonly tokenColor: string;
  readonly money: number;
  readonly position: number;
  readonly ownedTileIds: readonly number[];
  readonly isInJail: boolean;
  readonly isBankrupt: boolean;
  readonly joinedAt: FieldValue | number;
}

export function playerToDocument(player: Player, joinedAt: FieldValue): PlayerDocument {
  return {
    nickname: player.nickname,
    tokenColor: player.tokenColor,
    money: player.money.value,
    position: player.position,
    ownedTileIds: player.ownedTileIds,
    isInJail: player.isInJail,
    isBankrupt: player.isBankrupt,
    joinedAt,
  };
}

/**
 * لتحديث حالة لاعب موجود بالفعل (updatePlayerState) بدون لمس joinedAt إطلاقاً —
 * لأن استنتاج "مين الـhost" يعتمد على ثبات هذا الحقل منذ لحظة الانضمام الأولى.
 * merge:true في Firestore يُبقي أي حقل غير موجود بهذا الكائن كما هو دون تغيير.
 */
export type PlayerStateUpdate = Omit<PlayerDocument, 'joinedAt'>;

export function playerToStateUpdate(player: Player): PlayerStateUpdate {
  return {
    nickname: player.nickname,
    tokenColor: player.tokenColor,
    money: player.money.value,
    position: player.position,
    ownedTileIds: player.ownedTileIds,
    isInJail: player.isInJail,
    isBankrupt: player.isBankrupt,
  };
}

/**
 * إعادة بناء Player من بيانات Firestore عبر الواجهة العامة فقط (بدون تعديل الـentity).
 *
 * Player.create() يهيّئ الحالة الابتدائية فقط (position=0, ownedTileIds=[], isBankrupt=false)
 * ولا يوجد "constructor" عام يقبل حالة كيفية — وهذا مقصود من تصميم الـentity (immutable
 * + private constructor). للحفاظ على هذا التصميم دون تعديله، نُعيد بناء الحالة الكاملة
 * بتسلسل استدعاءات للدوال العامة الموجودة أصلاً:
 *   - المال يُمرَّر مباشرة كـstartingMoney (create يضبطه كما هو، بدون حاجة لعمليات إضافية)
 *   - الموقع عبر moveTo (أو sendToJail إذا كان في السجن، لأنها تضبط position=10 تلقائياً)
 *   - الممتلكات عبر acquireProperty لكل عقار
 *   - الإفلاس: pay() هي الدالة الوحيدة العامة التي تشتق isBankrupt، فنستدعيها بمبلغ صفر
 *     لإعادة اشتقاق الإفلاس من قيمة المال المُسترجعة نفسها دون تغييره فعلياً
 */
export function documentToPlayer(playerId: string, doc: PlayerDocument): Player {
  let player = Player.create(playerId, doc.nickname, doc.tokenColor, Money.of(doc.money));

  if (doc.isInJail) {
    player = player.sendToJail();
  } else {
    player = player.moveTo(doc.position);
  }

  for (const tileId of doc.ownedTileIds) {
    player = player.acquireProperty(tileId);
  }

  if (doc.isBankrupt) {
    player = player.pay(Money.zero());
  }

  return player;
}
