"use strict";

import { Auth } from "./auth.js";
import { Storage } from "./storage.js";
import { getSupabaseClient } from "./supabase.js";

/* ─── File d'attente offline ─── */
const QUEUE_KEY = "upte_sync_queue";
/** Dernier user_id pour lequel le local a été aligné sur le cloud (changement de compte). */
export const LAST_CLOUD_UID_KEY = "upte_last_cloud_uid";

function getQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveQueue(q) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch {}
}

function enqueue(action) {
  const q = getQueue();
  q.push({ ...action, queuedAt: Date.now() });
  saveQueue(q);
}

async function sb() {
  return getSupabaseClient();
}

/* ─── Sync principal ─── */
export const Sync = {
  _syncing: false,
  _online: navigator.onLine,
  /** Pull Supabase en cours — ne pas déclencher de push debouncé depuis Storage */
  _applyingRemote: false,
  _pushDebounce: null,

  init() {
    window.addEventListener("online", () => {
      this._online = true;
      void this.flushQueue().then((didSync) => {
        if (didSync) this._showSyncConfirmedToast();
      });
    });
    window.addEventListener("offline", () => {
      this._online = false;
    });
  },

  isOnline() {
    return this._online && navigator.onLine;
  },

  /* ── Push localStorage → Supabase
      Retourne true (ok), false (échec), null (ignoré : pas auth / hors ligne / sync déjà en cours). ── */
  async syncToSupabase() {
    if (!Auth.isAuthenticated() || !this.isOnline() || this._syncing) return null;
    this._syncing = true;

    try {
      const client = await sb();
      const uid = Auth.user.id;

      /* Settings */
      const settings = Storage.getSettings();
      const theme = localStorage.getItem("upte_theme") || "light";
      const pomoTotal = parseInt(
        localStorage.getItem("upte_pomo_total") || "0",
      );
      await client.from("settings").upsert(
        {
          user_id: uid,
          universite: settings.universite,
          ecole: settings.ecole,
          parcours: settings.parcours,
          semestre: settings.semestre,
          annee: settings.annee,
          theme,
          pomo_total: pomoTotal,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

      /* Cours custom */
      const customCourses = Storage.getCustomCourses();
      if (customCourses) {
        await client.from("courses").delete().eq("user_id", uid);
        if (customCourses.length > 0) {
          await client.from("courses").insert(
            customCourses.map((c) => ({
              user_id: uid,
              code: c.code,
              name: c.name,
              credits: c.credits,
              prof: c.prof || "",
              salle: c.salle || "",
              color: c.color,
              schedules: c.schedules,
            })),
          );
        }
      }

      /* Sessions de révision */
      const sessions = Storage.getSessions();
      if (sessions.length > 0) {
        await client.from("study_sessions").upsert(
          sessions.map((s) => ({
            id: s.id,
            user_id: uid,
            course_code: s.courseCode,
            date: s.date,
            duration: s.duration,
            start_time: s.startTime || null,
            type: s.type,
            notes: s.notes || "",
          })),
          { onConflict: "id" },
        );
      }

      await Auth.log("sync.push", "sync", uid, {
        sessions: sessions.length,
        courses: customCourses?.length || 0,
      });
      return true;
    } catch (err) {
      console.error("Sync error:", err);
      return false;
    } finally {
      this._syncing = false;
    }
  },

  /* ── Pull Supabase → localStorage
      true = OK, false = erreur, null = ignoré ── */
  async syncFromSupabase() {
    if (!Auth.isAuthenticated() || !this.isOnline()) return null;

    this._applyingRemote = true;
    try {
      const client = await sb();
      const uid = Auth.user.id;

      /* Settings */
      const { data: settings } = await client
        .from("settings")
        .select("*")
        .eq("user_id", uid)
        .single();

      if (settings) {
        const d = Storage.DEFAULT_SETTINGS;
        Storage.saveSettings({
          universite: (settings.universite && String(settings.universite).trim()) || d.universite,
          ecole: (settings.ecole && String(settings.ecole).trim()) || d.ecole,
          parcours: (settings.parcours && String(settings.parcours).trim()) || d.parcours,
          semestre: (settings.semestre && String(settings.semestre).trim()) || d.semestre,
          annee: (settings.annee && String(settings.annee).trim()) || d.annee,
        });
        if (settings.theme) localStorage.setItem("upte_theme", settings.theme);
        if (settings.pomo_total)
          localStorage.setItem("upte_pomo_total", String(settings.pomo_total));
      }

      /* Cours custom */
      const { data: courses } = await client
        .from("courses")
        .select("*")
        .eq("user_id", uid);

      if (courses && courses.length > 0) {
        Storage.saveCustomCourses(
          courses.map((c) => ({
            code: c.code,
            name: c.name,
            credits: c.credits,
            prof: c.prof || "",
            salle: c.salle || "",
            color: c.color,
            schedules: c.schedules ?? [],
          })),
        );
      } else if (Array.isArray(courses) && courses.length === 0) {
        try {
          localStorage.removeItem(Storage.COURSES_KEY);
        } catch {}
      }

      /* Sessions */
      const { data: sessions } = await client
        .from("study_sessions")
        .select("*")
        .eq("user_id", uid);

      if (sessions && sessions.length > 0) {
        Storage.saveSessions(
          sessions.map((s) => ({
            id: s.id,
            courseCode: s.course_code,
            date: s.date,
            duration: s.duration,
            startTime: s.start_time,
            type: s.type,
            notes: s.notes,
          })),
        );
      } else if (Array.isArray(sessions) && sessions.length === 0) {
        Storage.saveSessions([]);
      }

      await Auth.log("sync.pull", "sync", uid);
      return true;
    } catch (err) {
      console.error("Sync pull error:", err);
      return false;
    } finally {
      this._applyingRemote = false;
    }
  },

  /**
   * Après connexion ou retour réseau : aligne local ↔ cloud sans mélanger deux comptes.
   * - Changement de compte (uid ≠ dernier mémorisé) : pull cloud du nouveau compte d’abord, puis push.
   * - Même compte : push local d’abord (sauver le travail), puis pull (autres appareils).
   */
  async reconcileAfterLogin(opts = {}) {
    const showToast = opts.showToast !== false;
    if (!Auth.isAuthenticated()) return { ok: false, reason: "no-auth" };

    if (!this.isOnline()) {
      this.queueOfflineAction({ type: "reconcile", uid: Auth.user.id });
      if (showToast) {
        window.UI?.toast(
          "Hors ligne — tes modifications seront envoyées dès la connexion.",
          "info",
        );
      }
      return { ok: false, offline: true };
    }

    const uid = Auth.user.id;
    let lastUid = null;
    try {
      lastUid = localStorage.getItem(LAST_CLOUD_UID_KEY);
    } catch {
      lastUid = null;
    }

    const accountSwitch = lastUid != null && lastUid !== uid;

    if (accountSwitch) {
      const pull = await this.syncFromSupabase();
      if (pull === false) {
        if (showToast) {
          window.UI?.toast(
            "Impossible de charger les données de ce compte. Réessaie.",
            "error",
          );
        }
        return { ok: false, step: "pull" };
      }
      try {
        localStorage.setItem(LAST_CLOUD_UID_KEY, uid);
      } catch {}
      this._refreshAppAfterSync();
      const push = await this.syncToSupabase();
      if (push === false) {
        if (showToast) {
          window.UI?.toast(
            "Données chargées, mais l’envoi vers le cloud a échoué.",
            "error",
          );
        }
        return { ok: false, step: "push", accountSwitch: true };
      }
      if (showToast) this._showSyncConfirmedToast();
      return { ok: true, accountSwitch: true };
    }

    const pushFirst = await this.syncToSupabase();
    if (pushFirst === false) {
      if (showToast) {
        window.UI?.toast(
          "Synchronisation vers ton compte impossible pour l’instant.",
          "error",
        );
      }
      return { ok: false, step: "push" };
    }

    const pullSecond = await this.syncFromSupabase();
    if (pullSecond === false) {
      if (showToast) {
        window.UI?.toast(
          "Tes données sont enregistrées ; la mise à jour distante a échoué.",
          "error",
        );
      }
      try {
        localStorage.setItem(LAST_CLOUD_UID_KEY, uid);
      } catch {}
      return { ok: false, step: "pull" };
    }

    try {
      localStorage.setItem(LAST_CLOUD_UID_KEY, uid);
    } catch {}
    this._refreshAppAfterSync();
    if (showToast) this._showSyncConfirmedToast();
    return { ok: true };
  },

  /** Push différé après chaque écriture locale (utilisateur connecté). */
  scheduleCloudSync() {
    if (this._applyingRemote) return;
    if (!Auth.isAuthenticated()) return;
    if (!this.isOnline()) {
      this.queueOfflineAction({ type: "local-change", at: Date.now() });
      return;
    }
    if (this._pushDebounce) clearTimeout(this._pushDebounce);
    this._pushDebounce = setTimeout(async () => {
      this._pushDebounce = null;
      await this.syncToSupabase();
    }, 1400);
  },

  _refreshAppAfterSync() {
    try {
      window.App?.applySettings?.();
      window.App?.renderDashboard?.();
      window.App?.renderCourseList?.();
      window.App?.renderScheduleList?.();
      window.App?.renderWeekGrid?.();
      window.App?.populateCourseSelects?.();
      if (window.UI?.currentPage === "planner") window.App?.renderPlanner?.();
      if (window.UI?.currentPage === "settings") window.App?.renderSettings?.();
      if (window.UI?.currentPage === "learn") window.Learn?.render?.();
      if (window.UI?.currentPage === "notes") window.Notes?.render?.();
      window.UI?.renderMiniCalendar?.(null, null);
    } catch (e) {
      console.warn("Refresh after sync:", e);
    }
  },

  /* ── Migration localStorage → Supabase (premier login) ── */
  async migrateFromLocal() {
    if (!Auth.isAuthenticated() || !this.isOnline()) return;

    const sessions = Storage.getSessions();
    const courses = Storage.getCustomCourses();
    const settings = Storage.getSettings();

    const hasData = sessions.length > 0 || courses !== null;
    if (!hasData) return;

    return new Promise((resolve) => {
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
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <div style="font-family:'Syne',sans-serif;font-weight:800;font-size:18px;
            color:var(--text);margin-bottom:10px">Données locales détectées</div>
          <div style="font-size:13px;color:var(--muted);line-height:1.6;margin-bottom:28px">
            On a trouvé <strong style="color:var(--text)">${sessions.length} session${sessions.length > 1 ? "s" : ""}</strong>
            ${courses ? ` et <strong style="color:var(--text)">${courses.length} cours</strong>` : ""}
            sur cet appareil. Les importer dans ton compte ?
          </div>
          <div style="display:flex;flex-direction:column;gap:10px">
            <button id="migrateYes" class="btn btn-primary"
              style="width:100%;justify-content:center;padding:12px">
              Importer mes données
            </button>
            <button id="migrateNo" class="btn btn-ghost"
              style="width:100%;justify-content:center">
              Non, repartir de zéro
            </button>
          </div>
        </div>`;

      document.body.appendChild(overlay);

      document.getElementById("migrateYes").onclick = async () => {
        overlay.remove();
        const ok = await this.syncToSupabase();
        if (ok === true) {
          await Auth.log("migration.import", "sync", Auth.user.id, {
            sessions: sessions.length,
            courses: courses?.length || 0,
          });
          window.UI?.toast("Données importées dans ton compte.", "success");
          resolve(true);
        } else {
          window.UI?.toast(
            "La synchronisation a échoué. Vérifie ta connexion et réessaie depuis les paramètres.",
            "error",
          );
          resolve(false);
        }
      };

      document.getElementById("migrateNo").onclick = () => {
        overlay.remove();
        resolve(false);
      };
    });
  },

  /* ── File d'attente offline ── */
  queueOfflineAction(action) {
    enqueue(action);
  },

  /** Retourne true si une synchro a réussi après une file non vide. */
  async flushQueue() {
    if (!Auth.isAuthenticated() || !this.isOnline()) return false;
    const queue = getQueue();
    if (queue.length === 0) return false;

    const ok = await this.reconcileAfterLogin({ showToast: false });
    if (ok.ok) saveQueue([]);
    else {
      const fallback = await this.syncToSupabase();
      if (fallback === true) saveQueue([]);
      return fallback === true;
    }
    return true;
  },

  /* ── Toast : confirmation explicite compte ↔ cloud ── */
  _showSyncConfirmedToast() {
    if (!Auth.isAuthenticated()) return;
    window.UI?.toast(
      "Tout est bien synchronisé avec ton compte (local + cloud).",
      "success",
    );
  },
};
