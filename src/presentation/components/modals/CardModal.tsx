import { AnimatePresence, motion } from 'framer-motion';
import type { Card, DeckType } from '../../../domain/entities/Card';

export interface CardModalProps {
  readonly card: Card | null;
  readonly deckType: DeckType | null;
  readonly onDismiss: () => void;
}

/**
 * لحظة "مونوبولي حقيقية" — تعرض نص البطاقة لثوانٍ قليلة قبل ما أثرها يظهر فعلياً
 * بالحالة المشتركة (نفس أسلوب الدخول/الخروج بـFramer Motion المتّبع بباقي المودالات).
 */
export function CardModal({ card, deckType, onDismiss }: CardModalProps) {
  const isOpen = card !== null && deckType !== null;

  return (
    <AnimatePresence>
      {isOpen && card && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onDismiss}
        >
          <motion.div
            className="w-full max-w-xs rounded-lg border-2 border-amber-400 bg-board-tile p-4 text-center text-white"
            initial={{ opacity: 0, scale: 0.85, rotateY: -15 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 350, damping: 26 }}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="mb-2 font-bold text-amber-400">{deckType === 'chance' ? '🎲 فرصة' : '📦 صندوق المجتمع'}</h3>
            <p className="text-sm leading-relaxed text-gray-100">{card.text}</p>
            <button
              type="button"
              onClick={onDismiss}
              className="mt-4 w-full rounded-md bg-amber-400 px-3 py-2 text-sm font-bold text-board-bg"
            >
              حسناً
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
