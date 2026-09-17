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
    const incrementControl = '<RewardGradeIncrementButton task={task} />';
    expect(todayViewSource).toContain(incrementControl);
    expect(periodTaskCardSource).toContain(incrementControl);
    expect(monthViewSource).toContain('<PeriodTaskCard');
    expect(yearViewSource).toContain('<PeriodTaskCard');
    expect(weekTaskItemsSource.match(/<RewardGradeIncrementButton task=\{task\} \/>/g)).toHaveLength(2);
  });

  it('keeps secondary controls inside the expanded card', () => {
    const todayCard = todayViewSource.slice(todayViewSource.indexOf('const SortableTaskItem'), todayViewSource.indexOf('const DayOverview'));
    const todayExpanded = todayCard.indexOf('showActions &&');
    expect(todayCard.indexOf('<WeekTaskMoveButton')).toBeGreaterThan(todayExpanded);
    expect(todayCard.indexOf("label={t('Record this task as completed yesterday')}")).toBeGreaterThan(todayExpanded);
    expect(todayCard.indexOf("label={t('Edit task')}")).toBeLessThan(todayExpanded);

    const expectPeriodControls = (source: string) => {
      const expanded = source.indexOf('showActions &&');
      expect(source.indexOf("label={t('Delete')}")).toBeGreaterThan(expanded);
      expect(source.indexOf("label={t('Edit task')}")).toBeGreaterThan(expanded);
      expect(source.indexOf("label={t('Mark as done')}")).toBeLessThan(expanded);
    };
    expectPeriodControls(periodTaskCardSource);
    expectPeriodControls(weekTaskItemsSource.slice(weekTaskItemsSource.indexOf('const DayTaskItem'), weekTaskItemsSource.indexOf('// Sortable wrapper for DayTaskItem')));
    expectPeriodControls(weekTaskItemsSource.slice(weekTaskItemsSource.indexOf('const BucketTaskItem')));

    const gradeSelector = '<RewardGradeSelector task={task} compact />';
    expect(todayViewSource).toContain(gradeSelector);
    expect(periodTaskCardSource).toContain(gradeSelector);
    expect(weekTaskItemsSource.split(gradeSelector)).toHaveLength(3);
  });

  it('reuses the weekly destination picker for Today and Week tasks', () => {
    expect(todayViewSource).toContain('<WeekTaskMoveSheet');
    expect(weekTaskMoveControlSource).toContain("t('Week bucket (no date)')");
    expect(weekTaskMoveControlSource).toContain('getWeekDates(week)');
    expect(weekTaskMoveControlSource).toContain('.filter((day) => day.date >= today)');
    expect(weekTaskMoveControlSource).toContain('canMoveToNextWeek');
    expect(weekTaskMoveControlSource).toContain('canMoveToWeekPool');
  });

  it('offers distinct quick-add controls for the start and end of Today', () => {
    expect(todayViewSource).toContain('const AddToStartIcon');
    expect(todayViewSource).toContain('const AddToEndIcon');
    expect(todayViewSource.match(/Add task to start/g)).toHaveLength(4);
    expect(todayViewSource.match(/Add task to end/g)).toHaveLength(4);
    expect(todayViewSource).toContain("position === 'start' ? [newTaskId, ...orderedIds] : [...orderedIds, newTaskId]");
  });

  it('combines the active grade marker with its promotion button', () => {
    const activeTodayCard = todayViewSource.slice(todayViewSource.indexOf('const SortableTaskItem'), todayViewSource.indexOf('const CompletedTaskItem'));
    expect(activeTodayCard).not.toContain('<RewardGradeMarker');
    expect(periodTaskCardSource).not.toContain('<RewardGradeMarker');
    expect(weekTaskItemsSource).not.toContain('<RewardGradeMarker');
  });

  it('uses one control order across every planning level', () => {
    const cardHeader = (source: string, start = 0) => {
      const surface = source.indexOf('<RewardGradeSurface', start);
      return source.slice(surface, source.indexOf('className={`overflow-hidden', surface));
    };
    const expectTodayControlOrder = (source: string) => {
      const deleteLabel = "label={t('Delete task')}";
      const completeLabel = "label={t('Mark as done')}";
      const deleteIndex = source.indexOf(deleteLabel);
      const titleIndex = source.indexOf('{task.title}');
      const gradeIndex = source.indexOf('<RewardGradeIncrementButton');
      const editIndex = source.indexOf("label={t('Edit task')}");
      const completeIndex = source.indexOf(completeLabel);

      expect(deleteIndex).toBeGreaterThanOrEqual(0);
      expect(titleIndex).toBeGreaterThan(deleteIndex);
      expect(gradeIndex).toBeGreaterThan(titleIndex);
      expect(editIndex).toBeGreaterThan(gradeIndex);
      expect(completeIndex).toBeGreaterThan(editIndex);
    };

    const expectPeriodControlOrder = (source: string, moveLabel: string) => {
      const titleIndex = source.indexOf('{task.title}');
      const gradeIndex = source.indexOf('<RewardGradeIncrementButton');
      const moveIndex = source.indexOf(moveLabel);
      const completeIndex = source.indexOf("label={t('Mark as done')}");
      const expandedIndex = source.indexOf('showActions &&');
      expect(gradeIndex).toBeGreaterThan(titleIndex);
      expect(moveIndex).toBeGreaterThan(gradeIndex);
      expect(completeIndex).toBeGreaterThan(moveIndex);
      expect(source.indexOf("label={t('Delete')}")).toBeGreaterThan(expandedIndex);
      expect(source.indexOf("label={t('Edit task')}")).toBeGreaterThan(expandedIndex);
    };

    expectTodayControlOrder(cardHeader(todayViewSource));
    expectPeriodControlOrder(periodTaskCardSource, "label={t('Move')}");
    expectPeriodControlOrder(
      weekTaskItemsSource.slice(weekTaskItemsSource.indexOf('const DayTaskItem'), weekTaskItemsSource.indexOf('// Sortable wrapper for DayTaskItem')),
      '<WeekTaskMoveButton',
    );
    expectPeriodControlOrder(weekTaskItemsSource.slice(weekTaskItemsSource.indexOf('const BucketTaskItem')), '<WeekTaskMoveButton');

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

  it('expands completed tasks for full text and allows title-only editing', () => {
    const completedCard = todayViewSource.slice(todayViewSource.indexOf('const CompletedTaskItem'), todayViewSource.indexOf('const DayOverview'));
    expect(completedCard).toContain("t('Show full completed task text')");
    expect(completedCard).toContain('<textarea');
    expect(completedCard).toContain('onClick={() => setExpanded(true)}');
    expect(completedCard).not.toContain("t('Edit completed task text')");
    expect(completedCard).toContain("onUpdate(task.id, { title: nextTitle })");
    expect(completedCard).not.toContain('completedAt:');
  });
});
