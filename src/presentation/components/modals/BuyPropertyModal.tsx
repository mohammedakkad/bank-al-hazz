import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { PropertyTile } from '../../../domain/entities/BoardTile';

export interface BuyPropertyModalProps {
  readonly tile: PropertyTile | null;
  readonly currentMoney: number;
  readonly onBuy: () => Promise<void>;
  readonly onSkip: () => void;
}

export function BuyPropertyModal({ tile, currentMoney, onBuy, onSkip }: BuyPropertyModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * Bug 3 (الإصلاح الفعلي): السبب الحقيقي للتعليق على "جاري الشراء" كان افتراض
   * خاطئ إن هذا المكوّن "ينتهي دوره ويختفي تلقائياً" بعد كل عملية شراء — غير
   * صحيح منذ إضافة استمرار الدور بـdoubles (Phase B): React يعيد استخدام نفس
   * نسخة المكوّن لقرار شراء تالٍ (عقار ثانٍ بنفس الدور)، فتبقى isSubmitting=true
   * من القرار السابق للأبد. نصفّرها صراحة كل مرة يتغيّر فيها العقار المعروض
   * (بما في ذلك اختفاؤه بـtile=null) بدل الاعتماد على "اختفاء المكوّن".
   */
  useEffect(() => {
    setIsSubmitting(false);
    setErrorMessage(null);
  }, [tile?.id]);

  async function handleBuyClick() {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await onBuy();
      // نجاح عادي: GameScreen سيصفّر tile قريباً فيصفّر الـeffect فوق isSubmitting تلقائياً.
    } catch (error) {
      // العنصر الثاني بالإصلاح: أي خطأ (مثلاً كتابة Firestore فشلت) ما عاد يعلّق الزر للأبد
      console.error('BuyPropertyModal: onBuy failed', error);
      setIsSubmitting(false);
      setErrorMessage('تعذّر إتمام الشراء، حاول مرة أخرى أو اضغط تخطي');
    }
  }

  function handleSkipClick() {
    setErrorMessage(null);
    onSkip();
  }

  return (
    <AnimatePresence>
      {tile && (
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
              <span className="text-2xl">{tile.countryFlag}</span>
              <div>
                <h3 className="font-bold">{tile.name}</h3>
                <p className="text-xs text-gray-400">{tile.region}</p>
              </div>
            </div>

            <div className="mb-4 flex items-center justify-between text-sm">
              <span className="text-gray-300">السعر</span>
              <span className="font-bold text-amber-400">{tile.purchasePrice.toLocaleString('ar-EG')} جنيه</span>
            </div>
            <div className="mb-4 flex items-center justify-between text-sm">
              <span className="text-gray-300">رصيدك الحالي</span>
              <span className="tabular-nums">{currentMoney.toLocaleString('ar-EG')} جنيه</span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleBuyClick}
                disabled={isSubmitting}
                className="flex-1 rounded-md bg-amber-400 px-3 py-2 text-sm font-bold text-board-bg disabled:opacity-60"
              >
                {isSubmitting ? '...جارِ الشراء' : 'شراء'}
              </button>
              <button
                type="button"
                onClick={handleSkipClick}
                disabled={isSubmitting}
                className="flex-1 rounded-md border border-board-line px-3 py-2 text-sm disabled:opacity-40"
              >
                تخطي
              </button>
            </div>

            {errorMessage && (
              <p role="alert" className="mt-2 text-center text-xs text-red-400">
                {errorMessage}
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
