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
          
          // Проверка обновлений каждые 60 секунд
          setInterval(() => {
            registration.update();
          }, 60000);
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