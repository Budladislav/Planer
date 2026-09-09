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
import weeklyTemplateSource from './components/views/WeeklyTemplate.tsx?raw';

describe('Today task card presentation', () => {
  it('does not apply an implicit highlight to the first task', () => {
    expect(todayViewSource).not.toContain('isFirst');
    expect(todayViewSource).not.toContain('border-indigo-300');
  });

  it('keeps one-step grade promotion available on collapsed planning cards', () => {
    expect(todayViewSource).toContain('<RewardGradeIncrementButton taskId={task.id} goalLinked={task.goalId !== null} />');
    expect(periodTaskCardSource).toContain('<RewardGradeIncrementButton taskId={task.id} goalLinked={task.goalId !== null} />');
    expect(monthViewSource).toContain('<PeriodTaskCard');
    expect(yearViewSource).toContain('<PeriodTaskCard');
    expect(weekTaskItemsSource.match(/<RewardGradeIncrementButton taskId=\{task\.id\} goalLinked=\{task\.goalId !== null\} \/>/g)).toHaveLength(2);
  });

  it('keeps task controls collapsed and leaves only planning details under the grade selector', () => {
    expect(todayViewSource.match(/<TaskIconButton/g)).toHaveLength(5);
    expect(periodTaskCardSource.match(/<TaskIconButton/g)).toHaveLength(4);
    expect(weekTaskItemsSource.match(/<TaskIconButton/g)).toHaveLength(6);
    expect(todayViewSource.match(/<WeekTaskMoveButton/g)).toHaveLength(1);
    expect(weekTaskItemsSource.match(/<WeekTaskMoveButton/g)).toHaveLength(2);
    expect(weekTaskItemsSource.match(/label=\{t\('Mark as done'\)\}/g)).toHaveLength(2);
    expect(todayViewSource.match(/<RewardGradeSelector taskId=\{task\.id\} compact goalLinked=\{task\.goalId !== null\} \/>/g)).toHaveLength(1);
    expect(periodTaskCardSource.match(/<RewardGradeSelector taskId=\{task\.id\} compact goalLinked=\{task\.goalId !== null\} \/>/g)).toHaveLength(1);
    expect(weekTaskItemsSource.match(/<RewardGradeSelector taskId=\{task\.id\} compact goalLinked=\{task\.goalId !== null\} \/>/g)).toHaveLength(2);
    expect(todayViewSource.indexOf('<WeekTaskMoveButton')).toBeGreaterThan(todayViewSource.indexOf('showActions &&'));
    expect(todayViewSource.indexOf("label={t('Record this task as completed yesterday')}")).toBeGreaterThan(todayViewSource.indexOf('showActions &&'));
    expect(periodTaskCardSource.indexOf("label={t('Delete')}")).toBeLessThan(periodTaskCardSource.indexOf('showActions &&'));
    expect(periodTaskCardSource.indexOf("label={t('Edit task')}")).toBeLessThan(periodTaskCardSource.indexOf('showActions &&'));
    expect(weekTaskItemsSource.indexOf("label={t('Delete')}")).toBeLessThan(weekTaskItemsSource.indexOf('showActions &&'));
    expect(weekTaskItemsSource.indexOf("label={t('Edit task')}")).toBeLessThan(weekTaskItemsSource.indexOf('showActions &&'));
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

  it('uses one control order across every planning level', () => {
    const cardHeader = (source: string, start = 0) => {
      const surface = source.indexOf('<RewardGradeSurface', start);
      return source.slice(surface, source.indexOf('className={`overflow-hidden', surface));
    };
    const expectControlOrder = (
      source: string,
      deleteLabel: string,
      options: { move?: string; complete?: string } = {},
    ) => {
      const deleteIndex = source.indexOf(deleteLabel);
      const titleIndex = source.indexOf('{task.title}');
      const moveIndex = options.move ? source.indexOf(options.move) : -1;
      const gradeIndex = source.indexOf('<RewardGradeIncrementButton');
      const editIndex = source.indexOf("label={t('Edit task')}");
      const completeIndex = options.complete ? source.indexOf(options.complete) : -1;

      expect(deleteIndex).toBeGreaterThanOrEqual(0);
      expect(titleIndex).toBeGreaterThan(deleteIndex);
      expect(gradeIndex).toBeGreaterThan(titleIndex);
      if (options.move) {
        expect(moveIndex).toBeGreaterThan(gradeIndex);
        expect(editIndex).toBeGreaterThan(moveIndex);
      } else {
        expect(editIndex).toBeGreaterThan(gradeIndex);
      }
      if (options.complete) expect(completeIndex).toBeGreaterThan(editIndex);
    };

    expectControlOrder(
      cardHeader(todayViewSource),
      "label={t('Delete task')}",
      { complete: "label={t('Mark as done')}" },
    );
    expectControlOrder(
      cardHeader(periodTaskCardSource),
      "label={t('Delete')}",
      { move: "label={t('Move')}", complete: "label={t('Mark as done')}" },
    );

    expectControlOrder(
      cardHeader(weekTaskItemsSource, weekTaskItemsSource.indexOf('const DayTaskItem')),
      "label={t('Delete')}",
      { move: '<WeekTaskMoveButton', complete: "label={t('Mark as done')}" },
    );
    expectControlOrder(
      cardHeader(weekTaskItemsSource, weekTaskItemsSource.indexOf('const BucketTaskItem')),
      "label={t('Delete')}",
      { move: '<WeekTaskMoveButton', complete: "label={t('Mark as done')}" },
    );

    const templateHeader = cardHeader(weeklyTemplateSource);
    const templateDelete = templateHeader.indexOf("label={t('Delete template task')}");
    const templateTitle = templateHeader.indexOf('{task.title}');
    const templateGrade = templateHeader.indexOf('<RewardGradeIncrementButton');
    const templateEdit = templateHeader.indexOf("label={t('Edit template task')}");
    expect(templateDelete).toBeGreaterThanOrEqual(0);
    expect(templateTitle).toBeGreaterThan(templateDelete);
    expect(templateGrade).toBeGreaterThan(templateTitle);
    expect(templateEdit).toBeGreaterThan(templateGrade);
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
