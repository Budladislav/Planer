// Service Worker для Takt Planner
// Версия кэша - обновлять при изменении статики
const STATIC_CACHE = 'monofocus-static-v5.5.0';
// Стабильное legacy-пространство кэшей сохраняется для бесшовного обновления установленной PWA.
const STATIC_CACHE_PREFIX = 'monofocus-static-v';
const RETAINED_VERSION_CACHES = 3;

// Файлы для кэширования (статичные ресурсы)
// Пути должны соответствовать base path из vite.config.ts
const BASE_PATH = '/Planer/';
const BUILD_ASSETS = [
  // __MONOFOCUS_BUILD_ASSETS__
];
const STATIC_ASSETS = [
  BASE_PATH,
  BASE_PATH + 'index.html',
  BASE_PATH + 'manifest.json',
  BASE_PATH + 'favicon.svg',
  BASE_PATH + 'takt-icon-192-r2.png',
  BASE_PATH + 'takt-icon-512-r2.png',
  BASE_PATH + 'takt-icon-maskable-r2.png',
  ...BUILD_ASSETS.map((asset) => BASE_PATH + asset),
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Активируем новый SW сразу, не дожидаясь закрытия всех вкладок
  self.skipWaiting();
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        // Несколько предыдущих версий сохраняются намеренно: открытая вкладка
        // может ещё запрашивать чанки из своего HTML во время обновления PWA.
        const versionCaches = cacheNames
          .filter(cacheName => cacheName.startsWith(STATIC_CACHE_PREFIX))
          .sort((left, right) => right.localeCompare(left, undefined, { numeric: true }));
        const cachesToKeep = new Set([
          STATIC_CACHE,
          ...versionCaches.filter(cacheName => cacheName !== STATIC_CACHE).slice(0, RETAINED_VERSION_CACHES - 1),
        ]);

        return Promise.all(cacheNames.map((cacheName) => {
          if (cacheName.startsWith(STATIC_CACHE_PREFIX) && !cachesToKeep.has(cacheName)) {
            console.log('[SW] Deleting stale cache:', cacheName);
            return caches.delete(cacheName);
          }
          return Promise.resolve(false);
        }));
      })
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => Promise.all(clients.map((client) => {
        // Оживляет вкладку, которая успела получить старый HTML со ссылкой на
        // уже удалённый сервером хешированный JS-файл.
        return 'navigate' in client
          ? client.navigate(client.url).catch(() => null)
          : Promise.resolve(null);
      })))
  );
});

// Перехват запросов
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Игнорируем запросы не к нашему домену
  if (url.origin !== location.origin) {
    return;
  }

  if (request.method === 'GET') {
    const isJS = request.url.includes('.js') || request.destination === 'script';
    const isCSS = request.url.includes('.css') || request.destination === 'style';
    const isNavigation = request.mode === 'navigate' || request.destination === 'document';
    const isAppMetadata = url.pathname.endsWith('/manifest.json')
      || url.pathname.includes('/takt-icon-')
      || url.pathname.endsWith('/favicon.svg');

    if (isNavigation) {
      // HTML всегда запрашиваем заново, иначе старый документ может ссылаться
      // на хешированные assets, которых уже нет после нового Pages-деплоя.
      event.respondWith(
        fetch(request, { cache: 'no-cache' })
          .then((response) => {
            if (!response.ok) throw new Error(`Navigation failed with ${response.status}`);
            const responseToCache = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(BASE_PATH + 'index.html', responseToCache));
            return response;
          })
          .catch(() => caches.match(BASE_PATH + 'index.html'))
      );
      return;
    }
    
    if (isAppMetadata) {
      // Иконки и manifest должны обновляться из текущего релиза, а не
      // возвращаться из одного из сохранённых legacy-кэшей Android PWA.
      event.respondWith(
        fetch(request, { cache: 'no-cache' })
          .then((response) => {
            if (!response.ok) throw new Error(`App metadata failed with ${response.status}`);
            const responseToCache = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, responseToCache));
            return response;
          })
          .catch(() => caches.open(STATIC_CACHE).then((cache) => cache.match(request)))
      );
    } else if (isJS || isCSS) {
      // Network First для JS/CSS - всегда проверяем сеть сначала
      event.respondWith(
        fetch(request)
          .then(async (response) => {
            if (!response.ok) {
              // 404 после нового деплоя тоже должен считаться сетевым сбоем:
              // предыдущий хешированный чанк всё ещё лежит в старом кэше.
              return (await caches.match(request)) ?? response;
            }
            const responseToCache = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, responseToCache));
            return response;
          })
          .catch(() => caches.match(request))
      );
    } else {
      // Cache First для остальной статики (HTML, изображения и т.д.)
      event.respondWith(
        caches.match(request).then((cachedResponse) => {
          // Если есть в кэше - возвращаем из кэша
          if (cachedResponse) {
            return cachedResponse;
          }

          // Иначе запрашиваем из сети
          return fetch(request)
            .then((response) => {
              // Кэшируем только успешные ответы
              if (response.status === 200) {
                const responseToCache = response.clone();
                caches.open(STATIC_CACHE).then((cache) => {
                  cache.put(request, responseToCache);
                });
              }
              return response;
            })
            .catch(() => {
              // Если сеть недоступна и нет в кэше - возвращаем базовую страницу
              if (request.destination === 'document') {
                return caches.match(BASE_PATH + 'index.html');
              }
            });
        })
      );
    }
  }
});
