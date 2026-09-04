import { describe, expect, it } from 'vitest';
import { getLocale, hasRussianTranslation, translate } from './i18n';

const localizedSources = import.meta.glob(
  ['./components/**/*.tsx', './features/rewards-lab/ui/**/*.tsx'],
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>;

describe('localization', () => {
  it('translates interface strings and interpolates values', () => {
    expect(translate('ru', 'Today')).toBe('Сегодня');
    expect(translate('ru', '{todo} left • {done} done', { todo: 3, done: 2 })).toBe('Осталось: 3 • Выполнено: 2');
    expect(translate('en', 'Today')).toBe('Today');
  });

  it('uses stable language-specific locales and an English fallback for unknown keys', () => {
    expect(getLocale('ru')).toBe('ru-RU');
    expect(getLocale('en')).toBe('en-US');
    expect(translate('ru', 'User-authored text')).toBe('User-authored text');
  });

  it('has a Russian entry for every literal interface translation key', () => {
    const keys = Object.values(localizedSources).flatMap(source => {
      const matches = source.matchAll(/\bt\(\s*(['"])(.*?)\1/g);
      return Array.from(matches, match => match[2].replaceAll('\\n', '\n'));
    });
    const missing = [...new Set(keys.filter(key => !hasRussianTranslation(key)))].sort();

    expect(missing).toEqual([]);
  });
});
