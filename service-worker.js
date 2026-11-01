const RELEASE_VERSION = "3.4.115";
const CACHE_NAME = `phuc-thinh-kpi-v${RELEASE_VERSION.replace(/\D/g, "")}`;
const APP_SHELL = [
  "index.html",
  "styles.css",
  "work-calendar.css",
  "work-calendar.js",
  "virtual-assistant.css",
  "virtual-assistant.js",
  "document-templates.css",
  "document-templates.js",
  "auth-bootstrap.js",
  "people-data.js",
  "gpmb-workflow-data.js",
  "supabase-config.js",
  "script.js",
  "manifest.webmanifest",
  "app-icon-phuc-thinh.png",
  "assets/topbar-wide-infrastructure-scene.jpg",
  "assets/topbar-wide-scene-tet.jpg",
  "assets/topbar-wide-scene-national-day.jpg",
  "assets/topbar-wide-scene-anniversary.jpg",
  "assets/topbar-wide-scene-women-day.jpg",
  "assets/topbar-wide-scene-new-year.jpg",
  "assets/topbar-wide-scene-hung-kings.jpg",
  "assets/topbar-wide-scene-reunification-day.jpg",
  "assets/topbar-wide-scene-children-day.jpg",
  "assets/topbar-wide-scene-martyrs-day.jpg",
  "assets/topbar-wide-scene-august-revolution.jpg",
  "assets/topbar-wide-scene-vietnamese-women-day.jpg",
  "assets/topbar-wide-scene-vietnamese-culture-day.jpg",
  "assets/topbar-wide-scene-christmas.jpg",
  "assets/topbar-festive-left.png",
  "assets/topbar-festive-right.png",
  "assets/notification-bell-glass.png",
  "assets/virtual-assistant.png",
  "assets/luna-outfit-field.png",
  "assets/luna-outfit-aodai-red.png",
  "assets/luna-outfit-aodai-heritage.png",
  "assets/luna-flower.webp",
  "assets/luna-cake.webp",
  "assets/luna-notes.webp",
  "assets/luna-research.webp",
  "assets/luna-happy.webp",
  "assets/luna-outfit-festival.webp",
  "assets/luna-outfit-rose.webp",
  "assets/luna-outfit-heritage.webp",
  "assets/luna-outfit-anniversary.webp",
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
