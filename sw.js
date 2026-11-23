// Offline cache: after the first visit the game loads even without network (festival wifi).
// Network first, so a new version shows up at once; if the network fails or takes more than
// 2.5 s, the cached copy is served.
const CACHE = 'nova-v2';
const TIMEOUT_MS = 2500;
const SHELL = [
  './', './index.html', './mocks.html', './css/style.css', './fonts/fonts.css',
  './js/app.js', './js/ui.js', './js/generator.js', './js/texts.js', './js/portraits.js',
  './js/fonts.js', './js/stars.js', './js/typing.js', './js/mocks.js',
  './fonts/IBMPlexMono-400.woff2', './fonts/IBMPlexMono-500.woff2', './fonts/IBMPlexMono-600.woff2',
  './fonts/IBMPlexSans-400.woff2', './fonts/IBMPlexSans-400i.woff2', './fonts/IBMPlexSans-500.woff2', './fonts/IBMPlexSans-600.woff2',
  './fonts/Jersey10-400.woff2', './fonts/PixelifySans-400.woff2', './fonts/PixelifySans-700.woff2',
  './fonts/PressStart2P-400.woff2', './fonts/Silkscreen-400.woff2', './fonts/Silkscreen-700.woff2',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // no-cache: always revalidate with the server, so a new release never mixes with old files
    // (a navigation request can't be copied with options, so it is rebuilt from its URL)
    const fresh = req.mode === 'navigate' ? new Request(req.url, { cache: 'no-cache' }) : new Request(req, { cache: 'no-cache' });
    const network = fetch(fresh).then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    });
    network.catch(() => {}); // handled below
    const timeout = new Promise((resolve) => setTimeout(resolve, TIMEOUT_MS, null));
    try {
      const res = await Promise.race([network, timeout]);
      if (res) return res;
    } catch { /* offline: fall through to the cache */ }
    const cached = await cache.match(req, { ignoreSearch: true });
    return cached || network;
  })());
});
