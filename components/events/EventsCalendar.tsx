import React, { useMemo, useState } from 'react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, NotebookPen, Pencil } from 'lucide-react';
import { buildEventCalendarMonth, partitionEventCalendarWeeks } from '../../event-calendar';
import { CalendarEvent } from '../../types';
import { formatDateReadable, getTodayString, getWeekString } from '../../utils';
import { Modal } from '../Modal';
import { WeekMetaBadges, WeekNotesEditor } from '../WeekNotes';
import { DayMetaBadges, DayNotesEditor } from '../DayNotes';
import { useAppStore } from '../../store';
import { isFirstToSecondTransitionDay } from '../../week-shifts';
import { useI18n } from '../../i18n';

interface EventsCalendarProps {
  events: CalendarEvent[];
  month: string;
  onMonthChange: (month: string) => void;
  onEditEvent: (event: CalendarEvent) => void;
}

const WEEKDAYS = {
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
};

const shiftMonth = (month: string, delta: number): string => {
  const [year, monthNumber] = month.split('-').map(Number);
  const next = new Date(year, monthNumber - 1 + delta, 1, 12);
  return `${next.getFullYear()}-${(next.getMonth() + 1).toString().padStart(2, '0')}`;
};

export const EventsCalendar: React.FC<EventsCalendarProps> = ({
  events,
  month,
  onMonthChange,
  onEditEvent,
}) => {
  const { state } = useAppStore();
  const { language, locale, t } = useI18n();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingWeek, setEditingWeek] = useState<string | null>(null);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [pastWeeksExpanded, setPastWeeksExpanded] = useState(false);
  const today = getTodayString();
  const weeks = useMemo(() => buildEventCalendarMonth(month), [month]);
  const { pastWeeks, currentAndFutureWeeks } = useMemo(
    () => partitionEventCalendarWeeks(weeks, getWeekString()),
    [weeks],
  );
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {};
    events.forEach(event => {
      (grouped[event.date] ??= []).push(event);
    });
    Object.values(grouped).forEach(dayEvents => {
      dayEvents.sort((a, b) => a.time.localeCompare(b.time));
    });
    return grouped;
  }, [events]);

  const monthLabel = new Date(`${month}-01T12:00:00`).toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  });
  const selectedEvents = selectedDate ? eventsByDate[selectedDate] ?? [] : [];

  const renderWeek = ({ week, days }: (typeof weeks)[number]) => (
    <div key={week} className="border-b border-slate-100 last:border-b-0">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 bg-slate-50/80 px-2 py-1.5">
        <span className="flex-shrink-0 text-[10px] font-bold uppercase text-slate-400">
          {language === 'ru' ? 'Н' : 'W'}{week.split('-W')[1]}
        </span>
        <WeekMetaBadges
          week={week}
          onEdit={() => setEditingWeek(week)}
          maxNotes={2}
          className="min-w-0 flex-1"
        />
      </div>
      <div className="grid grid-cols-7">
        {days.map(day => {
          const dayEvents = eventsByDate[day.date] ?? [];
          const dayNotes = state.dayNotes[day.date] ?? [];
          const isToday = day.date === today;
          const isTransitionDay = isFirstToSecondTransitionDay(state.workShiftSettings, day.date);
          const highlightNotes = state.uiPreferences.calendarNoteHighlight && dayNotes.length > 0;
          const background = !day.isInMonth
            ? 'bg-slate-50/50 text-slate-300'
            : highlightNotes && isTransitionDay
              ? 'bg-gradient-to-br from-sky-50/80 to-emerald-50/70'
              : highlightNotes
                ? 'bg-sky-50/50'
                : isTransitionDay
                  ? 'bg-emerald-50/60'
                  : 'bg-white';
          return (
            <button
              key={day.date}
              type="button"
              onClick={() => setSelectedDate(day.date)}
              aria-current={isToday ? 'date' : undefined}
              className={`flex min-h-20 min-w-0 flex-col items-stretch justify-start border-r border-slate-100 p-0.5 text-left last:border-r-0 hover:brightness-[0.98] sm:min-h-28 sm:p-1 ${background}`}
              title={`${isToday ? t('Today · ') : ''}${dayEvents.length ? t('{count} events', { count: dayEvents.length }) : t('No events')}${dayNotes.length ? ` · ${t('{count} notes', { count: dayNotes.length })}` : ''}`}
            >
              <div className="flex items-start justify-between gap-0.5">
                <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold sm:text-xs ${
                  isToday
                    ? 'bg-indigo-600 text-white'
                    : day.isInMonth ? 'text-slate-600' : 'text-slate-300'
                }`}>
                  {day.dayOfMonth}
                </span>
                <span className="flex items-center gap-0.5">
                  {dayNotes.length > 0 && (
                    <NotebookPen className="h-2.5 w-2.5 text-sky-600 sm:hidden" aria-hidden="true" />
                  )}
                  {dayEvents.length > 0 && (
                    <span className="rounded-full bg-amber-100 px-1 text-[9px] font-bold text-amber-700">
                    {dayEvents.length}
                    </span>
                  )}
                </span>
              </div>
              {dayNotes.length > 0 && (
                <div className="mt-0.5 hidden min-w-0 items-center gap-1 rounded bg-sky-50 px-1.5 py-0.5 text-[9px] font-medium text-sky-800 sm:flex">
                  <NotebookPen className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{dayNotes[0].text}</span>
                  {dayNotes.length > 1 && <span className="flex-shrink-0">+{dayNotes.length - 1}</span>}
                </div>
              )}
              <div className="mt-0.5 space-y-0.5">
                {dayEvents.slice(0, 3).map(event => (
                  <div key={event.id} className="min-w-0 rounded-sm bg-amber-100 px-0.5 py-0.5 text-[8px] font-medium leading-tight text-amber-800 sm:px-1 sm:text-[9px]">
                    <span className="sm:hidden">{event.time}</span>
                    <span className="hidden truncate sm:block">{event.time} {event.title}</span>
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-center text-[8px] font-semibold text-amber-700 sm:text-[9px]">+{dayEvents.length - 3}</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-2 py-2 sm:px-3">
          <button
            type="button"
            onClick={() => onMonthChange(shiftMonth(month, -1))}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            title={t('Previous month')}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex min-w-0 items-center gap-2 font-semibold text-slate-700">
            <CalendarDays className="h-4 w-4 flex-shrink-0 text-amber-600" />
            <span className="truncate">{monthLabel}</span>
          </div>
          <button
            type="button"
            onClick={() => onMonthChange(shiftMonth(month, 1))}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            title={t('Next month')}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
          {WEEKDAYS[language].map(day => (
            <div key={day} className="py-1.5 text-center text-[10px] font-bold uppercase text-slate-400 sm:text-xs">
              {day}
            </div>
          ))}
        </div>

        {pastWeeks.length > 0 && (
          <button
            type="button"
            onClick={() => setPastWeeksExpanded(value => !value)}
            aria-expanded={pastWeeksExpanded}
            className="flex w-full items-center justify-between border-b border-slate-100 bg-slate-50/70 px-3 py-2 text-left text-xs font-semibold text-slate-500 hover:bg-slate-100"
          >
            <span>{t('Past weeks ({count})', { count: pastWeeks.length })}</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${pastWeeksExpanded ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
        )}

        {pastWeeksExpanded && pastWeeks.map(renderWeek)}
        {currentAndFutureWeeks.map(renderWeek)}
      </section>

      <Modal
        isOpen={selectedDate !== null}
        onClose={() => setSelectedDate(null)}
        title={selectedDate ? formatDateReadable(selectedDate, language) : t('Day events')}
      >
        <div className="space-y-4">
          {selectedDate && (
            <DayMetaBadges
              date={selectedDate}
              onEdit={() => setEditingDate(selectedDate)}
              maxNotes={3}
            />
          )}
          {selectedEvents.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 px-3 py-8 text-center text-sm text-slate-400">
              {t('No events planned for this day.')}
            </div>
          ) : (
            <div className="space-y-2">
            {selectedEvents.map(event => (
              <button
                key={event.id}
                type="button"
                onClick={() => {
                  setSelectedDate(null);
                  onEditEvent(event);
                }}
                className="flex w-full items-start gap-3 rounded-lg border border-slate-200 p-3 text-left hover:border-amber-200 hover:bg-amber-50/40"
              >
                <span className="rounded bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">{event.time}</span>
                <span className="min-w-0 flex-1 break-words text-sm text-slate-700">{event.title}</span>
                <Pencil className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
              </button>
            ))}
            </div>
          )}
        </div>
      </Modal>

      <WeekNotesEditor week={editingWeek} onClose={() => setEditingWeek(null)} />
      <DayNotesEditor date={editingDate} onClose={() => setEditingDate(null)} />
    </>
  );
};
