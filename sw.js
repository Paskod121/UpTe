"use strict";

const CACHE = "upte-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.svg",
  "/src/css/main.css",
  "/src/css/variables.css",
  "/src/css/layout.css",
  "/src/css/components.css",
  "/src/css/utilities.css",
  "/src/css/learning.css",
  "/src/js/main.js",
  "/src/js/app.js",
  "/src/js/ui.js",
  "/src/js/learn.js",
  "/src/js/notes.js",
  "/src/js/combo.js",
  "/src/js/storage.js",
  "/src/js/utils.js",
  "/src/js/validator.js",
  "/src/js/constants.js",
  "/src/images/icon-192.png",
  "/src/images/icon-512.png",
];

// Install — met tout en cache
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

// Activate — supprime les anciens caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      ),
  );
  e.waitUntil(clients.claim());
});

// Fetch — Cache First pour les assets, Network First pour le reste
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;

  const url = new URL(e.request.url);

  // Ignore les requêtes externes (fonts, lottie, cdnjs...)
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request)
        .then((response) => {
          if (!response || response.status !== 200) return response;
          const clone = response.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
          return response;
        })
        .catch(() => {
          // Fallback — renvoie index.html pour la navigation
          if (e.request.destination === "document") {
            return caches.match("/index.html");
          }
        });
    }),
  );
});

// Notifications push
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

// Clic notification
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

// Message Pomodoro
self.addEventListener("message", (e) => {
  if (e.data?.type !== "POMO_DONE") return;
  const { mode, next } = e.data;
  const isWork = mode === "work";
  self.registration.showNotification(
    isWork ? "Session Pomodoro terminée ✓" : "Pause terminée",
    {
      body: isWork
        ? `25 min complètes. Place à la ${next}.`
        : "Retour au travail.",
      icon: "/src/images/icon-192.png",
      badge: "/src/images/icon-192.png",
      tag: "pomo-done",
      vibrate: [200, 100, 200],
      data: { url: "/?page=learn" },
    },
  );
});
