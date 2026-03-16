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
  }

  /* ─── Paramètres établissement ─── */
  static DEFAULT_SETTINGS = {
    universite: "UNIVERSITÉ DE LOMÉ",
    ecole: "EPL",
    parcours: "Licence Pro GL",
    semestre: "Semestre 4",
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
  }
  static resetCourses() {
    try {
      localStorage.removeItem(this.COURSES_KEY);
    } catch {}
  }
}
