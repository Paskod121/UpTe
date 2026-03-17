"use strict";

import { Storage } from "./storage.js";
import { UI } from "./ui.js";
import {
  COURSES_DATA,
  DAYS,
  MONTHS,
  TYPE_COLORS,
  TYPE_LABELS,
  WEEK_DAYS,
} from "./constants.js";
import {
  timeToMin,
  formatDate,
  todayStr,
  uniqueId,
  esc,
  courseByCode,
  courseColor,
  typeColor,
  getActiveCourses,
  getCourseSchedules,
  getSchedulesForDay,
  getCoursesForDay,
} from "./utils.js";
import {
  validateStudySession,
  validateCourse,
  validateSettings,
  clearErrors,
} from "./validator.js";

const COURSE_COLOR_PRESETS = [
  "#16a34a",
  "#15803d",
  "#0d9488",
  "#0891b2",
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#dc2626",
  "#d97706",
  "#ea580c",
  "#6b7280",
  "#374151",
];

export class App {
  /* ══════ INIT ══════ */
  static init() {
    this.setupDate();
    this.applySettings();
    this.populateCourseSelects();
    this.renderCourseList();
    this.renderScheduleList();
    this.renderWeekGrid();
    this.renderDashboard();
    UI.renderMiniCalendar(todayStr(), null);
    document.getElementById("studyDate").value = todayStr();
    setTimeout(() => {
      document.getElementById("creditsBar").style.width = "65%";
    }, 500);
  }

  static setupDate() {
    const now = new Date();
    document.getElementById("currentDay").textContent = DAYS[now.getDay()];
    document.getElementById("currentDate").textContent =
      `${now.getDate()} ${MONTHS[now.getMonth()]}`;
  }

  /* ══════ SETTINGS ══════ */
  static applySettings() {
    const s = Storage.getSettings();
    const topbarSub = document.getElementById("topbarSubtitle");
    const logoSub = document.getElementById("logoSub");
    const sidebarSem = document.getElementById("sidebarSemestre");
    const sidebarAnnee = document.getElementById("sidebarAnnee");
    if (topbarSub) topbarSub.textContent = `${s.parcours} · ${s.semestre}`;
    if (logoSub) logoSub.textContent = `${s.ecole} · ${s.universite}`;
    if (sidebarSem) sidebarSem.textContent = s.semestre;
    if (sidebarAnnee) sidebarAnnee.textContent = s.annee || "2025–2026";
  }

