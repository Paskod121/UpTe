"use strict";

export class Storage {
  static KEY = "gl_s4_planner_v2";
  static SETTINGS_KEY = "upte_settings";
  static COURSES_KEY = "upte_courses";

  /* ─── Sessions ─── */
  static get() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY)) || { sessions: [] };
    } catch {
      return { sessions: [] };
    }
  }
  static set(data) {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(data));
    } catch {}
  }
  static getSessions() {
    return this.get().sessions;
  }
  static saveSessions(s) {
    const d = this.get();
    d.sessions = s;
    this.set(d);
    this._afterPersist();
  }

  /* ─── Paramètres établissement ─── */
  /** Libellés neutres tant que l’utilisateur n’a pas enregistré ses vrais paramètres. */
  static DEFAULT_SETTINGS = {
    universite: "Ex. Mon université — à personnaliser",
    ecole: "Ex. École / faculté — à personnaliser",
    parcours: "Ex. Parcours (Licence, Master…)",
    semestre: "Ex. Semestre ou trimestre",
    annee: "Ex. Année universitaire",
  };

  static getSettings() {
    try {
      const s = JSON.parse(localStorage.getItem(this.SETTINGS_KEY));
      return s
        ? { ...this.DEFAULT_SETTINGS, ...s }
        : { ...this.DEFAULT_SETTINGS };
    } catch {
      return { ...this.DEFAULT_SETTINGS };
    }
  }
  static saveSettings(s) {
    try {
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(s));
    } catch {}
    this._afterPersist();
  }

  /* ─── Cours personnalisés ─── */
  static getCustomCourses() {
    try {
      const c = localStorage.getItem(this.COURSES_KEY);
      return c ? JSON.parse(c) : null;
    } catch {
      return null;
    }
  }
  static saveCustomCourses(courses) {
    try {
      localStorage.setItem(this.COURSES_KEY, JSON.stringify(courses));
    } catch {}
    this._afterPersist();
  }

  /** Sync cloud (debounce) — évite import circulaire avec sync.js */
  static _afterPersist() {
    try {
      queueMicrotask(() => {
        if (typeof window !== "undefined" && window.Sync?.scheduleCloudSync) {
          window.Sync.scheduleCloudSync();
        }
      });
    } catch {}
  }
  static resetCourses() {
    try {
      // Sauvegarde avant suppression
      const current = localStorage.getItem(this.COURSES_KEY);
      if (current) localStorage.setItem(this.COURSES_KEY + "_backup", current);
      localStorage.removeItem(this.COURSES_KEY);
    } catch {}
  }

  static restoreCoursesBackup() {
    try {
      const backup = localStorage.getItem(this.COURSES_KEY + "_backup");
      if (!backup) return false;
      localStorage.setItem(this.COURSES_KEY, backup);
      localStorage.removeItem(this.COURSES_KEY + "_backup");
      return true;
    } catch {
      return false;
    }
  }

  static hasCoursesBackup() {
    try {
      return !!localStorage.getItem(this.COURSES_KEY + "_backup");
    } catch {
      return false;
    }
  }
}
