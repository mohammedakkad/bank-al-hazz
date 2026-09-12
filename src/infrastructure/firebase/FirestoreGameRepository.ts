import {
  collection,
  doc,
  getDoc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { firestore } from './firebaseConfig';
import { playerToDocument, playerToStateUpdate, documentToPlayer, type PlayerDocument } from './playerMapper';
import { generateRoomCode } from '../../shared/utils/roomCode';
import type { Player } from '../../domain/entities/Player';
import type { GameSnapshot, IGameRepository } from '../../domain/interfaces/IGameRepository';

interface GameDocument {
  readonly status: 'lobby' | 'in-progress' | 'finished';
  readonly currentPlayerId: string | null;
  readonly turnNumber: number;
}

const MAX_ROOM_CODE_ATTEMPTS = 5;

function gameDocRef(gameId: string) {
  return doc(firestore, 'games', gameId);
}

function playersCollectionRef(gameId: string) {
  return collection(firestore, 'games', gameId, 'players');
}

/**
 * يولّد كود غرفة غير مستخدَم حالياً. الاحتمال التصادمي ضئيل جداً (32^6 قيمة ممكنة)،
 * لكن نتحقق فعلياً بدل الافتراض، مع عدد محاولات محدود لتفادي حلقة لا نهائية نظرياً.
 */
async function generateAvailableRoomCode(): Promise<string> {
  for (let attempt = 0; attempt < MAX_ROOM_CODE_ATTEMPTS; attempt++) {
    const code = generateRoomCode();
    const existing = await getDoc(gameDocRef(code));
    if (!existing.exists()) return code;
  }
  throw new Error('تعذّر توليد كود غرفة فريد، حاول مرة أخرى');
}

export class FirestoreGameRepository implements IGameRepository {
  async createGame(hostPlayer: Player): Promise<string> {
    const roomCode = await generateAvailableRoomCode();

    const gameData: GameDocument = {
      status: 'lobby',
      currentPlayerId: hostPlayer.id,
      turnNumber: 0,
    };
    await setDoc(gameDocRef(roomCode), gameData);

    const playerDoc = playerToDocument(hostPlayer, serverTimestamp());
    await setDoc(doc(playersCollectionRef(roomCode), hostPlayer.id), playerDoc);

    return roomCode;
  }

  async joinGame(gameId: string, player: Player): Promise<void> {
    const playerDoc = playerToDocument(player, serverTimestamp());
    await setDoc(doc(playersCollectionRef(gameId), player.id), playerDoc);
  }

  /**
   * ملاحظة معمارية مهمة (يجب معرفتها عند استخدام هذه الدالة):
   * ترتيب players[] في الـsnapshot يطابق ترتيب الانضمام (query مرتّبة بـjoinedAt).
   * أول لاعب بالمصفوفة = صاحب الغرفة (host) دائماً، لأن hostPlayer هو أول من يُكتب
   * له مستند عند createGame. هذا استنتاج ضمني وليس حقلاً صريحاً بالـGameSnapshot
   * (الواجهة IGameRepository لا تملك حقل hostId)، فأي كود يستخدم هذا الـrepository
   * ويحتاج معرفة "مين الـhost" لازم يعتمد على `players[0]?.id` تحديداً.
   */
  subscribeToGame(gameId: string, onUpdate: (snapshot: GameSnapshot) => void): () => void {
    let latestGameDoc: GameDocument | null = null;
    let latestPlayers: readonly Player[] = [];
    let hasGameDoc = false;
    let hasPlayers = false;

    const emitIfReady = () => {
      if (!hasGameDoc || !hasPlayers || !latestGameDoc) return;
      onUpdate({
        gameId,
        status: latestGameDoc.status,
        currentPlayerId: latestGameDoc.currentPlayerId,
        turnNumber: latestGameDoc.turnNumber,
        players: latestPlayers,
      });
    };

    const unsubscribeGame: Unsubscribe = onSnapshot(gameDocRef(gameId), (snapshot) => {
      const data = snapshot.data();
      if (!data) return;
      latestGameDoc = data as GameDocument;
      hasGameDoc = true;
      emitIfReady();
    });

    const playersQuery = query(playersCollectionRef(gameId), orderBy('joinedAt', 'asc'));
    const unsubscribePlayers: Unsubscribe = onSnapshot(playersQuery, (snapshot) => {
      latestPlayers = snapshot.docs.map((playerDoc) =>
        documentToPlayer(playerDoc.id, playerDoc.data() as PlayerDocument),
      );
      hasPlayers = true;
      emitIfReady();
    });

    return () => {
      unsubscribeGame();
      unsubscribePlayers();
    };
  }

  /**
   * فقط المضيف يستدعي هذه — قاعدة Firestore الحالية على games/{gameId} تشترط
   * request.auth.uid == resource.data.currentPlayerId، وبما إن currentPlayerId
   * يُضبط على hostPlayer.id منذ createGame، هذه الكتابة تمر بدون أي تعديل على القواعد.
   */
  async startGame(gameId: string): Promise<void> {
    await updateDoc(gameDocRef(gameId), {
      status: 'in-progress',
    });
  }

  async updatePlayerState(gameId: string, player: Player): Promise<void> {
    const stateUpdate = playerToStateUpdate(player);
    await setDoc(doc(playersCollectionRef(gameId), player.id), stateUpdate, { merge: true });
  }

  async advanceTurn(gameId: string, nextPlayerId: string): Promise<void> {
    await updateDoc(gameDocRef(gameId), {
      currentPlayerId: nextPlayerId,
      turnNumber: increment(1),
    });
  }
}
