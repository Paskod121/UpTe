"use strict";

import { App } from "./app.js";
import { UI } from "./ui.js";
import { Learn } from "./learn.js";
import { Notes } from "./notes.js";
import { Combo } from "./combo.js";
import { Storage } from "./storage.js";
import { getActiveCourses } from "./utils.js";
import { Auth } from "./auth.js";
import { Sync } from "./sync.js";
import { AuthScreen } from "./auth-screen.js";

window.App = App;

window.Auth = Auth;
window.Sync = Sync;
window.AuthScreen = AuthScreen;

window.UI = UI;
window.Learn = Learn;
window.Notes = Notes;
window.Combo = Combo;

window.NotifCenter = {
  KEY: "upte_notifications",
  MAX: 20,
  _outsideHandler: null,
  _panelMoved: false,

  _get() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY)) || [];
    } catch {
      return [];
    }
  },

  _save(list) {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(list));
    } catch {}
  },

  push(type, title, message, action = "dashboard") {
    const list = this._get();
    list.unshift({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      type,
      title,
      message,
      timestamp: Date.now(),
      read: false,
      action,
    });
    if (list.length > this.MAX) list.splice(this.MAX);
    this._save(list);
    this._updateBadge();
    this._refreshPanel();
  },

  markAllRead() {
    const list = this._get().map((n) => ({ ...n, read: true }));
    this._save(list);
    this._updateBadge();
    this._refreshPanel();
  },

  markRead(id) {
    const list = this._get().map((n) =>
      n.id === id ? { ...n, read: true } : n,
    );
    this._save(list);
    this._updateBadge();
  },

  delete(id) {
    this._save(this._get().filter((n) => n.id !== id));
    this._updateBadge();
    this._refreshPanel();
  },

  _updateBadge() {
    const badge = document.getElementById("notifBadge");
    if (!badge) return;
    const count = this._get().filter((n) => !n.read).length;
    if (count > 0) {
      badge.style.display = "flex";
      badge.textContent = count > 9 ? "9+" : count;
    } else {
      badge.style.display = "none";
    }
  },

  _closePanel() {
    const panel = document.getElementById("notifPanel");
    if (panel) panel.style.cssText = "display:none";
    document.body.style.overflow = "";
    document.getElementById("notifOverlay")?.remove();
    if (this._outsideHandler) {
      document.removeEventListener("click", this._outsideHandler);
      this._outsideHandler = null;
    }
  },

  toggle() {
    const panel = document.getElementById("notifPanel");
    if (!panel) return;

    if (panel.style.display === "block") {
      this._closePanel();
      return;
    }

    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
      if (!this._panelMoved) {
        document.body.appendChild(panel);
        this._panelMoved = true;
      }

      document.getElementById("notifOverlay")?.remove();
      const overlay = document.createElement("div");
      overlay.id = "notifOverlay";
      overlay.style.cssText = `
        position:fixed;inset:0;z-index:1000;
        background:rgba(0,0,0,0.4);
        backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);
        animation:fadeIn .2s ease;
      `;
      overlay.addEventListener("click", () => this._closePanel());
      document.body.style.overflow = "hidden";
      document.body.appendChild(overlay);

      panel.style.cssText = `
        display:block;position:fixed;
        top:58px;left:12px;right:12px;width:auto;
        background:var(--surface);border:1px solid var(--border);
        border-radius:var(--radius);box-shadow:var(--shadow);
        z-index:1001;overflow:hidden;
        max-height:calc(100vh - 80px);
        animation:pageEnter .2s ease;
      `;
    } else {
      panel.style.cssText = `
        display:block;position:absolute;
        top:calc(100% + 8px);right:0;width:320px;
        background:var(--surface);border:1px solid var(--border);
        border-radius:var(--radius);box-shadow:var(--shadow);
        z-index:500;overflow:hidden;
        animation:pageEnter .2s ease;
      `;

      setTimeout(() => {
        this._outsideHandler = (e) => {
          const p = document.getElementById("notifPanel");
          const btn = document.getElementById("notifBellBtn");
          if (p && !p.contains(e.target) && !btn?.contains(e.target)) {
            this._closePanel();
          }
        };
        document.addEventListener("click", this._outsideHandler);
      }, 100);
    }

    this._refreshPanel();
  },

  _refreshPanel() {
    const panel = document.getElementById("notifPanel");
    const el = document.getElementById("notifList");
    if (!el || panel?.style.display !== "block") return;

    const list = this._get();
    const isMobile = window.innerWidth <= 768;

    el.style.cssText = `
      overflow-y:auto;
      max-height:${isMobile ? "calc(100vh - 140px)" : "380px"};
      scrollbar-width:thin;
      scrollbar-color:var(--border) transparent;
      overscroll-behavior:contain;
    `;

    if (list.length === 0) {
      el.innerHTML = `
        <div style="text-align:center;padding:40px 20px;color:var(--muted);font-size:13px">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="1.5" stroke-linecap="round" style="opacity:.4;display:block;margin:0 auto 10px">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          Aucune notification
        </div>`;
      return;
    }

    const ICONS = {
      session: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
      pomo: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
      daily: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
      cours: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
      missed: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    };

    const COLORS = {
      session: "var(--green)",
      pomo: "var(--orange)",
      daily: "var(--green)",
      cours: "#818cf8",
      missed: "var(--red)",
    };

    const timeAgo = (ts) => {
      const diff = Date.now() - ts;
      const m = Math.floor(diff / 60000);
      const h = Math.floor(diff / 3600000);
      const d = Math.floor(diff / 86400000);
      if (m < 1) return "À l'instant";
      if (m < 60) return `Il y a ${m} min`;
      if (h < 24) return `Il y a ${h}h`;
      return `Il y a ${d}j`;
    };

    el.innerHTML = list
      .map(
        (n) => `
      <div style="
        display:flex;align-items:flex-start;gap:12px;padding:12px 16px;
        border-bottom:1px solid var(--border);cursor:pointer;transition:background .15s;
        background:${n.read ? "transparent" : "var(--green-dim)"}"
        onclick="NotifCenter._click('${n.id}','${n.action}')"
        onmouseenter="this.style.background='var(--surface2)'"
        onmouseleave="this.style.background='${n.read ? "transparent" : "var(--green-dim)"}'">
        <div style="
          width:30px;height:30px;border-radius:8px;flex-shrink:0;margin-top:2px;
          background:${COLORS[n.type] || "var(--green)"}18;
          border:1px solid ${COLORS[n.type] || "var(--green)"}30;
          color:${COLORS[n.type] || "var(--green)"};
          display:flex;align-items:center;justify-content:center">
          ${ICONS[n.type] || ICONS.daily}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-family:'Syne',sans-serif;font-weight:${n.read ? 600 : 700};font-size:12px;color:var(--text);margin-bottom:2px">
            ${n.title}
          </div>
          <div style="font-size:11px;color:var(--muted);line-height:1.4;margin-bottom:4px">
            ${n.message}
          </div>
          <div style="font-size:10px;color:var(--muted2)">${timeAgo(n.timestamp)}</div>
        </div>
        <button style="background:none;border:none;cursor:pointer;color:var(--muted2);padding:4px;flex-shrink:0;border-radius:4px;transition:.15s"
          onclick="event.stopPropagation();NotifCenter.delete('${n.id}')"
          onmouseenter="this.style.color='var(--red)'"
          onmouseleave="this.style.color='var(--muted2)'"
          title="Supprimer">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>`,
      )
      .join("");
  },

  _click(id, action) {
    this.markRead(id);
    this._closePanel();
    if (window.UI) window.UI.navigate(action);
  },

  init() {
    this._updateBadge();
    this._checkMissedSessions();
    setInterval(() => this._checkUpcomingCours(), 60000);
    this._checkUpcomingCours();
  },

  _checkMissedSessions() {
    const sessions = Storage.getSessions();
    const yesterday = new Date(Date.now() - 86400000);
    const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
    const existing = this._get().map((n) => n.id);
    sessions
      .filter((s) => s.date === yStr)
      .forEach((s) => {
        const missedId = `missed-${s.id}`;
        if (existing.includes(missedId)) return;
        const list = this._get();
        list.unshift({
          id: missedId,
          type: "missed",
          title: "Session non effectuée",
          message: "Ta révision d'hier n'a pas été complétée.",
          timestamp: Date.now(),
          read: false,
          action: "planner",
        });
        if (list.length > this.MAX) list.splice(this.MAX);
        this._save(list);
        this._updateBadge();
      });
  },

  _checkUpcomingCours() {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const dayName = [
      "Dimanche",
      "Lundi",
      "Mardi",
      "Mercredi",
      "Jeudi",
      "Vendredi",
      "Samedi",
    ][now.getDay()];
    let courses = [];
    try {
      courses = getActiveCourses();
    } catch {
      return;
    }
    courses.forEach((c) => {
      (c.schedules || []).forEach((s) => {
        if (s.jour !== dayName) return;
        const [h, m] = s.start.split(":").map(Number);
        if (h * 60 + m - nowMin === 15) {
          this.push(
            "cours",
            `${c.code} dans 15 minutes`,
            `${c.name} — ${s.start}${c.salle ? " · " + c.salle : ""}.`,
            "schedule",
          );
        }
      });
    });
  },
};

