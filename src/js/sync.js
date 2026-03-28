"use strict";

import { Auth } from "./auth.js";
import { Storage } from "./storage.js";
import { getSupabaseClient } from "./supabase.js";

/* ─── File d'attente offline ─── */
const QUEUE_KEY = "upte_sync_queue";

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

  init() {
    window.addEventListener("online", () => {
      this._online = true;
      void this.flushQueue().then((didSync) => {
        if (didSync) this._showSyncToast();
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

  /* ── Pull Supabase → localStorage ── */
  async syncFromSupabase() {
    if (!Auth.isAuthenticated() || !this.isOnline()) return;

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
        Storage.saveSettings({
          universite: settings.universite || "UNIVERSITÉ DE LOMÉ",
          ecole: settings.ecole || "EPL",
          parcours: settings.parcours || "Licence Pro GL",
          semestre: settings.semestre || "Semestre 4",
          annee: settings.annee || "2025–2026",
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
      }

      await Auth.log("sync.pull", "sync", uid);
    } catch (err) {
      console.error("Sync pull error:", err);
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

    const ok = await this.syncToSupabase();
    if (ok === true) saveQueue([]);
    return ok === true;
  },

  /* ── Toast sync discret ── */
  _showSyncToast() {
    if (!Auth.isAuthenticated()) return;
    const tc = document.getElementById("toastContainer");
    if (!tc) return;
    const el = document.createElement("div");
    el.className = "toast success";
    el.style.cssText =
      "min-width:200px;display:flex;align-items:center;gap:10px";
    el.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <path d="M20 11A8.1 8.1 0 0 0 4.5 9"/>
        <polyline points="4 6 4.5 9 8 9"/>
        <path d="M4 13a8.1 8.1 0 0 0 15.5 2"/>
        <polyline points="20 18 19.5 15 16 15"/>
      </svg>
      <span style="font-size:12px;color:var(--muted)">Données synchronisées</span>`;
    tc.appendChild(el);
    setTimeout(() => {
      el.style.animation = "toast-out .3s ease forwards";
      setTimeout(() => el.remove(), 300);
    }, 2000);
  },
};
