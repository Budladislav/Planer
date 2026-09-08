import { describe, expect, it } from 'vitest';
import monthViewSource from './components/views/Month.tsx?raw';
import todayViewSource from './components/views/Today.tsx?raw';
import weekTaskItemsSource from './components/week/WeekTaskItems.tsx?raw';

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
});
