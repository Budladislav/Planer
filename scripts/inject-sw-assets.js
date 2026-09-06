import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const MARKER = '  // __MONOFOCUS_BUILD_ASSETS__';
const distPath = join(process.cwd(), 'dist');
const assetsPath = join(distPath, 'assets');
const serviceWorkerPath = join(distPath, 'sw.js');

const collectFiles = (directory) => readdirSync(directory).flatMap((name) => {
  const path = join(directory, name);
  return statSync(path).isDirectory() ? collectFiles(path) : [path];
});

try {
  const assets = collectFiles(assetsPath)
    .map((path) => relative(distPath, path).split(sep).join('/'))
    .sort();
  const serviceWorker = readFileSync(serviceWorkerPath, 'utf8');
  if (!serviceWorker.includes(MARKER)) {
    throw new Error('Service worker asset marker is missing.');
  }

  const generatedEntries = assets.map((asset) => `  ${JSON.stringify(asset)},`).join('\n');
  writeFileSync(serviceWorkerPath, serviceWorker.replace(MARKER, generatedEntries));
  console.log(`✅ ${assets.length} build assets added to the offline cache`);
} catch (error) {
  console.error('❌ Could not add build assets to the offline cache:', error.message);
  process.exitCode = 1;
}
