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
async function askNotifPermissionPremium() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;

  return new Promise((resolve) => {
    // Modale UpTe premium
    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position:fixed;inset:0;background:#00000080;
      display:flex;align-items:center;justify-content:center;
      z-index:600;padding:20px;backdrop-filter:blur(6px);
      animation:fadeIn .2s ease`;

    overlay.innerHTML = `
      <div style="
        background:var(--surface);border:1px solid var(--border);
        border-radius:var(--radius);padding:32px 28px;
        max-width:380px;width:100%;box-shadow:var(--shadow);
        text-align:center;animation:pageEnter .25s ease">
        <div style="
          width:56px;height:56px;border-radius:16px;
          background:var(--green-dim);border:1px solid var(--green3);
          display:flex;align-items:center;justify-content:center;
          margin:0 auto 20px;color:var(--green)">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </div>
        <div style="
          font-family:'Syne',sans-serif;font-weight:800;
          font-size:18px;color:var(--text);margin-bottom:10px">
          Reste informé
        </div>
        <div style="
          font-size:13px;color:var(--muted);line-height:1.6;margin-bottom:28px">
          UpTe peut t'envoyer des rappels avant tes sessions de révision
          et te notifier quand ton Pomodoro se termine.
        </div>
        <div style="display:flex;flex-direction:column;gap:10px">
          <button id="notifAccept" class="btn btn-primary" style="width:100%;justify-content:center;padding:12px">
            Activer les notifications
          </button>
          <button id="notifLater" class="btn btn-ghost" style="width:100%;justify-content:center">
            Plus tard
          </button>
        </div>
        <div style="margin-top:16px;font-size:11px;color:var(--muted2)">
          Tu pourras modifier ce choix dans les paramètres du navigateur.
        </div>
      </div>`;

    document.body.appendChild(overlay);

    document.getElementById("notifAccept").onclick = async () => {
      overlay.remove();
      const result = await Notification.requestPermission();
      resolve(result === "granted");
    };

    document.getElementById("notifLater").onclick = () => {
      overlay.remove();
      resolve(false);
    };

    overlay.onclick = (e) => {
      if (e.target === overlay) {
        overlay.remove();
        resolve(false);
      }
    };
  });
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
  const granted = await askNotifPermissionPremium();
  if (granted) {
    scheduleSessionReminders();
    scheduleDailyReminder();
  }
});
