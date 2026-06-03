const CACHE_VERSION = "v__BUILD_TIME__";
const CACHE_NAME = `ovelin-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.svg",
];

// Install: cache أساسيات التطبيق
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
});

// Activate: احذف الكاش القديم فوراً
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first لـ HTML و API، cache-first للملفات الثابتة
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // لا تتدخل في طلبات API أو chrome-extension أو غير http
  if (!url.protocol.startsWith("http") || url.pathname.startsWith("/api/")) return;

  // HTML دائماً من الشبكة (عشان التحديثات تظهر فوراً)
  if (request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request).catch(() => caches.match("/index.html"))
    );
    return;
  }

  // ملفات assets (هاشد) — cache first
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        });
      })
    );
    return;
  }

  // الباقي: network first
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// رسالة من التطبيق: أعد التحميل لتطبيق التحديث
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
