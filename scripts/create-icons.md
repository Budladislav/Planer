# Инструкция по созданию PNG иконок

## Вариант 1: Онлайн-конвертер (быстро)

1. Откройте https://cloudconvert.com/svg-to-png
2. Загрузите `public/icon-192.svg`
3. Установите размер: 192x192
4. Конвертируйте и скачайте как `icon-192.png`
5. Повторите для `icon-512.svg` → `icon-512.png` (размер 512x512)
6. Сохраните файлы в папку `public/`

## Вариант 2: Использовать существующие SVG

SVG иконки уже созданы в `public/`. Для лучшей совместимости рекомендуется конвертировать их в PNG.

## Вариант 3: ImageMagick (если установлен)

```bash
magick public/icon-192.svg -resize 192x192 public/icon-192.png
magick public/icon-512.svg -resize 512x512 public/icon-512.png
```

## Вариант 4: Inkscape (если установлен)

```bash
inkscape public/icon-192.svg --export-filename=public/icon-192.png --export-width=192 --export-height=192
inkscape public/icon-512.svg --export-filename=public/icon-512.png --export-width=512 --export-height=512
```

После создания PNG файлов, они автоматически будут использоваться в manifest.json.



