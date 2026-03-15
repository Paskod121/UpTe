"use strict";

/**
 * Persistance localStorage — sessions de révision
 */

export class Storage {
  static KEY = "gl_s4_planner_v2";

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
}
