import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import primitivesSource from './components/ui/Primitives.tsx?raw';
import goalsSource from './components/views/Goals.tsx?raw';
import todaySource from './components/views/Today.tsx?raw';
import weekSource from './components/views/Week.tsx?raw';

const stylesSource = readFileSync(new URL('./index.css', import.meta.url), 'utf8');

describe('graded completed task contrast', () => {
  it('uses one shared layered row for completed task surfaces outside TaskCard', () => {
    expect(primitivesSource).toContain("join('graded-task-row', className)");
    expect(todaySource).toContain('<GradedTaskRow key={task.id}');
    expect(weekSource).toContain('<GradedTaskRow key={task.id}');
    expect(stylesSource).toContain('.graded-task-row > :not(.reward-grade-surface)');
    expect(stylesSource).toContain('.reward-grade-surface');
    expect(stylesSource).toContain('@apply z-0');
  });

  it('keeps every completed task title dark instead of muting graded cards', () => {
    expect(todaySource).toContain('text-slate-950 line-through');
    expect(weekSource).toContain('text-slate-950 line-through');
    expect(goalsSource).toContain("task.status === 'done' ? 'text-slate-950 line-through'");
    expect(goalsSource).not.toContain("task.status === 'done' ? 'text-slate-500 line-through'");
  });
});
