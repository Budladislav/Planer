// Скрипт для исправления путей в manifest.json для production
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const manifestPath = join(process.cwd(), 'dist', 'manifest.json');

try {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  
  // Заменяем пути на production пути с /Planer/
  manifest.start_url = '/Planer/';
  manifest.scope = '/Planer/';
  
  // Исправляем пути к иконкам
  manifest.icons = manifest.icons.map(icon => ({
    ...icon,
    src: icon.src.startsWith('/') ? `/Planer${icon.src}` : `/Planer/${icon.src}`
  }));
  
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('✅ Manifest paths fixed for production');
} catch (error) {
  console.warn('⚠️ Could not fix manifest paths:', error.message);
  // Не критично, если файл не найден
}


