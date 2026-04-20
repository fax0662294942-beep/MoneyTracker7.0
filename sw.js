const CACHE_NAME = 'moneytracker-v900';

self.addEventListener('install', (event) => {
  // Attiva subito senza aspettare che le vecchie tab vengano chiuse
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = event.request.url;
  const isHTML = event.request.mode === 'navigate' || url.endsWith('.html');
  const isCDN  = url.includes('unpkg.com') || url.includes('jsdelivr') || url.includes('cdnjs') || url.includes('gstatic') || url.includes('firebasejs');

  if (isHTML) {
    // HTML: sempre dal network, fallback cache
    event.respondWith(
      fetch(event.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        return res;
      }).catch(() => caches.match(event.request))
    );
  } else if (isCDN) {
    // Librerie CDN: cache-first (non cambiano)
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return res;
        });
      })
    );
  }
  // Tutto il resto: pass-through senza cache
});
