// Network-first so updates show immediately; cached copies keep the page
// usable offline. Team logos/flags are cache-first (they rarely change).
const CACHE = 'matchday-v1';
const SHELL = ['./', 'index.html', 'style.css', 'script.js', 'constants.js', 'lib/matchParser.js', 'channel-icons.json', 'national-team-flags.json', 'team-logos.json'];

self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

function networkFirst(request) {
    return fetch(request).then(response => {
        if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(request, copy));
        }
        return response;
    }).catch(() => caches.match(request, { ignoreSearch: true }));
}

function cacheFirst(request) {
    return caches.match(request).then(hit => hit || fetch(request).then(response => {
        if (response.ok || response.type === 'opaque') {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(request, copy));
        }
        return response;
    }));
}

self.addEventListener('fetch', event => {
    const { request } = event;
    if (request.method !== 'GET') {
        return;
    }
    const url = new URL(request.url);
    const isLogo = url.hostname === 'flagcdn.com' || url.hostname.endsWith('thesportsdb.com');
    const isApp = url.origin === self.location.origin || url.hostname === 'raw.githubusercontent.com';

    if (isLogo) {
        event.respondWith(cacheFirst(request));
    } else if (isApp) {
        event.respondWith(networkFirst(request));
    }
});
