import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import changelogMarkdown from './CHANGELOG.md?raw';
import englishChangelogMarkdown from './CHANGELOG.en.md?raw';
import packageJson from './package.json';
import { parseReleaseHistory } from './release-history';

describe('release metadata', () => {
  it('keeps the app, changelog, and offline cache versions aligned', () => {
    const currentRelease = parseReleaseHistory(changelogMarkdown)[0];
    const currentEnglishRelease = parseReleaseHistory(englishChangelogMarkdown)[0];
    const serviceWorker = readFileSync(new URL('./public/sw.js', import.meta.url), 'utf8');

    expect(currentRelease?.version).toBe(packageJson.version);
    expect(currentEnglishRelease?.version).toBe(packageJson.version);
    expect(serviceWorker).toContain(`monofocus-static-v${packageJson.version}`);
  });

  it('publishes the Takt identity while preserving legacy data namespaces', () => {
    const manifest = JSON.parse(readFileSync(new URL('./public/manifest.json', import.meta.url), 'utf8')) as {
      name: string;
      short_name: string;
    };
    const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
    const store = readFileSync(new URL('./store.tsx', import.meta.url), 'utf8');
    const serviceWorker = readFileSync(new URL('./public/sw.js', import.meta.url), 'utf8');

    expect(packageJson.name).toBe('takt');
    expect(manifest).toMatchObject({ name: 'Takt Planner', short_name: 'Takt' });
    expect(html).toContain('<title>Takt Planner</title>');
    expect(store).toContain("localStorage.getItem('monofocus_v1')");
    expect(store).toContain("localStorage.setItem('monofocus_v1'");
    expect(serviceWorker).toContain("const STATIC_CACHE_PREFIX = 'monofocus-static-v'");
  });

  it.each(['favicon.svg', 'icon-192.svg', 'icon-512.svg'])('%s keeps four ascending grade steps', asset => {
    const svg = readFileSync(new URL(`./public/${asset}`, import.meta.url), 'utf8');
    const stepMatches = [...svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)" rx="([\d.]+)" fill="(#[A-F\d]+)"\/>/g)];
    const steps = stepMatches.map(([, x, y, width, height, radius, color]) => ({
      x: Number(x),
      y: Number(y),
      width: Number(width),
      height: Number(height),
      radius: Number(radius),
      color,
    }));

    expect(steps.map(step => step.color)).toEqual(['#2FB47C', '#3B82F6', '#E09A17', '#E4515E']);
    expect(steps.map(step => step.x)).toEqual([...steps.map(step => step.x)].sort((a, b) => a - b));
    expect(steps.map(step => step.y)).toEqual([...steps.map(step => step.y)].sort((a, b) => b - a));
    expect(new Set(steps.map(step => step.width)).size).toBe(1);
    expect(new Set(steps.map(step => step.height)).size).toBe(1);
    expect(steps.every(step => step.radius === step.height / 2)).toBe(true);
  });
});
