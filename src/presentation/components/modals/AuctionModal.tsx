import { AnimatePresence, motion } from 'framer-motion';
import type { BoardTile } from '../../../domain/entities/BoardTile';
import type { AuctionState } from '../../../domain/interfaces/AuctionState';
import { MIN_BID_INCREMENT } from '../../../domain/interfaces/AuctionState';

export interface AuctionModalProps {
  readonly auction: AuctionState | null;
  readonly tile: BoardTile | null;
  readonly myPlayerId: string;
  readonly nicknameById: ReadonlyMap<string, string>;
  readonly myMoney: number;
  readonly onBid: (amount: number) => void;
  readonly onPass: () => void;
}

const BID_STEPS = [MIN_BID_INCREMENT, 50, 100] as const;

export function AuctionModal({ auction, tile, myPlayerId, nicknameById, myMoney, onBid, onPass }: AuctionModalProps) {
  const isOpen = auction !== null && tile !== null;
  const isMyTurn = auction?.turnPlayerId === myPlayerId;
  const hasPassed = auction?.passedPlayerIds.includes(myPlayerId) ?? false;

  return (
    <AnimatePresence>
      {isOpen && auction && tile && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="w-full max-w-xs rounded-lg border border-amber-400 bg-board-tile p-4 text-white"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <div className="mb-3 flex items-center gap-2">
              {tile.type === 'property' && <span className="text-2xl">{tile.countryFlag}</span>}
              <div>
                <h3 className="font-bold">مزاد: {tile.name}</h3>
                {tile.type === 'property' && <p className="text-xs text-gray-400">{tile.region}</p>}
              </div>
            </div>

            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-gray-300">أعلى مزايدة</span>
              <span className="font-bold text-amber-400 tabular-nums">
                {auction.currentHighestBid > 0
                  ? `${auction.currentHighestBid.toLocaleString('ar-EG')} جنيه — ${nicknameById.get(auction.currentHighestBidderId ?? '') ?? ''}`
                  : 'لا توجد مزايدات بعد'}
              </span>
            </div>

            <div className="mb-4 flex items-center justify-between text-sm">
              <span className="text-gray-300">رصيدك الحالي</span>
              <span className="tabular-nums">{myMoney.toLocaleString('ar-EG')} جنيه</span>
            </div>

            {hasPassed ? (
              <p className="rounded-md border border-board-line px-3 py-2 text-center text-sm text-gray-400">
                انسحبت من هذا المزاد — بانتظار البقية
              </p>
            ) : isMyTurn ? (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  {BID_STEPS.map((step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => onBid(auction.currentHighestBid + step)}
                      disabled={myMoney < auction.currentHighestBid + step}
                      className="flex-1 rounded-md bg-amber-400 px-2 py-2 text-xs font-bold text-board-bg disabled:opacity-40"
                    >
                      {'+' + step}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={onPass}
                  className="w-full rounded-md border border-board-line px-3 py-2 text-sm"
                >
                  انسحاب من المزاد
                </button>
              </div>
            ) : (
              <p className="rounded-md border border-board-line px-3 py-2 text-center text-sm text-gray-400">
                دور {nicknameById.get(auction.turnPlayerId) ?? '...'} بالمزايدة الآن
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
