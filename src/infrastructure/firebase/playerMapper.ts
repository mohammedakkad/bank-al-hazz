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
  readonly buildLevels: Readonly<Record<number, number>>;
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
    buildLevels: player.buildLevels,
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
    buildLevels: player.buildLevels,
  };
}

/**
 * إعادة بناء Player من بيانات Firestore عبر الواجهة العامة فقط (بدون تعديل الـentity
 * من هذا الملف). Player.create() يهيّئ الحالة الابتدائية فقط، ولا يوجد "constructor"
 * عام يقبل حالة كيفية — نُعيد بناء الحالة الكاملة بتسلسل استدعاءات للدوال العامة:
 *   - المال يُمرَّر مباشرة كـstartingMoney
 *   - الموقع عبر moveTo (أو sendToJail إذا كان بالسجن)
 *   - الممتلكات عبر acquireProperty لكل عقار
 *   - مستويات البناء عبر upgradeProperty بالتكرار حتى المستوى المخزَّن (إضافة Phase 3)
 *   - الإفلاس: pay(صفر) تشتق isBankrupt من قيمة المال نفسها دون تغييره
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

  for (const [tileIdKey, level] of Object.entries(doc.buildLevels ?? {})) {
    const tileId = Number(tileIdKey);
    for (let i = 0; i < level; i++) {
      player = player.upgradeProperty(tileId);
    }
  }

  if (doc.isBankrupt) {
    player = player.pay(Money.zero());
  }

  return player;
}
