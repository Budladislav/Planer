import { describe, expect, it } from 'vitest';
import monthViewSource from './components/views/Month.tsx?raw';
import yearViewSource from './components/views/Year.tsx?raw';
import todayViewSource from './components/views/Today.tsx?raw';
import weekTaskItemsSource from './components/week/WeekTaskItems.tsx?raw';
import weekTaskMoveControlSource from './components/week/WeekTaskMoveControl.tsx?raw';
import periodTaskCardSource from './components/planning/PeriodTaskCard.tsx?raw';
import dayNotesSource from './components/DayNotes.tsx?raw';
import weekNotesSource from './components/WeekNotes.tsx?raw';
import monthNotesSource from './components/MonthNotes.tsx?raw';

describe('Today task card presentation', () => {
  it('does not apply an implicit highlight to the first task', () => {
    expect(todayViewSource).not.toContain('isFirst');
    expect(todayViewSource).not.toContain('border-indigo-300');
  });

  it('keeps one-step grade promotion available on collapsed planning cards', () => {
    expect(todayViewSource).toContain('<RewardGradeIncrementButton taskId={task.id} />');
    expect(periodTaskCardSource).toContain('<RewardGradeIncrementButton taskId={task.id} />');
    expect(monthViewSource).toContain('<PeriodTaskCard');
    expect(yearViewSource).toContain('<PeriodTaskCard');
    expect(weekTaskItemsSource.match(/<RewardGradeIncrementButton taskId=\{task\.id\} \/>/g)).toHaveLength(2);
  });

  it('keeps frequent actions collapsed and moves secondary actions under the grade selector', () => {
    expect(todayViewSource.match(/<TaskIconButton/g)).toHaveLength(5);
    expect(periodTaskCardSource.match(/<TaskIconButton/g)).toHaveLength(4);
    expect(weekTaskItemsSource.match(/<TaskIconButton/g)).toHaveLength(6);
    expect(todayViewSource.match(/<WeekTaskMoveButton/g)).toHaveLength(1);
    expect(weekTaskItemsSource.match(/<WeekTaskMoveButton/g)).toHaveLength(2);
    expect(weekTaskItemsSource.match(/label=\{t\('Mark as done'\)\}/g)).toHaveLength(2);
    expect(todayViewSource.match(/<RewardGradeSelector taskId=\{task\.id\} compact \/>/g)).toHaveLength(1);
    expect(periodTaskCardSource.match(/<RewardGradeSelector taskId=\{task\.id\} compact \/>/g)).toHaveLength(1);
    expect(weekTaskItemsSource.match(/<RewardGradeSelector taskId=\{task\.id\} compact \/>/g)).toHaveLength(2);
    expect(todayViewSource.indexOf('<WeekTaskMoveButton')).toBeGreaterThan(todayViewSource.indexOf('showActions &&'));
    expect(todayViewSource.indexOf("label={t('Record this task as completed yesterday')}")).toBeGreaterThan(todayViewSource.indexOf('showActions &&'));
    expect(periodTaskCardSource.indexOf("label={t('Delete')}")).toBeGreaterThan(periodTaskCardSource.indexOf('showActions &&'));
    expect(periodTaskCardSource.indexOf("label={t('Edit task')}")).toBeGreaterThan(periodTaskCardSource.indexOf('showActions &&'));
    expect(weekTaskItemsSource.indexOf("label={t('Delete')}")).toBeGreaterThan(weekTaskItemsSource.indexOf('showActions &&'));
    expect(weekTaskItemsSource.indexOf("label={t('Edit task')}")).toBeGreaterThan(weekTaskItemsSource.indexOf('showActions &&'));
  });

  it('reuses the weekly destination picker for Today and Week tasks', () => {
    expect(todayViewSource).toContain('<WeekTaskMoveSheet');
    expect(weekTaskMoveControlSource).toContain("t('Week bucket (no date)')");
    expect(weekTaskMoveControlSource).toContain('getWeekDates(week)');
    expect(weekTaskMoveControlSource).toContain('day.date >= today');
  });

  it('offers distinct quick-add controls for the start and end of Today', () => {
    expect(todayViewSource).toContain('const AddToStartIcon');
    expect(todayViewSource).toContain('const AddToEndIcon');
    expect(todayViewSource.match(/Add task to start/g)).toHaveLength(4);
    expect(todayViewSource.match(/Add task to end/g)).toHaveLength(4);
    expect(todayViewSource).toContain("position === 'start' ? [newTaskId, ...orderedIds] : [...orderedIds, newTaskId]");
  });

  it('combines the active grade marker with its promotion button', () => {
    const activeTodayCard = todayViewSource.slice(0, todayViewSource.indexOf('export const TodayView'));
    expect(activeTodayCard).not.toContain('<RewardGradeMarker');
    expect(periodTaskCardSource).not.toContain('<RewardGradeMarker');
    expect(weekTaskItemsSource).not.toContain('<RewardGradeMarker');
  });

  it('uses a notebook with a pencil for period note controls', () => {
    const dayMetaBadges = dayNotesSource.slice(0, dayNotesSource.indexOf('interface DayNotesEditorProps'));
    const weekMetaBadges = weekNotesSource.slice(0, weekNotesSource.indexOf('interface WeekNotesEditorProps'));
    const monthMetaBadges = monthNotesSource.slice(0, monthNotesSource.indexOf('interface MonthNotesEditorProps'));

    expect(dayMetaBadges).toContain('<NotebookPen');
    expect(dayMetaBadges).not.toContain('<Plus');
    expect(weekMetaBadges).toContain('<NotebookPen');
    expect(weekMetaBadges).not.toContain('<Plus');
    expect(monthMetaBadges).toContain('<NotebookPen');
    expect(monthMetaBadges).not.toContain('<Plus');
  });
});
