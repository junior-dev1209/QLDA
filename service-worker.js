const RELEASE_VERSION = "3.0.75";
const CACHE_NAME = "phuc-thinh-kpi-v366";
const APP_SHELL = [
  "index.html",
  "styles.css",
  "people-data.js",
  "supabase-config.js",
  "script.js",
  "manifest.webmanifest",
  "app-icon-phuc-thinh.png",
].map((asset) => `./${asset}?v=${encodeURIComponent(RELEASE_VERSION)}`);
const APP_SHELL_URLS = new Set(APP_SHELL.map((asset) => new URL(asset, self.registration.scope).href));
const NAVIGATION_FALLBACK = new URL(APP_SHELL[0], self.registration.scope).href;

async function precacheReleaseShell() {
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(APP_SHELL.map(async (asset) => {
    const request = new Request(asset, { cache: "reload" });
    const response = await fetch(request);
    if (!response.ok) throw new Error(`Unable to cache ${asset}: ${response.status}`);
    await cache.put(request, response);
  }));
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheReleaseShell().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.includes("/api/")) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(new Request(event.request, { cache: "no-store" }))
        .catch(() => caches.open(CACHE_NAME).then((cache) => cache.match(NAVIGATION_FALLBACK))),
    );
    return;
  }

  if (APP_SHELL_URLS.has(url.href)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        return cached || fetch(new Request(event.request, { cache: "reload" }));
      }),
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || Response.error())),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
