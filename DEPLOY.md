# Инструкция по деплою на GitHub Pages

## Что такое GitHub Actions?

GitHub Actions — это автоматизация, которая запускается при каждом push в репозиторий. В нашем случае она:
1. Устанавливает зависимости (`npm ci`)
2. Собирает проект (`npm run build`)
3. Публикует результат на GitHub Pages

## Что уже сделано:

✅ Добавлен `base: '/Planer/'` в `vite.config.ts`  
✅ Создан workflow `.github/workflows/pages.yml` для автоматического деплоя  
✅ Обновлён favicon и title в `index.html`

## Шаги для активации GitHub Pages:

1. **Закоммить и запушить изменения:**
   ```bash
   git add .
   git commit -m "feat: setup GitHub Pages deployment"
   git push
   ```

2. **Включить GitHub Pages в настройках репозитория:**
   - Открой репозиторий на GitHub
   - Перейди в **Settings** → **Pages** (в левом меню)
   - В разделе **Source** выбери: **GitHub Actions**
   - Сохрани (Save)

3. **Проверить деплой:**
   - Перейди во вкладку **Actions** в репозитории
   - Должен запуститься workflow "Deploy to GitHub Pages"
   - Дождись завершения (зелёная галочка)
   - Сайт будет доступен по адресу: `https://<твой-username>.github.io/Planer/`

## Что происходит дальше:

- При каждом push в ветку `main` автоматически запускается сборка и деплой
- Не нужно ничего делать вручную — всё происходит автоматически
- Обычно деплой занимает 1-2 минуты

## Если что-то не работает:

1. Проверь вкладку **Actions** — там будут видны ошибки
2. Убедись, что в Settings → Pages выбран источник **GitHub Actions**
3. Проверь, что workflow файл находится в `.github/workflows/pages.yml`

## Локальная проверка билда:

Перед пушем можешь проверить, что билд работает локально:
```bash
npm run build
npm run preview
```

Открой `http://localhost:4173/Planer/` чтобы увидеть результат.


