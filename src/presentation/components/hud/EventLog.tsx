import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { GameLogEntry } from '../../../domain/interfaces/IGameRepository';
import { formatLogEntry } from '../../../shared/utils/formatLogEntry';

export interface EventLogProps {
  readonly entries: readonly GameLogEntry[];
}

const COLLAPSED_VISIBLE_COUNT = 2;

/** مفتاح ثابت لكل سطر — الاتحاد المميَّز ما فيه id، فنبني واحداً من محتوى الحدث نفسه */
function entryKey(entry: GameLogEntry, index: number): string {
  return `${index}-${entry.type}-${entry.playerId}`;
}

export function EventLog({ entries }: EventLogProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const visibleEntries = isExpanded ? entries : entries.slice(-COLLAPSED_VISIBLE_COUNT);

  return (
    <div className="rounded-md border border-board-line bg-board-tile">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs text-gray-300 sm:text-sm"
      >
        <span>سجل الأحداث</span>
        <span className="text-amber-400">{isExpanded ? 'إخفاء ▲' : 'عرض الكل ▼'}</span>
      </button>

      <ul
        className={['flex flex-col gap-1 overflow-y-auto px-3 pb-2', isExpanded ? 'max-h-48' : ''].join(' ')}
      >
        <AnimatePresence initial={false}>
          {visibleEntries.map((entry, index) => (
            <motion.li
              key={entryKey(entry, index)}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="text-xs text-gray-200 sm:text-sm"
            >
              {formatLogEntry(entry)}
            </motion.li>
          ))}
        </AnimatePresence>
        {entries.length === 0 && <li className="text-xs text-gray-500">لا أحداث بعد</li>}
      </ul>
    </div>
  );
}
