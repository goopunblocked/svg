// Only cache Goop's own frontend. Browser sessions use the existing NoSW loader.
const base = self.registration.scope;
const prefix = 'goop-shell:' + base + ':';
const cacheName = prefix + '8ee8441f8830';
const pages = new Set([
  "",
  "index.html",
  "goop-config.js",
  "manifest.webmanifest",
  "assets/app/defaults.js",
  "assets/app/goop.js",
  "assets/app/matrix-motion.js",
  "assets/app/register-worker.js",
  "assets/css/goop.css",
  "assets/images/favicon.png",
  "assets/images/goop-profile.jpg"
]
  .map(path => new URL(path, base).href));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll([...pages].filter(url => url !== base))));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith(prefix) && name !== cacheName) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || !pages.has(request.url)) return;
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    const key = request.url === base ? new URL('index.html', base).href : request.url;
    try {
      const response = await fetch(request);
      if (response.ok && !response.redirected) await cache.put(key, response.clone()).catch(() => {});
      return response;
    } catch (error) {
      const saved = await cache.match(key);
      if (saved) return saved;
      throw error;
    }
  })());
});
