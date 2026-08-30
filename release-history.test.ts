import { describe, expect, it } from 'vitest';
import { parseReleaseHistory } from './release-history';

describe('parseReleaseHistory', () => {
  it('extracts canonical release titles and categorized changes', () => {
    const releases = parseReleaseHistory(`# Changelog\n\n## [3.3.0] — 30.08.2026 — Inbox и календарь\n\n### Добавлено\n\n- First\n- Second\n\n### Исправлено\n\n- Fixed`);

    expect(releases).toEqual([
      {
        version: '3.3.0',
        date: '30.08.2026',
        title: 'Inbox и календарь',
        sections: [
          { title: 'Добавлено', changes: ['First', 'Second'] },
          { title: 'Исправлено', changes: ['Fixed'] },
        ],
      },
    ]);
  });

  it('keeps legacy entries readable while the changelog is being migrated', () => {
    const releases = parseReleaseHistory('## 2.7.0 — 16.08.2026\n\n- Older');

    expect(releases).toEqual([{
      version: '2.7.0',
      date: '16.08.2026',
      title: '',
      sections: [{ title: 'Изменения', changes: ['Older'] }],
    }]);
  });

  it('ignores unrelated markdown', () => {
    expect(parseReleaseHistory('# No releases\n- note')).toEqual([]);
  });
});
