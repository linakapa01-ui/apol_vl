const IMAGE_CACHE = "nv-images-1";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || !url.pathname.includes("/assets/")) return;
  event.respondWith(
    caches.open(IMAGE_CACHE).then((cache) => cache.match(event.request).then((hit) => hit || fetch(event.request).then((res) => {
      if (res.ok) cache.put(event.request, res.clone());
      return res;
    })))
  );
});
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) return client.focus();
      }
      return self.clients.openWindow("./index.html");
    })
  );
});
