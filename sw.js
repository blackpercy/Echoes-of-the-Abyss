// Service worker: caches the game so it can be installed and played offline.
// Bump CACHE whenever files change so players get the new version.
const CACHE = 'holdout-v9';
const FILES = ['./', './index.html', './css/style.css', './icon.svg', './manifest.webmanifest', './js/data.js', './js/skills.js', './js/game.js', './js/tactics.js', './js/ui.js', './js/main.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Network first, so updates arrive at once when online; the cache when offline.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then(res => {
        if (res.ok && new URL(e.request.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request)),
  );
});
