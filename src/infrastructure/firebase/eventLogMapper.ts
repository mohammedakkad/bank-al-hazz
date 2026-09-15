import type { FieldValue } from 'firebase/firestore';
import type { GameLogEntry } from '../../domain/interfaces/IGameRepository';

export interface EventLogDocument {
  readonly type: GameLogEntry['type'];
  readonly playerId: string;
  readonly payload: Readonly<Record<string, string | number | boolean>>;
  readonly timestamp: FieldValue | number;
}

/**
 * كل أنواع GameLogEntry الأخرى لها playerId (فاعل الحدث)، عدا 'property-auctioned'
 * وهو حدث نظامي (نتيجة مزاد) بدون فاعل واحد بالضرورة — قد يحسمه أي عميل متصل.
 * playerId بمستند Firestore هنا فارغ '' عمداً بدل قيمة عشوائية، وقاعدة الأمان
 * (firestore.rules) تسمح صراحة بهذه الحالة الخاصة فقط بدل تعميم الشرط.
 */
export function logEntryToDocument(entry: GameLogEntry, timestamp: FieldValue): EventLogDocument {
  if (entry.type === 'property-auctioned') {
    return {
      type: entry.type,
      playerId: '',
      payload: {
        tileId: entry.tileId,
        tileName: entry.tileName,
        winnerId: entry.winnerId ?? '',
        winnerNickname: entry.winnerNickname ?? '',
        amount: entry.amount,
      },
      timestamp,
    };
  }
  const { type, playerId, ...rest } = entry;
  return { type, playerId, payload: rest, timestamp };
}

/**
 * إعادة بناء GameLogEntry من مستند Firestore. بما إن GameLogEntry اتحاد مميَّز
 * (discriminated union) وليس entity، ما في قيد "constructor خاص" هون — نعيد
 * التجميع مباشرة، لكن بشكل صريح لكل نوع حدث (بدل type assertion عمياء) حتى
 * يبقى أي خطأ بالبيانات المخزَّنة مكتشَفاً وقت التشغيل بدل تمريره بصمت.
 */
export function documentToLogEntry(doc: EventLogDocument): GameLogEntry | null {
  const p = doc.payload;
  switch (doc.type) {
    case 'dice-rolled':
      if (typeof p['playerNickname'] !== 'string' || typeof p['die1'] !== 'number' || typeof p['die2'] !== 'number' || typeof p['total'] !== 'number') return null;
      return { type: 'dice-rolled', playerId: doc.playerId, playerNickname: p['playerNickname'], die1: p['die1'], die2: p['die2'], total: p['total'] };
    case 'player-moved':
      if (typeof p['playerNickname'] !== 'string' || typeof p['tileId'] !== 'number' || typeof p['tileName'] !== 'string') return null;
      return {
        type: 'player-moved',
        playerId: doc.playerId,
        playerNickname: p['playerNickname'],
        tileId: p['tileId'],
        tileName: p['tileName'],
        ...(typeof p['collectedGoBonus'] === 'boolean' ? { collectedGoBonus: p['collectedGoBonus'] } : {}),
      };
    case 'property-bought':
      if (typeof p['playerNickname'] !== 'string' || typeof p['tileId'] !== 'number' || typeof p['tileName'] !== 'string' || typeof p['price'] !== 'number') return null;
      return { type: 'property-bought', playerId: doc.playerId, playerNickname: p['playerNickname'], tileId: p['tileId'], tileName: p['tileName'], price: p['price'] };
    case 'rent-paid':
      if (typeof p['playerNickname'] !== 'string' || typeof p['ownerId'] !== 'string' || typeof p['ownerNickname'] !== 'string' || typeof p['tileId'] !== 'number' || typeof p['tileName'] !== 'string' || typeof p['amount'] !== 'number') return null;
      return { type: 'rent-paid', playerId: doc.playerId, playerNickname: p['playerNickname'], ownerId: p['ownerId'], ownerNickname: p['ownerNickname'], tileId: p['tileId'], tileName: p['tileName'], amount: p['amount'] };
    case 'property-built':
      if (typeof p['playerNickname'] !== 'string' || typeof p['tileId'] !== 'number' || typeof p['tileName'] !== 'string' || typeof p['newLevel'] !== 'number') return null;
      return { type: 'property-built', playerId: doc.playerId, playerNickname: p['playerNickname'], tileId: p['tileId'], tileName: p['tileName'], newLevel: p['newLevel'] };
    case 'property-auctioned':
      if (typeof p['tileId'] !== 'number' || typeof p['tileName'] !== 'string' || typeof p['winnerId'] !== 'string' || typeof p['winnerNickname'] !== 'string' || typeof p['amount'] !== 'number') return null;
      return {
        type: 'property-auctioned',
        tileId: p['tileId'],
        tileName: p['tileName'],
        winnerId: p['winnerId'] === '' ? null : p['winnerId'],
        winnerNickname: p['winnerNickname'] === '' ? null : p['winnerNickname'],
        amount: p['amount'],
      };
    case 'card-drawn':
      if (typeof p['playerNickname'] !== 'string' || (p['deckType'] !== 'chance' && p['deckType'] !== 'community') || typeof p['cardText'] !== 'string') return null;
      return {
        type: 'card-drawn',
        playerId: doc.playerId,
        playerNickname: p['playerNickname'],
        deckType: p['deckType'],
        cardText: p['cardText'],
      };
    case 'tax-paid':
      if (typeof p['playerNickname'] !== 'string' || typeof p['tileId'] !== 'number' || typeof p['tileName'] !== 'string' || typeof p['amount'] !== 'number') return null;
      return {
        type: 'tax-paid',
        playerId: doc.playerId,
        playerNickname: p['playerNickname'],
        tileId: p['tileId'],
        tileName: p['tileName'],
        amount: p['amount'],
      };
    case 'property-sold':
      if (typeof p['playerNickname'] !== 'string' || typeof p['tileId'] !== 'number' || typeof p['tileName'] !== 'string' || typeof p['refundAmount'] !== 'number') return null;
      return {
        type: 'property-sold',
        playerId: doc.playerId,
        playerNickname: p['playerNickname'],
        tileId: p['tileId'],
        tileName: p['tileName'],
        refundAmount: p['refundAmount'],
      };
    default:
      return null;
  }
}
