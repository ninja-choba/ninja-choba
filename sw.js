// 忍者帳場 Service Worker
const CACHE_NAME = 'ninja-choba-v202607232158';
const STATIC_ASSETS = ['/'];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // ここでは skipWaiting しない。
  // 使用中のユーザーを勝手にリロードさせず、更新バーの「更新」ボタンが
  // 押されて SKIP_WAITING メッセージを受け取ってから切り替える。
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(name) {
          return name !== CACHE_NAME;
        }).map(function(name) {
          return caches.delete(name);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// 更新バーの「更新」ボタンから postMessage で呼ばれる。
// 待機中の新しい Service Worker を有効化する。
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', function(event) {
  // ネットワーク優先、失敗時はキャッシュ
  event.respondWith(
    fetch(event.request).catch(function() {
      return caches.match(event.request);
    })
  );
});
