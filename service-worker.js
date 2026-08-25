const CACHE_NAME = "phuc-thinh-kpi-v348";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./people-data.js",
  "./supabase-config.js",
  "./script.js",
  "./manifest.webmanifest",
  "./app-icon-phuc-thinh.png",
  "./assets/birthday-cake.png",
  "./assets/birthday-bouquet.png",
  "./assets/topbar-infrastructure-scene.png",
  "./assets/topbar-scene-tet.png",
  "./assets/topbar-scene-national-day.png",
  "./assets/topbar-scene-anniversary.png",
  "./assets/topbar-scene-women-day.png",
  "./assets/topbar-scene-new-year.png",
  "./assets/topbar-scene-hung-kings.png",
  "./assets/topbar-scene-reunification-day.png",
  "./assets/topbar-scene-children-day.png",
  "./assets/topbar-scene-martyrs-day.png",
  "./assets/topbar-scene-august-revolution.png",
  "./assets/topbar-scene-vietnamese-women-day.png",
  "./assets/topbar-scene-vietnamese-culture-day.png",
  "./assets/topbar-scene-christmas.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes("/api/")) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => {
          if (cached) return cached;
          return event.request.mode === "navigate" ? caches.match("./index.html") : Response.error();
        }),
      ),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
