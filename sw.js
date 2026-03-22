/**
 * Frutiger Focus v1.3 - Service Worker
 * 离线缓存与 PWA 支持
 */

const CACHE_NAME = 'frutiger-focus-v1.3';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/db.js',
  './js/timer.js',
  './js/tasks.js',
  './js/stats.js',
  './js/audio.js',
  './js/notifications.js',
  './js/app.js',
  './manifest.json',
  './assets/icons/icon.svg'
];

// 安装：缓存所有静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// 激活：清除旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// 请求拦截：缓存优先策略
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;

        return fetch(event.request).then(response => {
          // 只缓存同源的成功请求
          if (response.status === 200 && response.type === 'basic') {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        });
      })
      .catch(() => {
        // 离线时返回主页
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      })
  );
});