window._notifyPomoDone = function (mode, nextLabel) {
  const isWork = mode === "work";
  window.NotifCenter?.push(
    "pomo",
    isWork ? "Session Pomodoro terminée" : "Pause terminée",
    isWork
      ? `25 min complètes. Place à la ${nextLabel}.`
      : "Retour au travail.",
    "learn",
  );
  if (document.visibilityState === "visible") return;
  if (Notification.permission === "granted") {
    const n = new Notification(
      isWork ? "Session Pomodoro terminée" : "Pause terminée",
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

const _originalNavigate = UI.navigate.bind(UI);
UI.navigate = function (page) {
  window.NotifCenter?._closePanel();
  _originalNavigate(page);
};

async function registerSW() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {}
}

function showNotif(title, body, tag = "upte") {
  if (Notification.permission !== "granted") return;
  const n = new Notification(`Up\u25CFTe \u2014 ${title}`, {
    body,
    icon: "/src/images/icon-192.png",
    badge: "/src/images/icon-192.png",
    tag,
  });
  n.onclick = () => {
    window.focus();
    n.close();
  };
}

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
      const delay =
        new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
          h,
          m,
        ).getTime() -
        15 * 60 * 1000 -
        nowMs;
      if (delay < 0) return;
      setTimeout(() => {
        showNotif(
          "Session dans 15 minutes",
          `${s.duration}h de révision à ${s.startTime}.`,
          `session-${s.id}`,
        );
        window.NotifCenter?.push(
          "session",
          "Session dans 15 minutes",
          `${s.duration}h de révision à ${s.startTime}.`,
          "planner",
        );
      }, delay);
    });
}

