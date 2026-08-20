/* Service worker de soyreinaldo.com — solo avisos de gol.
 *
 * A propósito NO cachea nada ni intercepta peticiones: la web ya va rápida y
 * un service worker que sirve páginas viejas causa más problemas de los que
 * resuelve (marcadores congelados, sobre todo). Solo escucha notificaciones.
 */

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }

  const { title, body, url, tag } = payload;
  event.waitUntil(
    self.registration.showNotification(title || "⚽ Gol", {
      body: body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      // Mismo tag = las actualizaciones del mismo partido se sustituyen entre
      // sí en vez de apilarse cinco avisos de un 3-2.
      tag: tag || "gol",
      renotify: true,
      data: { url: url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((lista) => {
      // Si la web ya está abierta, se reutiliza esa pestaña.
      for (const c of lista) {
        if ("focus" in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
