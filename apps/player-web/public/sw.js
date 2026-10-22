const CACHE_NAME = "offline-music-shell-v27"; // refresh the shared PWA and Android UI

const APP_SHELL = [
  "./",
  "./figma/playlist-night-drive.svg",
  "./figma/playlist-blue-hour.svg",
  "./figma/playlist-focus-flow.svg",
  "./figma/featured-glow.svg",
  "./figma/search-category-glow.svg",
  "./figma/playlist-cover.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith("offline-music-shell-") && key !== CACHE_NAME)
        .map((key) => caches.delete(key)),
    )),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || request.destination === "audio") return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    if (request.mode === "navigate") {
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      } catch (error) {
        const shell = await cache.match(request) ?? await cache.match("./");
        if (shell) return shell;
        throw error;
      }
    }

    const cached = await cache.match(request);
    if (cached) return cached;

    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  })());
});
