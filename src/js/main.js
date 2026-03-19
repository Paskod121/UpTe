"use strict";

import { App } from "./app.js";
import { UI } from "./ui.js";
import { Learn } from "./learn.js";
import { Notes } from "./notes.js";
import { Combo } from "./combo.js";
import { Storage } from "./storage.js";

window.App = App;
window.UI = UI;
window.Learn = Learn;
window.Notes = Notes;
window.Combo = Combo;

/* 
   NOTIFICATION POMODORO — exposée globalement
   Appelée par learn.js via window._notifyPomoDone
 */
window._notifyPomoDone = function (mode, nextLabel) {
  if (document.visibilityState === "visible") return;

  if (Notification.permission === "granted") {
    const isWork = mode === "work";
    const n = new Notification(
      isWork ? "Session Pomodoro terminée ✓" : "Pause terminée",
      {
        body: isWork
          ? `25 min complètes. Place à la ${nextLabel}.`
          : "Retour au travail. Reste concentré.",
        icon: "/src/images/icon-192.png",
        badge: "/src/images/icon-192.png",
        tag: "pomo-done",
      },
    );
    n.onclick = () => {
      window.focus();
      n.close();
    };
  }

  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: "POMO_DONE",
      mode,
      next: nextLabel,
    });
  }
};

/* 
   SERVICE WORKER
 */
async function registerSW() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {}
}

/* 
   NOTIFICATIONS — permission + scheduling
 */
async function requestNotifPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

function showNotif(title, body, tag = "upte") {
  if (Notification.permission !== "granted") return;
  const n = new Notification(`Up●Te — ${title}`, {
    body,
    icon: "/src/images/icon-192.png",
    badge: "/src/images/icon-192.png",
    image: "/src/images/og-cover.png",
    tag,
    silent: false,
  });
  n.onclick = () => {
    window.focus();
    n.close();
  };
}

/* ─── Rappel 15 min avant chaque session planifiée du jour ─── */
function scheduleSessionReminders() {
  if (Notification.permission !== "granted") return;

  const sessions = Storage.getSessions();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const nowMs = Date.now();

  sessions
    .filter((s) => s.date === todayStr && s.startTime)
    .forEach((s) => {
      const [h, m] = s.startTime.split(":").map(Number);
      const sessionMs = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        h,
        m,
      ).getTime();
      const reminderMs = sessionMs - 15 * 60 * 1000;
      const delay = reminderMs - nowMs;
      if (delay < 0) return;

      setTimeout(() => {
        showNotif(
          "Session dans 15 minutes",
          `${s.duration}h de révision à ${s.startTime}. Prépare ton espace, coupe les distractions.`,
          `session-${s.id}`,
        );
      }, delay);
    });
}

/* ─── Rappel fin de journée à 21h00 si aucune session faite ─── */
function scheduleDailyReminder() {
  if (Notification.permission !== "granted") return;

  const now = new Date();
  const target = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    21,
    0,
    0,
  );
  const delay = target.getTime() - Date.now();
  if (delay < 0) return;

  setTimeout(() => {
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const hasDone = Storage.getSessions().some((s) => s.date === todayStr);
    if (hasDone) return;

    showNotif(
      "Tu n'as pas encore révisé aujourd'hui",
      "Il est 21h — 25 minutes suffisent pour avancer. Lance un Pomodoro.",
    );
  }, delay);
}

/* 
   INIT
 */
document.addEventListener("DOMContentLoaded", async () => {
  UI.applyTheme(UI.getStoredTheme());
  App.init();
  Learn.init();
  Notes.init();
  Combo.init();

  await registerSW();
  const granted = await requestNotifPermission();
  if (granted) {
    scheduleSessionReminders();
    scheduleDailyReminder();
  }
});
