import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import changelogMarkdown from './CHANGELOG.md?raw';
import packageJson from './package.json';
import { parseReleaseHistory } from './release-history';

describe('release metadata', () => {
  it('keeps the app, changelog, and offline cache versions aligned', () => {
    const currentRelease = parseReleaseHistory(changelogMarkdown)[0];
    const serviceWorker = readFileSync(new URL('./public/sw.js', import.meta.url), 'utf8');

    expect(currentRelease?.version).toBe(packageJson.version);
    expect(serviceWorker).toContain(`monofocus-static-v${packageJson.version}`);
  });
});
