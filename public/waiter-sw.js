self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = payload.title || "Texas Resto Bar · Llamado de mesa";
  const options = {
    body: payload.body || "Una mesa solicita atención",
    icon: "/waiter/texasrestobar/icon.png",
    badge: "/waiter/texasrestobar/icon.png",
    tag: payload.requestId ? `texas-waiter-${payload.requestId}` : "texas-waiter",
    data: { url: payload.url || "/waiter" },
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || "/waiter"));
});
