// Service Worker для MonoFocus Planner
// Версия кэша - обновлять при изменении статики
const CACHE_NAME = 'monofocus-v2.2';
const STATIC_CACHE = 'monofocus-static-v2.2';

// Файлы для кэширования (статичные ресурсы)
// Пути должны соответствовать base path из vite.config.ts
const BASE_PATH = '/Planer/';
const STATIC_ASSETS = [
  BASE_PATH,
  BASE_PATH + 'index.html',
  BASE_PATH + 'manifest.json',
  BASE_PATH + 'favicon.svg',
  BASE_PATH + 'icon-192.svg',
  BASE_PATH + 'icon-512.svg',
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Failed to cache some assets:', err);
      });
    })
  );
  // Активируем новый SW сразу, не дожидаясь закрытия всех вкладок
  self.skipWaiting();
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Удаляем старые кэши
          if (cacheName !== STATIC_CACHE && cacheName.startsWith('monofocus-')) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Берем контроль над всеми страницами сразу
  return self.clients.claim();
});

// Перехват запросов
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Игнорируем запросы не к нашему домену
  if (url.origin !== location.origin) {
    return;
  }

  // Стратегия: Network First для JS/CSS (чтобы всегда получать свежие версии), Cache First для остальной статики
  if (request.method === 'GET') {
    const isJS = request.url.includes('.js') || request.destination === 'script';
    const isCSS = request.url.includes('.css') || request.destination === 'style';
    
    if (isJS || isCSS) {
      // Network First для JS/CSS - всегда проверяем сеть сначала
      event.respondWith(
        fetch(request)
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
            // Если сеть недоступна - используем кэш
            return caches.match(request);
          })
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

