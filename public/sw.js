// 忍者帳場AI - Service Worker v1
// オフラインキャッシュ・バックグラウンド同期対応

const CACHE_NAME = 'ninja-choba-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700;900&family=JetBrains+Mono:wght@400;500;700&display=swap'
];

// インストール: 静的アセットをキャッシュ
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// アクティベート: 古いキャッシュを削除
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// フェッチ: Cache First（静的）/ Network First（API）
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Anthropic API は必ずネットワーク（オフライン時はエラー表示）
  if (url.hostname === 'api.anthropic.com') {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({
          error: 'オフラインのためAI機能は利用できません。接続後に再試行してください。'
        }), { headers: { 'Content-Type': 'application/json' } })
      )
    );
    return;
  }

  // Google Fonts など外部リソース: Stale While Revalidate
  if (url.hostname.includes('fonts')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        const network = fetch(event.request).then(res => {
          caches.open(CACHE_NAME).then(c => c.put(event.request, res.clone()));
          return res;
        });
        return cached || network;
      })
    );
    return;
  }

  // アプリ本体: Cache First
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        if (res.status === 200) {
          caches.open(CACHE_NAME).then(c => c.put(event.request, res.clone()));
        }
        return res;
      });
    })
  );
});

// バックグラウンド同期（仕訳データのfreee送信待ち）
self.addEventListener('sync', event => {
  if (event.tag === 'sync-journals') {
    event.waitUntil(syncPendingJournals());
  }
});

async function syncPendingJournals() {
  // IndexedDBの未送信仕訳をfreee APIに送信
  // 本番実装ではここにfreee API送信処理を追加
  console.log('[SW] バックグラウンド同期: 仕訳データ同期中...');
}

// プッシュ通知（支払期日・要確認アラート）
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || '忍者帳場AI', {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'ninja-choba',
      data: { url: data.url || '/' },
      actions: [
        { action: 'open', title: '確認する' },
        { action: 'dismiss', title: '後で' }
      ]
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});
