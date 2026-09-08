import { describe, expect, it } from 'vitest';
import monthViewSource from './components/views/Month.tsx?raw';
import todayViewSource from './components/views/Today.tsx?raw';
import weekTaskItemsSource from './components/week/WeekTaskItems.tsx?raw';
import dayNotesSource from './components/DayNotes.tsx?raw';
import weekNotesSource from './components/WeekNotes.tsx?raw';

describe('Today task card presentation', () => {
  it('does not apply an implicit highlight to the first task', () => {
    expect(todayViewSource).not.toContain('isFirst');
    expect(todayViewSource).not.toContain('border-indigo-300');
  });

  it('keeps one-step grade promotion available on collapsed planning cards', () => {
    expect(todayViewSource).toContain('<RewardGradeIncrementButton taskId={task.id} />');
    expect(monthViewSource).toContain('<RewardGradeIncrementButton taskId={task.id} />');
    expect(weekTaskItemsSource.match(/<RewardGradeIncrementButton taskId=\{task\.id\} \/>/g)).toHaveLength(2);
  });

  it('keeps task actions visible as compact icon buttons while expansion contains the grade selector', () => {
    expect(todayViewSource.match(/<TaskIconButton/g)).toHaveLength(5);
    expect(monthViewSource.match(/<TaskIconButton/g)).toHaveLength(4);
    expect(weekTaskItemsSource.match(/<TaskIconButton/g)).toHaveLength(8);
    expect(weekTaskItemsSource.match(/label=\{t\('Mark as done'\)\}/g)).toHaveLength(2);
    expect(todayViewSource.match(/<RewardGradeSelector taskId=\{task\.id\} compact \/>/g)).toHaveLength(1);
    expect(monthViewSource.match(/<RewardGradeSelector taskId=\{task\.id\} compact \/>/g)).toHaveLength(1);
    expect(weekTaskItemsSource.match(/<RewardGradeSelector taskId=\{task\.id\} compact \/>/g)).toHaveLength(2);
  });

  it('uses a pencil for adding and editing day and week notes', () => {
    const dayMetaBadges = dayNotesSource.slice(0, dayNotesSource.indexOf('interface DayNotesEditorProps'));
    const weekMetaBadges = weekNotesSource.slice(0, weekNotesSource.indexOf('interface WeekNotesEditorProps'));

    expect(dayMetaBadges).toContain('<Pencil');
    expect(dayMetaBadges).not.toContain('<Plus');
    expect(weekMetaBadges).toContain('<Pencil');
    expect(weekMetaBadges).not.toContain('<Plus');
  });
});
