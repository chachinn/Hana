/* =====================================================
   HANA 🌸 Service Worker v43
   ===================================================== */

const CACHE_NAME = "hana-shell-v43";
const CORE_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js?v=2.0.10",
  "./firebase-bridge.js?v=2.0.10"
];
const OPTIONAL_SHELL = [
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/hana-peony.png"
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Core files are required. Optional branding assets should never prevent a
    // new Hana build from installing if one icon is temporarily unavailable.
    await cache.addAll(CORE_SHELL);
    await Promise.allSettled(OPTIONAL_SHELL.map(asset => cache.add(asset)));
  })());
});

self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {});
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === "navigate") return (await caches.match("./index.html")) || (await caches.match("./"));
        return Response.error();
      })
  );
});