function scheduleDailyReminder() {
  if (Notification.permission !== "granted") return;
  const now = new Date();
  const delay =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      21,
      0,
      0,
    ).getTime() - Date.now();
  if (delay < 0) return;
  setTimeout(() => {
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    if (Storage.getSessions().some((s) => s.date === todayStr)) return;
    showNotif(
      "Aucune révision aujourd'hui",
      "Il est 21h — 25 minutes suffisent. Lance un Pomodoro.",
    );
    window.NotifCenter?.push(
      "daily",
      "Aucune révision aujourd'hui",
      "21h00 — il reste du temps. Lance un Pomodoro.",
      "learn",
    );
  }, delay);
}

async function askNotifPermissionPremium() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.style.cssText = `position:fixed;inset:0;background:#00000080;display:flex;align-items:center;
      justify-content:center;z-index:600;padding:20px;backdrop-filter:blur(6px);animation:fadeIn .2s ease`;
    overlay.innerHTML = `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);
        padding:32px 28px;max-width:380px;width:100%;box-shadow:var(--shadow);text-align:center;animation:pageEnter .25s ease">
        <div style="width:56px;height:56px;border-radius:16px;background:var(--green-dim);border:1px solid var(--green3);
          display:flex;align-items:center;justify-content:center;margin:0 auto 20px;color:var(--green)">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </div>
        <div style="font-family:'Syne',sans-serif;font-weight:800;font-size:18px;color:var(--text);margin-bottom:10px">Reste informé</div>
        <div style="font-size:13px;color:var(--muted);line-height:1.6;margin-bottom:28px">
          UpTe peut t'envoyer des rappels avant tes sessions de révision et te notifier quand ton Pomodoro se termine.
        </div>
        <div style="display:flex;flex-direction:column;gap:10px">
          <button id="notifAccept" class="btn btn-primary" style="width:100%;justify-content:center;padding:12px">Activer les notifications</button>
          <button id="notifLater" class="btn btn-ghost" style="width:100%;justify-content:center">Plus tard</button>
        </div>
        <div style="margin-top:16px;font-size:11px;color:var(--muted2)">Tu pourras modifier ce choix dans les paramètres du navigateur.</div>
      </div>`;
    document.body.appendChild(overlay);
    document.getElementById("notifAccept").onclick = async () => {
      overlay.remove();
      resolve((await Notification.requestPermission()) === "granted");
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

/* ── Fonction pour lancer l'app après auth ── */
function _launchApp() {
  window._appLaunched = true;
  App.init();
  Learn.init();
  Notes.init();
  Combo.init();
  NotifCenter.init();
  Sync.syncToSupabase();

  // Cache le bouton si déjà connecté
  if (Auth.isAuthenticated()) {
    document.getElementById("sidebarAuthBtn")?.remove();
  }
}

function _scheduleAuthPrompts() {
  const REASONS = ["general", "promo", "pomodoro", "share"];
  const DELAYS = [5000, 60000, 120000, 300000];
  let shownCount = 0;
  if (localStorage.getItem("upte_auth_prompted_done")) return;

  const show = () => {
    if (Auth.isAuthenticated()) return;
    if (document.getElementById("authContextModal")) return;
    const reason = REASONS[shownCount % REASONS.length];
    AuthScreen.showContextualPrompt(reason);
    shownCount++;
    if (shownCount < DELAYS.length) {
      setTimeout(show, DELAYS[shownCount]);
    }
  };

  setTimeout(show, DELAYS[0]);
}

document.addEventListener("DOMContentLoaded", async () => {
  UI.applyTheme(UI.getStoredTheme());
  Sync.init();

  const user = await Auth.init();

  if (!user) {
    // On force pas — app accessible directement
    _launchApp();
    _scheduleAuthPrompts();
    // Affiche le bouton de connexion dans la sidebar
  } else {
    const isNewLogin = window.location.hash.includes("access_token") 
    || window.location.search.includes("code=")
    || document.referrer.includes("accounts.google.com")
    || document.referrer.includes("supabase.co");
  
  if (isNewLogin) {
    window.history.replaceState({}, document.title, window.location.pathname);
    AuthScreen.show();
    AuthScreen._renderOnboarding(Auth.getDisplayName());
    } else {
      _launchApp();
    }
  }

  /* ── Fix boucle Google OAuth ──
     onAuthStateChange se déclenche à chaque rechargement si le hash
     #access_token est dans l'URL. On nettoie l'URL immédiatement
     et on vérifie que l'écran auth est encore visible avant d'agir. */
  Auth.onChange(async (event, session) => {
    if (event === "SIGNED_IN") {
      localStorage.setItem("upte_auth_prompted_done", "1");
      // Nettoie le hash de l'URL sans recharger la page
      if (window.location.hash.includes("access_token")) {
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
      }

      // Lance l'app uniquement si l'écran auth est encore visible
      document.getElementById("sidebarAuthBtn")?.remove();

      if (document.getElementById("authScreen")) {
        if (AuthScreen._step !== "onboarding") {
          AuthScreen._renderWebAuthn(Auth.getDisplayName());
        }
      } else if (!window._appLaunched) {
        // Supabase a consommé le hash avant nous
        // → premier login via redirect Google
        AuthScreen.show();
        AuthScreen._renderOnboarding(Auth.getDisplayName());
      }
    }

    if (event === "SIGNED_OUT") {
      // Recharge l'écran de connexion
      window.location.reload();
    }
  });

  await registerSW();
  const granted = await askNotifPermissionPremium();
  if (granted) {
    scheduleSessionReminders();
    scheduleDailyReminder();
  }
});
