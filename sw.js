// Service worker: caches the game so it can be installed and played offline.
// Bump CACHE whenever files change so players get the new version.
const CACHE = 'echoes-of-the-abyss-v46';
const FILES = [
  './', './index.html', './css/style.css', './icon.svg', './manifest.webmanifest',
  './js/data.js', './js/story.js', './js/content.js', './js/expansion.js', './js/expansion2.js', './js/expansion3.js', './js/expansion4.js', './js/game.js', './js/mind.js',
  './js/systems.js', './js/perks.js', './js/systems2.js', './js/systems3.js', './js/audio.js', './js/ui.js', './js/main.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// Network first, so updates arrive when online; fall back to the cache when offline.
// "no-cache" makes the browser check with the server instead of reusing its own HTTP cache,
// so a new version shows up straight away rather than after GitHub Pages' ten-minute cache expires.
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
