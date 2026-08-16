import { describe, expect, it } from 'vitest';
import { parseReleaseHistory } from './release-history';

describe('parseReleaseHistory', () => {
  it('extracts dated releases and their top-level changes', () => {
    const releases = parseReleaseHistory(`# Changelog\n\n## 2.7.0 — 16.08.2026\n\n- First\n- Second\n\n## 2.6.0 — 06.01.2026\n\n- Older`);

    expect(releases).toEqual([
      { version: '2.7.0', date: '16.08.2026', changes: ['First', 'Second'] },
      { version: '2.6.0', date: '06.01.2026', changes: ['Older'] },
    ]);
  });

  it('ignores unrelated markdown', () => {
    expect(parseReleaseHistory('# No releases\n- note')).toEqual([]);
  });
});