  static renderSettings() {
    const s = Storage.getSettings();
    const map = {
      "set-universite": s.universite,
      "set-ecole": s.ecole,
      "set-parcours": s.parcours,
      "set-semestre": s.semestre,
      "set-annee": s.annee || "2025–2026",
    };
    Object.entries(map).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    });
    this._renderSettingsCourseList();
  }

  static saveSettings() {
    const data = {
      universite: document.getElementById("set-universite").value.trim(),
      ecole: document.getElementById("set-ecole").value.trim(),
      parcours: document.getElementById("set-parcours").value.trim(),
      semestre: document.getElementById("set-semestre").value.trim(),
      annee: document.getElementById("set-annee")?.value.trim() || "2025–2026",
    };
    if (!validateSettings(data)) return;
    Storage.saveSettings(data);
    this.applySettings();
    UI.toast("Paramètres enregistrés.", "success");
  }

  /* ══════ SETTINGS — CRUD Cours ══════ */
  static _renderSettingsCourseList() {
    const el = document.getElementById("settingsCourseList");
    if (!el) return;
    const courses = getActiveCourses();
    const isCustom = Storage.getCustomCourses() !== null;

    el.innerHTML =
      courses
        .map((c) => {
          const color = courseColor(c);
          const schedules = getCourseSchedules(c);
          const schedStr =
            schedules.length === 0
              ? "<span style='color:var(--red);font-size:10px'>Horaire non défini</span>"
              : schedules
                  .map((s) => `${s.jour} ${s.start}–${s.end}`)
                  .join(", ");
          return `<div class="settings-course-item">
        <div class="sci-color" style="background:${color}"></div>
        <div class="sci-info">
          <span class="sci-code" style="color:${color}">${esc(c.code)}</span>
          <span class="sci-name">${esc(c.name)}</span>
          <span class="sci-meta">${c.credits}cr · ${schedStr}</span>
        </div>
        <div class="sci-actions">
          <button class="icon-btn" onclick="App.openEditCourse('${esc(c.code)}')" title="Modifier">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
          </button>
          <button class="icon-btn del" onclick="App.deleteCourse('${esc(c.code)}')" title="Supprimer">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>
          </button>
        </div>
      </div>`;
        })
        .join("") ||
      `<div class="empty-state"><div class="empty-title">Aucun cours</div></div>`;

    const resetBtn = document.getElementById("resetCoursesBtn");
    if (resetBtn) resetBtn.style.display = isCustom ? "inline-flex" : "none";
  }

  /* ─── Schedule builder ─── */
  static _scheduleRows = [];

  static _renderScheduleBuilder(containerId, schedules = []) {
    const container = document.getElementById(containerId);
    if (!container) return;
    this._scheduleRows = schedules.map((s) => ({ ...s }));
    this._refreshScheduleBuilder(containerId);
  }

  static _refreshScheduleBuilder(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const prefix = containerId.startsWith("add") ? "add" : "edit";

    if (this._scheduleRows.length === 0) {
      container.innerHTML = `
        <div class="schedule-empty-hint">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Aucun créneau — cours sans horaire défini
        </div>
        <button type="button" class="btn btn-ghost btn-sm schedule-add-btn" onclick="App._addScheduleRow('${containerId}')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Ajouter un créneau
        </button>`;
      return;
    }

    container.innerHTML = `
      <div class="schedule-rows" id="${containerId}-rows">
        ${this._scheduleRows.map((s, i) => this._scheduleRowHTML(prefix, i, s)).join("")}
      </div>
      <button type="button" class="btn btn-ghost btn-sm schedule-add-btn" onclick="App._addScheduleRow('${containerId}')">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Ajouter un créneau
      </button>`;
  }

  static _scheduleRowHTML(prefix, i, s = {}) {
    const days = [
      "Lundi",
      "Mardi",
      "Mercredi",
      "Jeudi",
      "Vendredi",
      "Samedi",
      "Dimanche",
    ];
    return `
      <div class="schedule-row" id="schedule-row-${i}">
        <div class="schedule-row-inner">
          <select class="form-select" style="font-size:13px;padding:8px 12px;height:38px" id="${prefix}-jour-${i}"
            onchange="App._updateScheduleRow(${i}, 'jour', this.value)">
            <option value="">Jour</option>
            ${days.map((d) => `<option value="${d}" ${s.jour === d ? "selected" : ""}>${d}</option>`).join("")}
          </select>
          <input type="time" class="form-input schedule-time" id="${prefix}-start-${i}"
            value="${s.start || ""}"
            onchange="App._updateScheduleRow(${i}, 'start', this.value)"
            placeholder="Début"/>
          <span class="schedule-sep">→</span>
          <input type="time" class="form-input schedule-time" id="${prefix}-end-${i}"
            value="${s.end || ""}"
            onchange="App._updateScheduleRow(${i}, 'end', this.value)"
            placeholder="Fin"/>
          <button type="button" class="icon-btn del" onclick="App._removeScheduleRow(${i}, event)"
            title="Supprimer ce créneau">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="form-error" id="err-${prefix}-jour-${i}"></div>
        <div class="form-error" id="err-${prefix}-start-${i}"></div>
        <div class="form-error" id="err-${prefix}-end-${i}"></div>
      </div>`;
  }

  static _addScheduleRow(containerId) {
    this._scheduleRows.push({ jour: "", start: "", end: "" });
    this._refreshScheduleBuilder(containerId);
  }

  static _removeScheduleRow(i, evt) {
    evt?.stopPropagation();
    this._scheduleRows.splice(i, 1);
    const containerId =
      document.querySelector(".schedule-rows")?.closest("[id]")?.id ||
      (document.getElementById("add-schedules-wrap")
        ? "add-schedules-wrap"
        : "edit-schedules-wrap");
    this._refreshScheduleBuilder(containerId);
  }

  static _updateScheduleRow(i, field, value) {
    if (this._scheduleRows[i]) this._scheduleRows[i][field] = value;
  }

  /* ─── Open Add ─── */
  static openAddCourse() {
    ["add-code", "add-name", "add-prof", "add-salle"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    document.getElementById("add-credits").value = "3";
    this._initColorPicker(
      "add-color-picker",
      "add-color-val",
      COURSE_COLOR_PRESETS[0],
    );
    this._renderScheduleBuilder("add-schedules-wrap", []);
    UI.openModal("addCourse");
  }

  /* ─── Open Edit ─── */
  static openEditCourse(code) {
    const c = getActiveCourses().find((x) => x.code === code);
    if (!c) return;
    document.getElementById("edit-code-orig").value = c.code;
    document.getElementById("edit-code").value = c.code;
    document.getElementById("edit-name").value = c.name;
    document.getElementById("edit-credits").value = c.credits;
    document.getElementById("edit-prof").value = c.prof || "";
    document.getElementById("edit-salle").value = c.salle || "";
    this._initColorPicker(
      "edit-color-picker",
      "edit-color-val",
      courseColor(c),
    );
    this._renderScheduleBuilder("edit-schedules-wrap", getCourseSchedules(c));
    UI.openModal("editCourse");
  }

  static _initColorPicker(pickerId, inputId, selected) {
    const picker = document.getElementById(pickerId);
    const input = document.getElementById(inputId);
    if (!picker || !input) return;
    input.value = selected;
    picker.innerHTML = COURSE_COLOR_PRESETS.map(
      (color) => `
      <button type="button" class="color-dot ${color === selected ? "active" : ""}"
        style="background:${color}"
        onclick="App._selectColor('${pickerId}','${inputId}','${color}')"></button>`,
    ).join("");
  }

  static _selectColor(pickerId, inputId, color) {
    document.getElementById(inputId).value = color;
    document
      .getElementById(pickerId)
      .querySelectorAll(".color-dot")
      .forEach((d) => {
        d.classList.toggle(
          "active",
          d.style.background === color || d.style.backgroundColor === color,
        );
      });
  }

  static _courseFromForm(prefix) {
    const hex =
      document.getElementById(`${prefix}-color-val`)?.value ||
      COURSE_COLOR_PRESETS[0];
    return {
      code: document
        .getElementById(`${prefix}-code`)
        .value.trim()
        .toUpperCase(),
      name: document.getElementById(`${prefix}-name`).value.trim(),
      credits:
        parseInt(document.getElementById(`${prefix}-credits`).value) || 2,
      prof: document.getElementById(`${prefix}-prof`).value.trim(),
      salle: document.getElementById(`${prefix}-salle`).value.trim(),
      schedules: this._scheduleRows.filter((s) => s.jour || s.start || s.end),
      color: { green: hex, blue: hex, light: hex },
    };
  }

  static saveCourse() {
    const course = this._courseFromForm("add");
    const courses = [...getActiveCourses()];
    if (!validateCourse(course, "add", null, courses)) return;
    courses.push(course);
    Storage.saveCustomCourses(courses);
    UI.closeModal("addCourse");
    UI.toast("Cours ajouté.", "success");
    this._afterCoursesChange();
  }

  static updateCourse() {
    const origCode = document.getElementById("edit-code-orig").value;
    const course = this._courseFromForm("edit");
    const courses = [...getActiveCourses()];
    if (!validateCourse(course, "edit", origCode, courses)) return;
    const idx = courses.findIndex((c) => c.code === origCode);
    if (idx === -1) return;
    courses[idx] = course;
    Storage.saveCustomCourses(courses);
    UI.closeModal("editCourse");
    UI.toast("Cours mis à jour.", "success");
    this._afterCoursesChange();
  }

  static deleteCourse(code) {
    UI.confirm({
      message: `Supprimer le cours ${code} ?`,
      title: "Supprimer le cours",
      confirmText: "Supprimer",
      cancelText: "Annuler",
      icon: "trash",
      danger: true,
    }).then((ok) => {
      if (!ok) return;
      Storage.saveCustomCourses(
        getActiveCourses().filter((c) => c.code !== code),
      );
      UI.toast("Cours supprimé.", "info");
      this._afterCoursesChange();
    });
  }

  static resetCourses() {
    UI.confirm({
      message:
        "L'emploi du temps par défaut sera restauré. Vos modifications seront sauvegardées temporairement — vous aurez 30 secondes pour annuler.",
      title: "Réinitialiser",
      confirmText: "Réinitialiser",
      cancelText: "Annuler",
      icon: "warning",
      danger: true,
    }).then((ok) => {
      if (!ok) return;
      Storage.resetCourses();
      this._afterCoursesChange();

      // Toast avec bouton Annuler pendant 30s
      const tc = document.getElementById("toastContainer");
      const el = document.createElement("div");
      el.className = "toast success";
      el.style.minWidth = "320px";
      el.innerHTML = `
      <span class="toast-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      </span>
      <span style="flex:1">Réinitialisé. <strong id="undoCountdown">30</strong>s pour annuler.</span>
      <button class="btn btn-ghost btn-sm" style="margin-left:8px;flex-shrink:0"
        onclick="App._undoReset(this.closest('.toast'))">
        Annuler
      </button>`;
      tc.appendChild(el);

      let seconds = 30;
      const interval = setInterval(() => {
        seconds--;
        const cd = el.querySelector("#undoCountdown");
        if (cd) cd.textContent = seconds;
        if (seconds <= 0) {
          clearInterval(interval);
          // Backup expiré — on le supprime définitivement
          try {
            localStorage.removeItem("upte_courses_backup");
          } catch {}
          el.style.animation = "toast-out .3s ease forwards";
          setTimeout(() => el.remove(), 300);
        }
      }, 1000);

      // Stocker l'interval pour pouvoir l'annuler
      el._interval = interval;
    });
  }

  static _undoReset(toastEl) {
    if (toastEl?._interval) clearInterval(toastEl._interval);
    const restored = Storage.restoreCoursesBackup();
    if (toastEl) {
      toastEl.style.animation = "toast-out .3s ease forwards";
      setTimeout(() => toastEl.remove(), 300);
    }
    if (restored) {
      UI.toast("Emploi du temps restauré.", "success");
      this._afterCoursesChange();
    }
  }

  static _afterCoursesChange() {
    this.populateCourseSelects();
    this._renderSettingsCourseList();
    UI._rerenderAll();
  }

  /* ══════ POPULATE SELECTS ══════ */
  static populateCourseSelects() {
    const opts = getActiveCourses()
      .map((c) => `<option value="${c.code}">${c.code} — ${c.name}</option>`)
      .join("");
    ["studyCourse", "editStudyCourse"].forEach((id) => {
      const el = document.getElementById(id);
      if (el)
        el.innerHTML = `<option value="">-- Sélectionner --</option>` + opts;
    });
  }

  /* ══════ DASHBOARD ══════ */
  static renderDashboard() {
    const now = new Date();
    const todayName = DAYS[now.getDay()];
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const courses = getActiveCourses();

    // Tous les créneaux du jour (un cours peut avoir plusieurs créneaux)
    const todaySlots = [];
    courses.forEach((c) => {
      getSchedulesForDay(c, todayName).forEach((s) => {
        todaySlots.push({ course: c, ...s });
      });
    });
    todaySlots.sort((a, b) => timeToMin(a.start) - timeToMin(b.start));

    // Stats dynamiques
    const allCourses = getActiveCourses();
    const totalUE = allCourses.length;
    const totalCredits = allCourses.reduce(
      (sum, c) => sum + (c.credits || 0),
      0,
    );
    const ueEl = document.getElementById("statTotalUE");
    const crEl = document.getElementById("statTotalCredits");
    const sidebarCrEl = document.getElementById("sidebarCredits");
    const barEl = document.getElementById("creditsBar");
    if (ueEl) ueEl.textContent = totalUE;
    if (crEl) crEl.textContent = totalCredits;
    if (sidebarCrEl) sidebarCrEl.textContent = `${totalCredits} ECTS`;
    if (barEl)
      barEl.style.width = `${Math.min((totalCredits / 30) * 100, 100)}%`;

    document.getElementById("statTodayCount").textContent = todaySlots.length;
    if (todaySlots.length > 0) {
      const next = todaySlots.find((s) => timeToMin(s.start) > nowMin);
      document.getElementById("statTodayNext").innerHTML = next
        ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Prochain: ${next.start}`
        : `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg> Cours terminés`;
    } else {
      document.getElementById("statTodayNext").innerHTML = "";
    }

    const totalHours = todaySlots.reduce(
      (a, s) => a + (timeToMin(s.end) - timeToMin(s.start)) / 60,
      0,
    );
    document.getElementById("statHoursToday").textContent =
      totalHours > 0 ? `${totalHours}h` : "0h";

    const sessions = Storage.getSessions();
    document.getElementById("statStudySessions").textContent = sessions.length;

    // Slots aujourd'hui
    const slotsEl = document.getElementById("todaySlots");
    if (todaySlots.length === 0) {
      slotsEl.innerHTML = `<div class="empty-state"><div class="empty-icon"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></div><div class="empty-title">Pas de cours aujourd'hui</div><div class="empty-sub">Profitez pour réviser !</div></div>`;
    } else {
      slotsEl.innerHTML = todaySlots
        .map(({ course: c, start, end }) => {
          const startMin = timeToMin(start),
            endMin = timeToMin(end);
          const isActive = nowMin >= startMin && nowMin < endMin;
          const isPast = nowMin >= endMin;
          return `<div class="slot ${isActive ? "active" : ""} ${isPast ? "past" : ""}" onclick="App.showCourseDetail('${c.code}')">
          <div class="slot-dot"></div>
          <div class="slot-content">
            <div class="slot-time">${start} – ${end}</div>
            <div class="slot-name">${esc(c.name)}</div>
            <div class="slot-meta"><span class="slot-code">${esc(c.code)}</span>${esc(c.salle)}</div>
          </div>
        </div>`;
        })
        .join("");
    }

    // Sessions à venir
    const ssEl = document.getElementById("studySessionsList");
    const upcoming = sessions
      .filter((s) => s.date >= todayStr())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 4);
    if (upcoming.length === 0) {
      ssEl.innerHTML = `<div class="empty-state"><div class="empty-icon"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></div><div class="empty-title">Aucune session planifiée</div><div class="empty-sub">Planifiez vos révisions !</div></div>`;
    } else {
      ssEl.innerHTML = upcoming
        .map((s) => {
          const c = courseByCode(s.courseCode);
          const color = courseColor(c);
          return `<div class="session-item">
          <div class="session-color" style="background:${color}"></div>
          <div class="session-info">
            <div class="session-name">${esc(c ? c.name : s.courseCode)}</div>
            <div class="session-when">${formatDate(s.date)} · ${s.startTime || ""}${s.startTime ? " · " : ""}${s.duration}h · <span class="tag tag-muted" style="padding:1px 6px">${TYPE_LABELS[s.type] || s.type}</span></div>
          </div>
        </div>`;
        })
        .join("");
    }
  }

  /* ══════ COURSE LIST ══════ */
  static renderCourseList() {
    const el = document.getElementById("courseList");
    el.innerHTML = getActiveCourses()
      .map((c) => {
        const color = courseColor(c);
        const schedules = getCourseSchedules(c);
        const schedStr =
          schedules.length === 0
            ? `<span style="display:inline-flex;align-items:center;gap:4px;color:var(--red)"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Horaire non défini</span>`
            : schedules
                .map(
                  (s) =>
                    `<span style="display:inline-flex;align-items:center;gap:4px"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${esc(s.jour)} ${esc(s.start)}–${esc(s.end)}</span>`,
                )
                .join("");
        return `<div class="course-item" onclick="App.showCourseDetail('${c.code}')">
        <div class="ci-code" style="color:${color};background:${color}20">${esc(c.code)}</div>
        <div class="ci-info">
          <div class="ci-name">${esc(c.name)}</div>
          <div class="ci-meta">
            <span class="ci-cr">${Array(c.credits)
              .fill("")
              .map(
                () =>
                  `<span class="credit-dot" style="background:${color}"></span>`,
              )
              .join("")} ${c.credits} crédit${c.credits > 1 ? "s" : ""}</span>
            ${c.prof ? `<span style="display:inline-flex;align-items:center;gap:4px"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>${esc(c.prof)}</span>` : ""}
            ${schedStr}
          </div>
        </div>
        <div class="ci-actions">
          <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();App.showCourseDetail('${c.code}')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </button>
        </div>
      </div>`;
      })
      .join("");
  }

  /* ══════ SCHEDULE LIST ══════ */
  static renderScheduleList() {
    const courses = getActiveCourses();
    const byDay = {};
    WEEK_DAYS.forEach((d) => (byDay[d] = []));

    // Aplatir tous les créneaux par jour
    courses.forEach((c) => {
      getCourseSchedules(c).forEach((s) => {
        if (byDay[s.jour]) byDay[s.jour].push({ course: c, ...s });
      });
    });

    const el = document.getElementById("scheduleList");
    el.innerHTML = Object.entries(byDay)
      .map(([day, slots]) => {
        if (slots.length === 0)
          return `<div class="card mb-4"><div class="card-header"><div class="card-title">${day}</div><div class="tag tag-muted">Libre</div></div></div>`;
        const sorted = slots.sort(
          (a, b) => timeToMin(a.start) - timeToMin(b.start),
        );
        return `<div class="card mb-4">
        <div class="card-header"><div class="card-title">${day}</div><div class="tag tag-green">${sorted.length} cours</div></div>
        <div class="card-body" style="padding:12px">
          ${sorted
            .map(
              ({ course: c, start, end }) => `
            <div class="slot" onclick="App.showCourseDetail('${c.code}')">
              <div class="slot-dot"></div>
              <div class="slot-content">
                <div class="slot-time">${start} – ${end}</div>
                <div class="slot-name">${esc(c.name)}</div>
                <div class="slot-meta"><span class="slot-code">${esc(c.code)}</span>${esc(c.prof)} · ${esc(c.salle)}</div>
              </div>
              <div class="tag tag-green" style="flex-shrink:0">${c.credits}cr</div>
            </div>`,
            )
            .join("")}
        </div>
      </div>`;
      })
      .join("");
  }

  /* ══════ WEEK GRID ══════ */
  static renderWeekGrid() {
    const container = document.getElementById("weekGridContainer");
    const todayName = DAYS[new Date().getDay()];
    const START_H = 6,
      END_H = 21,
      SLOT_H = 40,
      totalPx = (END_H - START_H) * SLOT_H + 24;
    const courses = getActiveCourses();

    const colCount = WEEK_DAYS.length;
    const minW = 50 + colCount * 110;
    let html = `<div style="display:grid;grid-template-columns:50px repeat(${colCount},1fr);min-width:${minW}px">`;
    html += `<div style="background:var(--bg3);padding:10px 4px;border-bottom:1px solid var(--border);border-right:1px solid var(--border);grid-column:1"></div>`;
    WEEK_DAYS.forEach((d) => {
      html += `<div class="wg-header ${d === todayName ? "today-col" : ""}">${d.slice(0, 3).toUpperCase()}</div>`;
    });
    html += `<div style="display:contents">`;

    // Colonne heures
    html += `<div style="position:relative;height:${totalPx}px;border-right:1px solid var(--border);background:var(--bg3)">`;
    for (let h = START_H; h <= END_H; h++) {
      const top = (h - START_H) * SLOT_H;
      html += `<div style="position:absolute;top:${top}px;right:6px;font-size:9px;color:var(--muted2);transform:translateY(-50%)">${String(h).padStart(2, "0")}h</div>`;
      html += `<div style="position:absolute;top:${top}px;left:0;right:0;border-top:1px solid #00000010"></div>`;
    }
    html += `</div>`;

    // Colonnes jours
    WEEK_DAYS.forEach((day) => {
      const isToday = day === todayName;
      // Tous les créneaux pour ce jour (multi-cours)
      const daySlots = [];
      courses.forEach((c) => {
        getSchedulesForDay(c, day).forEach((s) => {
          daySlots.push({ course: c, ...s });
        });
      });

      html += `<div style="position:relative;height:${totalPx}px;border-right:1px solid var(--border);background:${isToday ? "var(--green-dim)" : ""};min-width:0">`;
      for (let h = START_H; h <= END_H; h++) {
        const top = (h - START_H) * SLOT_H;
        html += `<div style="position:absolute;top:${top}px;left:0;right:0;border-top:1px solid #00000008"></div>`;
      }

      daySlots.forEach(({ course: c, start, end }) => {
        const color = courseColor(c);
        const startMin = timeToMin(start) - START_H * 60;
        const dur = timeToMin(end) - timeToMin(start);
        const top = (startMin / 60) * SLOT_H;
        const height = Math.max((dur / 60) * SLOT_H - 4, 20);
        html += `<div class="wg-event type-cours" style="top:${top}px;height:${height}px;border-left-color:${color}"
          onclick="App.showCourseDetail('${c.code}')" title="${esc(c.name)}">
          <div class="ev-name">${esc(c.code)}</div>
          <div class="ev-time">${start}–${end}</div>
        </div>`;
      });
      html += `</div>`;
    });
    html += `</div></div>`;
    container.innerHTML = html;
  }

  /* ══════ COURSE DETAIL ══════ */
  static currentCourseCode = null;

  static showCourseDetail(code) {
    const c = courseByCode(code);
    if (!c) return;
    App.currentCourseCode = code;
    const color = courseColor(c);
    const schedules = getCourseSchedules(c);
    document.getElementById("cdTitle").textContent = c.name;
    const sessions = Storage.getSessions().filter((s) => s.courseCode === code);

    const schedHtml =
      schedules.length === 0
        ? `<div style="display:flex;align-items:center;gap:6px;color:var(--red);font-size:12px;margin-bottom:12px">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Horaire non encore défini
        </div>`
        : `<div class="form-group"><div class="form-label">HORAIRES</div>${schedules
            .map(
              (s) => `
            <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text);margin-bottom:4px">
              <span style="font-family:'Syne',sans-serif;font-weight:700;font-size:11px;color:${color};background:${color}18;padding:2px 8px;border-radius:4px">${esc(s.jour)}</span>
              ${esc(s.start)} – ${esc(s.end)}
            </div>`,
            )
            .join("")}</div>`;

    document.getElementById("cdBody").innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div class="tip-card" style="padding:12px"><div style="font-size:10px;color:var(--muted);margin-bottom:4px">CODE UE</div><div style="font-family:'Syne',sans-serif;font-weight:700;color:${color}">${esc(c.code)}</div></div>
        <div class="tip-card" style="padding:12px"><div style="font-size:10px;color:var(--muted);margin-bottom:4px">CRÉDITS</div><div style="font-family:'Syne',sans-serif;font-weight:700;color:var(--text)">${c.credits} ECTS</div></div>
      </div>
      ${c.prof ? `<div class="form-group"><div class="form-label">PROFESSEUR</div><div style="font-size:13px;color:var(--text)">${esc(c.prof)}</div></div>` : ""}
      ${schedHtml}
      ${c.salle ? `<div class="form-group"><div class="form-label">SALLE</div><div style="font-size:13px;color:var(--text)">${esc(c.salle)}</div></div>` : ""}
      <div class="divider"></div>
      <div class="form-label">SESSIONS DE RÉVISION (${sessions.length})</div>
      ${
        sessions.length === 0
          ? `<div style="font-size:12px;color:var(--muted);padding:8px 0">Aucune session planifiée pour ce cours.</div>`
          : sessions
              .map(
                (s) => `<div class="session-item" style="margin-bottom:6px">
            <div class="session-color" style="background:${color}"></div>
            <div class="session-info">
              <div class="session-name">${formatDate(s.date)}</div>
              <div class="session-when">${s.duration}h · ${TYPE_LABELS[s.type] || s.type}${s.notes ? " · " + esc(s.notes) : ""}</div>
            </div>
          </div>`,
              )
              .join("")
      }
    `;
    UI.openModal("courseDetail");
  }

  static openAddStudyForCourse(code) {
    const el = document.getElementById("studyCourse");
    if (el) el.value = code || "";
    document.getElementById("studyDate").value = todayStr();
    UI.openModal("addStudy");
  }

  /* ══════ STUDY SESSIONS ══════ */
  static saveStudySession() {
    const course = document.getElementById("studyCourse").value;
    const date = document.getElementById("studyDate").value;
    const duration = document.getElementById("studyDuration").value;
    const startTime = document.getElementById("studyStartTime").value;
    const type = document.getElementById("studyType").value;
    const notes = document.getElementById("studyNotes").value;
    if (
      !validateStudySession(
        { courseCode: course, date, duration, startTime },
        "study",
      )
    )
      return;
    const sessions = Storage.getSessions();
    sessions.push({
      id: uniqueId(),
      courseCode: course,
      date,
      duration: parseFloat(duration),
      startTime,
      type,
      notes,
    });
    Storage.saveSessions(sessions);
    UI.closeModal("addStudy");
    UI.toast("Session planifiée !", "success");
    document.getElementById("studyCourse").value = "";
    document.getElementById("studyNotes").value = "";
    document.getElementById("studyDuration").value = "";
    this.renderDashboard();
    if (UI.currentPage === "planner") this.renderPlanner();
    UI.renderMiniCalendar(date, null);
  }

  static deleteSession(id) {
    UI.confirm({
      message: "Supprimer cette session ?",
      title: "Supprimer",
      confirmText: "Supprimer",
      cancelText: "Annuler",
      icon: "trash",
      danger: true,
    }).then((ok) => {
      if (!ok) return;
      Storage.saveSessions(Storage.getSessions().filter((s) => s.id !== id));
      UI.toast("Session supprimée.", "info");
      this.renderDashboard();
      this.renderPlanner();
    });
  }

  static openEditSession(id) {
    const s = Storage.getSessions().find((s) => s.id === id);
    if (!s) return;
    document.getElementById("editSessionId").value = s.id;
    document.getElementById("editStudyCourse").value = s.courseCode;
    document.getElementById("editStudyDate").value = s.date;
    document.getElementById("editStudyDuration").value = s.duration;
    document.getElementById("editStudyStartTime").value = s.startTime || "";
    document.getElementById("editStudyType").value = s.type;
    document.getElementById("editStudyNotes").value = s.notes || "";
    UI.openModal("editStudy");
  }

  static updateStudySession() {
    const id = document.getElementById("editSessionId").value;
    const courseCode = document.getElementById("editStudyCourse").value;
    const date = document.getElementById("editStudyDate").value;
    const duration = document.getElementById("editStudyDuration").value;
    const startTime = document.getElementById("editStudyStartTime").value;
    if (
      !validateStudySession(
        { courseCode, date, duration, startTime },
        "editStudy",
      )
    )
      return;
    const sessions = Storage.getSessions();
    const idx = sessions.findIndex((s) => s.id === id);
    if (idx === -1) return;
    sessions[idx] = {
      ...sessions[idx],
      courseCode,
      date,
      duration: parseFloat(duration),
      startTime,
      type: document.getElementById("editStudyType").value,
      notes: document.getElementById("editStudyNotes").value,
    };
    Storage.saveSessions(sessions);
    UI.closeModal("editStudy");
    UI.toast("Session mise à jour !", "success");
    this.renderDashboard();
    this.renderPlanner();
  }

  /* ══════ PLANNER ══════ */
  static renderPlanner() {
    const sessions = Storage.getSessions().sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    const el = document.getElementById("plannerSessionsList");
    if (sessions.length === 0) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></div><div class="empty-title">Aucune session de révision</div><div class="empty-sub">Cliquez sur "+ Planifier" pour commencer</div></div>`;
    } else {
      el.innerHTML = sessions
        .map((s) => {
          const c = courseByCode(s.courseCode);
          const color = courseColor(c);
          const tColor = typeColor(TYPE_COLORS[s.type]);
          const isPast = s.date < todayStr();
          return `<div class="session-item">
          <div class="session-color" style="background:${color}"></div>
          <div class="session-info">
            <div class="session-name" style="color:${isPast ? "var(--muted)" : ""}">${esc(c ? c.name : s.courseCode)}</div>
            <div class="session-when">${formatDate(s.date)}${s.startTime ? ` · ${s.startTime}` : ""} · ${s.duration}h · <span style="color:${tColor};font-size:10px;font-weight:600">${TYPE_LABELS[s.type] || s.type}</span>${isPast ? `<span class="tag tag-muted" style="margin-left:4px">Passé</span>` : ""}</div>
            ${s.notes ? `<div style="font-size:11px;color:var(--muted);margin-top:3px;display:flex;align-items:center;gap:4px"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>${esc(s.notes)}</div>` : ""}
          </div>
          <div class="session-actions">
            <button class="icon-btn" onclick="App.openEditSession('${s.id}')" title="Modifier"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></button>
            <button class="icon-btn del" onclick="App.deleteSession('${s.id}')" title="Supprimer"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg></button>
          </div>
        </div>`;
        })
        .join("");
    }

    const statsEl = document.getElementById("plannerStats");
    const byCourse = {};
    sessions.forEach((s) => {
      byCourse[s.courseCode] = (byCourse[s.courseCode] || 0) + s.duration;
    });
    if (Object.keys(byCourse).length === 0) {
      statsEl.innerHTML = `<div style="font-size:12px;color:var(--muted);text-align:center;padding:16px">Pas encore de données</div>`;
    } else {
      const max = Math.max(...Object.values(byCourse));
      statsEl.innerHTML = Object.entries(byCourse)
        .map(([code, hrs]) => {
          const c = courseByCode(code);
          const color = courseColor(c);
          return `<div style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="font-size:11px;color:var(--text)">${esc(c ? c.name : code)}</span>
            <span style="font-size:11px;color:var(--green);font-weight:600">${hrs}h</span>
          </div>
          <div class="bar-track"><div class="bar-fill" style="width:${(hrs / max) * 100}%;background:${color}"></div></div>
        </div>`;
        })
        .join("");
    }
    UI.renderMiniCalendar(todayStr(), null);
  }
}
