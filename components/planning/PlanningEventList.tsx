import React from 'react';
import { CalendarClock, ChevronRight } from 'lucide-react';
import type { CalendarEvent } from '../../types';
import { formatDateShort } from '../../utils';
import { useI18n } from '../../i18n';

export const PlanningEventList: React.FC<{
  events: readonly CalendarEvent[];
  onOpenDay: (day: string) => void;
}> = ({ events, onOpenDay }) => {
  const { t } = useI18n();
  if (events.length === 0) return null;

  return (
    <div className="mt-2 space-y-1" aria-label={t('Events')}>
      {events.map(event => (
        <button
          key={event.id}
          type="button"
          onClick={() => onOpenDay(event.date)}
          className="flex w-full min-w-0 items-center gap-2 rounded-lg border border-amber-100 bg-amber-50/55 px-2.5 py-2 text-left transition-colors hover:bg-amber-50"
        >
          <CalendarClock className="h-3.5 w-3.5 flex-shrink-0 text-amber-600" />
          <span className="flex-shrink-0 text-[11px] font-semibold text-amber-800">{formatDateShort(event.date).slice(0, 5)} · {event.time}</span>
          <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700">{event.title}</span>
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
        </button>
      ))}
    </div>
  );
};
