const CACHE_NAME = 'moneytracker-v1006';
const LOCAL_ASSETS = ['./index.html', './manifest.json'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(LOCAL_ASSETS))
            .catch(() => {})
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = event.request.url;
    const isNavigate = event.request.mode === 'navigate';
    const isLocal = url.includes(self.location.origin);
    const isCDN = url.includes('unpkg.com') || url.includes('jsdelivr') ||
                  url.includes('cdnjs') || url.includes('gstatic') ||
                  url.includes('firebasejs') || url.includes('googleapis.com') ||
                  url.includes('generativelanguage');

    if (isNavigate || (isLocal && !isCDN)) {
        // Asset locali: network-first, fallback cache, fallback offline page
        event.respondWith(
            fetch(event.request)
                .then(res => {
                    if (res && res.status === 200) {
                        const clone = res.clone();
                        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
                    }
                    return res;
                })
                .catch(() =>
                    caches.match(event.request).then(cached =>
                        cached || caches.match('./index.html').then(fallback =>
                            fallback || new Response('App offline — riapri quando sei connesso', {
                                status: 503,
                                headers: { 'Content-Type': 'text/plain; charset=utf-8' }
                            })
                        )
                    )
                )
        );
    } else if (isCDN) {
        // CDN: cache-first
        event.respondWith(
            caches.match(event.request).then(cached => {
                if (cached) return cached;
                return fetch(event.request).then(res => {
                    if (res && res.ok) {
                        const clone = res.clone();
                        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
                    }
                    return res;
                }).catch(() =>
                    new Response('', { status: 503 })
                );
            })
        );
    }
    // Firebase Auth/Firestore API: nessun intercept, passa direttamente
});
