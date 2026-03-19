"use strict";

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(clients.claim());
});

/* ─── Notifications push (Pomodoro background) ─── */
self.addEventListener("push", (e) => {
  if (!e.data) return;
  const data = e.data.json();
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/src/images/icon-192.png",
      badge: "/src/images/icon-192.png",
      tag: data.tag || "upte",
      vibrate: [200, 100, 200],
      data: { url: data.url || "/" },
    }),
  );
});

/* ─── Clic sur notification ─── */
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        const upte = list.find((c) => c.url.includes(self.location.origin));
        if (upte) return upte.focus();
        return clients.openWindow(e.notification.data?.url || "/");
      }),
  );
});

/* ─── Message depuis le client (Pomodoro terminé, onglet fermé) ─── */
self.addEventListener("message", (e) => {
  if (e.data?.type !== "POMO_DONE") return;
  const { mode, next } = e.data;
  const isWork = mode === "work";
  self.registration.showNotification(
    isWork ? "Session Pomodoro terminée ✓" : "Pause terminée",
    {
      body: isWork
        ? `25 min complètes. Place à la ${next}.`
        : `Retour au travail. Reste concentré.`,
      icon: "/src/images/icon-192.png",
      badge: "/src/images/icon-192.png",
      tag: "pomo-done",
      vibrate: [200, 100, 200],
      data: { url: "/?page=learn" },
    },
  );
});
