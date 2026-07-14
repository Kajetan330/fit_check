const CACHE_NAME = "bytaste-shell-v1-20260714";
const APP_SHELL = ["/manifest.webmanifest", "/icon.svg"];

function shouldNetworkFirst(requestUrl, request) {
  return (
    request.mode === "navigate" ||
    request.destination === "script" ||
    request.destination === "style" ||
    requestUrl.pathname === "/" ||
    requestUrl.pathname === "/index.html"
  );
}

function shouldSkipCache(requestUrl) {
  return requestUrl.pathname.startsWith("/api/") || requestUrl.hostname.endsWith(".supabase.co");
}

async function fetchAndUpdateCache(request) {
  const response = await fetch(request);
  if (response.ok) {
    const copy = response.clone();
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, copy);
  }
  return response;
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const requestUrl = new URL(request.url);

  if (request.method !== "GET") return;
  if (shouldSkipCache(requestUrl)) return;

  if (shouldNetworkFirst(requestUrl, request)) {
    event.respondWith(fetchAndUpdateCache(request).catch(() => caches.match(request).then((cached) => cached || caches.match("/"))));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => cached);
    }),
  );
});
