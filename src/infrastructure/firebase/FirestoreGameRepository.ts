import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limitToLast,
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
import { logEntryToDocument, documentToLogEntry, type EventLogDocument } from './eventLogMapper';
import { generateRoomCode } from '../../shared/utils/roomCode';
import { pickAvailableTokenColor } from '../../shared/utils/tokenColor';
import type { Player } from '../../domain/entities/Player';
import type { GameSnapshot, GameLogEntry, IGameRepository } from '../../domain/interfaces/IGameRepository';
import type { AuctionState } from '../../domain/interfaces/AuctionState';
import { createInitialDeckState, type DeckState } from '../../domain/gameRules/CardDeck';

interface GameDocument {
  readonly status: 'lobby' | 'in-progress' | 'finished';
  readonly currentPlayerId: string | null;
  readonly turnNumber: number;
  /**
   * إضافة Phase B — حقل إضافي بحت (additive)، غير موجود بمستندات الألعاب القديمة.
   * لهذا نقرأه كـ`?? null` بكل مكان بدل الافتراض إنه موجود دائماً.
   */
  readonly activeAuction?: AuctionState | null;
  /** إضافة Bug4/بطاقات — نفس ملاحظة activeAuction: قد لا توجد بمستندات قديمة، نقرأها بـ`?? createInitialDeckState()` */
  readonly deckState?: DeckState;
}

const MAX_ROOM_CODE_ATTEMPTS = 5;
const LOG_WINDOW_SIZE = 40;

function gameDocRef(gameId: string) {
  return doc(firestore, 'games', gameId);
}

function playersCollectionRef(gameId: string) {
  return collection(firestore, 'games', gameId, 'players');
}

/**
 * السجل مخزَّن فعلياً بمجموعة Firestore اسمها "events" (وليس "log") — هذا هو
 * الاسم الموجود أصلاً بقواعد الأمان منذ Phase 3. استخدمناها كما هي بدل إنشاء
 * مجموعة جديدة موازية، انظر ملاحظة الفجوة بالملخص المرفق مع هذا التسليم.
 */
function eventsCollectionRef(gameId: string) {
  return collection(firestore, 'games', gameId, 'events');
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

  /**
   * Bug 1 (السبب الفعلي): لاعبان بنفس الغرفة ممكن ينتهي بيهم نفس لون الرمز الافتراضي
   * (#E24B4A بالـEntryScreen) لو محدش منهم بدّله يدوياً. قبل الكتابة، نتحقق من ألوان
   * اللاعبين الحاليين بهذه الغرفة تحديداً ونبدّل لون الطارئ الجديد تلقائياً لأقرب لون
   * متاح غير مستخدَم لو كان فيه تصادم — بدل ما يوصل التصادم أصلاً لواجهة اللعب.
   */
  async joinGame(gameId: string, player: Player): Promise<void> {
    const existingPlayersSnapshot = await getDocs(playersCollectionRef(gameId));
    const takenColors = new Set(
      existingPlayersSnapshot.docs
        .filter((playerDoc) => playerDoc.id !== player.id)
        .map((playerDoc) => (playerDoc.data() as PlayerDocument).tokenColor),
    );
    const resolvedPlayer = takenColors.has(player.tokenColor)
      ? player.withTokenColor(pickAvailableTokenColor(takenColors))
      : player;

    const playerDoc = playerToDocument(resolvedPlayer, serverTimestamp());
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
        activeAuction: latestGameDoc.activeAuction ?? null,
        deckState: latestGameDoc.deckState ?? createInitialDeckState(),
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

  async logEvent(gameId: string, entry: GameLogEntry): Promise<void> {
    const logDoc = logEntryToDocument(entry, serverTimestamp());
    const newDocRef = doc(eventsCollectionRef(gameId));
    await setDoc(newDocRef, logDoc);
  }

  /**
   * limitToLast + orderBy('timestamp','asc') بدل orderBy('desc').limit() —
   * كلاهما يرجع نفس أحدث N سجل، لكن limitToLast يحافظ على ترتيب الوقت
   * التصاعدي بالنتيجة مباشرة (الأقدم أولاً، الأحدث أخيراً) وهو الترتيب اللي
   * يحتاجه EventLog للعرض، بدل قلب المصفوفة يدوياً بعد كل تحديث.
   */
  /**
   * الأربعة التالية كلها writes بسيطة على حقل activeAuction بمستند games/{gameId} —
   * نفس المستند اللي كل اللاعبين مشتركين فيه أصلاً عبر subscribeToGame، فلا حاجة
   * لأي اشتراك/مجموعة فرعية جديدة. قواعد الأمان (firestore.rules) هي من تتحقق فعلياً
   * إن كل كتابة صادرة من لاعب مؤهّل وبمبلغ صالح — هذه الطبقة تكتب الحالة كما وصلتها
   * من طبقة application (AuctionUseCase) بدون أي تحقق إضافي هنا.
   */
  async startAuction(gameId: string, auction: AuctionState): Promise<void> {
    await updateDoc(gameDocRef(gameId), { activeAuction: auction });
  }

  async placeAuctionBid(gameId: string, auction: AuctionState): Promise<void> {
    await updateDoc(gameDocRef(gameId), { activeAuction: auction });
  }

  async passAuctionBid(gameId: string, auction: AuctionState): Promise<void> {
    await updateDoc(gameDocRef(gameId), { activeAuction: auction });
  }

  async endAuction(gameId: string): Promise<void> {
    await updateDoc(gameDocRef(gameId), { activeAuction: null });
  }

  async updateDeckState(gameId: string, deckState: DeckState): Promise<void> {
    await updateDoc(gameDocRef(gameId), { deckState });
  }

  subscribeToLog(gameId: string, onUpdate: (entries: readonly GameLogEntry[]) => void): () => void {
    const logQuery = query(eventsCollectionRef(gameId), orderBy('timestamp', 'asc'), limitToLast(LOG_WINDOW_SIZE));

    return onSnapshot(logQuery, (snapshot) => {
      const entries = snapshot.docs
        .map((docSnap) => documentToLogEntry(docSnap.data() as EventLogDocument))
        .filter((entry): entry is GameLogEntry => entry !== null);
      onUpdate(entries);
    });
  }
}
