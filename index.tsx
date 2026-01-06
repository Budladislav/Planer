import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Настройка PWA (manifest и service worker)
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    const isDev = import.meta.env.MODE === 'development';
    const basePath = isDev ? '' : '/Planer';
    
    // Обновляем путь к manifest
    const manifestLink = document.getElementById('manifest-link') as HTMLLinkElement;
    if (manifestLink) {
      manifestLink.href = `${basePath}/manifest.json`;
    }
    
    // Регистрация Service Worker
    if ('serviceWorker' in navigator) {
      const swPath = `${basePath}/sw.js`;
      
      navigator.serviceWorker
        .register(swPath)
        .then((registration) => {
          console.log('[SW] Service Worker registered:', registration.scope);
          
          // Проверка обновлений при загрузке страницы
          registration.update();
          
          // Проверка обновлений каждые 60 секунд
          setInterval(() => {
            registration.update();
          }, 60000);
          
          // Обработка обновления Service Worker
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // Новый Service Worker установлен, перезагружаем страницу
                  console.log('[SW] New service worker installed, reloading...');
                  window.location.reload();
                }
              });
            }
          });
        })
        .catch((error) => {
          console.warn('[SW] Service Worker registration failed:', error);
        });
    }
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);