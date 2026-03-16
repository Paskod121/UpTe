"use strict";

import { Storage } from "./storage.js";
import { UI } from "./ui.js";
import { COURSES_DATA, DAYS, MONTHS, TYPE_COLORS, TYPE_LABELS } from "./constants.js";
import { timeToMin, formatDate, todayStr, uniqueId, esc, courseByCode, courseColor, typeColor, getActiveCourses } from "./utils.js";
import { validateStudySession, validateCourse, validateSettings, clearErrors } from "./validator.js";

const DAYS_SELECT = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi"];

const COURSE_COLOR_PRESETS = [
  "#16a34a","#15803d","#0d9488","#0891b2","#2563eb","#7c3aed",
  "#db2777","#dc2626","#d97706","#ea580c","#6b7280","#374151",
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
    setTimeout(() => { document.getElementById("creditsBar").style.width = "65%"; }, 500);
  }

  static setupDate() {
    const now = new Date();
    document.getElementById("currentDay").textContent  = DAYS[now.getDay()];
    document.getElementById("currentDate").textContent = `${now.getDate()} ${MONTHS[now.getMonth()]}`;
  }

  /* ══════ SETTINGS — Établissement ══════ */
  static applySettings() {
    const s = Storage.getSettings();
    const topbarSub = document.getElementById("topbarSubtitle");
    const logoSub   = document.getElementById("logoSub");
    if (topbarSub) topbarSub.textContent = `${s.parcours} · ${s.semestre}`;
    if (logoSub)   logoSub.textContent   = `${s.ecole} · ${s.universite}`;
  }

  static renderSettings() {
    /* Remplir le formulaire établissement */
    const s = Storage.getSettings();
    const fields = { "set-universite": s.universite, "set-ecole": s.ecole, "set-parcours": s.parcours, "set-semestre": s.semestre };
    Object.entries(fields).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    });
    /* Rendre la liste des cours */
    this._renderSettingsCourseList();
  }

  static saveSettings() {
    const data = {
      universite: document.getElementById("set-universite").value.trim(),
      ecole:      document.getElementById("set-ecole").value.trim(),
      parcours:   document.getElementById("set-parcours").value.trim(),
      semestre:   document.getElementById("set-semestre").value.trim(),
    };
    if (!validateSettings(data)) return;
    Storage.saveSettings(data);
    this.applySettings();
    UI.toast("Paramètres enregistrés.", "success");
  }

  /* ══════ SETTINGS — CRUD Cours ══════ */
  static _renderSettingsCourseList() {
    const courses = getActiveCourses();
    const el = document.getElementById("settingsCourseList");
    if (!el) return;
    const isCustom = Storage.getCustomCourses() !== null;

    el.innerHTML = courses.map((c) => {
      const color = courseColor(c);
      return `<div class="settings-course-item">
        <div class="sci-color" style="background:${color}"></div>
        <div class="sci-info">
          <span class="sci-code" style="color:${color}">${esc(c.code)}</span>
          <span class="sci-name">${esc(c.name)}</span>
          <span class="sci-meta">${c.credits}cr${c.jour ? ` · ${c.jour} ${c.start}–${c.end}` : ""}</span>
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
    }).join("") || `<div class="empty-state"><div class="empty-title">Aucun cours</div></div>`;

    const resetBtn = document.getElementById("resetCoursesBtn");
    if (resetBtn) resetBtn.style.display = isCustom ? "inline-flex" : "none";
  }

  static openAddCourse() {
    /* Réinitialiser le formulaire */
    ["add-code","add-name","add-prof","add-salle"].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = "";
    });
    document.getElementById("add-credits").value = "3";
    document.getElementById("add-jour").value    = "";
    document.getElementById("add-start").value   = "";
    document.getElementById("add-end").value     = "";
    this._initColorPicker("add-color-picker","add-color-val", COURSE_COLOR_PRESETS[0]);
    UI.openModal("addCourse");
  }

  static openEditCourse(code) {
    const courses = getActiveCourses();
    const c = courses.find(x => x.code === code);
    if (!c) return;
    document.getElementById("edit-code-orig").value = c.code;
    document.getElementById("edit-code").value      = c.code;
    document.getElementById("edit-name").value      = c.name;
    document.getElementById("edit-credits").value   = c.credits;
    document.getElementById("edit-prof").value      = c.prof  || "";
    document.getElementById("edit-salle").value     = c.salle || "";
    document.getElementById("edit-jour").value      = c.jour  || "";
    document.getElementById("edit-start").value     = c.start || "";
    document.getElementById("edit-end").value       = c.end   || "";
    const currentColor = courseColor(c);
    this._initColorPicker("edit-color-picker","edit-color-val", currentColor);
    UI.openModal("editCourse");
  }

  static _initColorPicker(pickerId, inputId, selected) {
    const picker = document.getElementById(pickerId);
    const input  = document.getElementById(inputId);
    if (!picker || !input) return;
    input.value = selected;
    picker.innerHTML = COURSE_COLOR_PRESETS.map(color => `
      <button type="button" class="color-dot ${color === selected ? "active":""}"
        style="background:${color}"
        onclick="App._selectColor('${pickerId}','${inputId}','${color}')">
      </button>`).join("");
  }

  static _selectColor(pickerId, inputId, color) {
    document.getElementById(inputId).value = color;
    const picker = document.getElementById(pickerId);
    picker.querySelectorAll(".color-dot").forEach(d => {
      d.classList.toggle("active", d.style.background === color || d.style.backgroundColor === color);
    });
  }

  static _courseFromForm(prefix) {
    const jour  = document.getElementById(`${prefix}-jour`).value;
    const start = document.getElementById(`${prefix}-start`).value;
    const end   = document.getElementById(`${prefix}-end`).value;
    return {
      code:    document.getElementById(`${prefix}-code`).value.trim().toUpperCase(),
      name:    document.getElementById(`${prefix}-name`).value.trim(),
      credits: parseInt(document.getElementById(`${prefix}-credits`).value) || 2,
      prof:    document.getElementById(`${prefix}-prof`).value.trim(),
      salle:   document.getElementById(`${prefix}-salle`).value.trim(),
      jour:    jour  || null,
      start:   start || null,
      end:     end   || null,
      color: (() => {
        const hex = document.getElementById(`${prefix}-color-val`).value || COURSE_COLOR_PRESETS[0];
        return { green: hex, blue: hex, light: hex };
      })(),
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
    const course   = this._courseFromForm("edit");
    const courses  = [...getActiveCourses()];
    if (!validateCourse(course, "edit", origCode, courses)) return;
    const idx = courses.findIndex(c => c.code === origCode);
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
    }).then(ok => {
      if (!ok) return;
      const courses = getActiveCourses().filter(c => c.code !== code);
      Storage.saveCustomCourses(courses);
      UI.toast("Cours supprimé.", "info");
      this._afterCoursesChange();
    });
  }

  static resetCourses() {
    UI.confirm({
      message: "Remettre l'emploi du temps par défaut ? Toutes vos modifications seront perdues.",
      title: "Réinitialiser",
      confirmText: "Réinitialiser",
      cancelText: "Annuler",
      icon: "warning",
      danger: true,
    }).then(ok => {
      if (!ok) return;
      Storage.resetCourses();
      UI.toast("Emploi du temps réinitialisé.", "info");
      this._afterCoursesChange();
    });
  }

  static _afterCoursesChange() {
    this.populateCourseSelects();
    this._renderSettingsCourseList();
    UI._rerenderAll();
  }

  /* ══════ POPULATE SELECTS ══════ */
  static populateCourseSelects() {
    const opts = getActiveCourses().map((c) => `<option value="${c.code}">${c.code} — ${c.name}</option>`).join("");
    ["studyCourse","editStudyCourse"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = `<option value="">-- Sélectionner --</option>` + opts;
    });
  }

  /* ══════ DASHBOARD ══════ */
  static renderDashboard() {
    const now = new Date();
    const todayName = DAYS[now.getDay()];
    const nowMin    = now.getHours() * 60 + now.getMinutes();
    const courses   = getActiveCourses();
    const todayCourses = courses.filter(c => c.jour === todayName && c.start);

    document.getElementById("statTodayCount").textContent = todayCourses.length;
    if (todayCourses.length > 0) {
      const next = todayCourses.find(c => timeToMin(c.start) > nowMin);
      document.getElementById("statTodayNext").innerHTML = next
        ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Prochain: ${next.start}`
        : `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg> Cours terminés`;
    }
    const totalHours = todayCourses.reduce((a,c) => a + (timeToMin(c.end)-timeToMin(c.start))/60, 0);
    document.getElementById("statHoursToday").textContent = totalHours > 0 ? `${totalHours}h` : "0h";
    const sessions = Storage.getSessions();
    document.getElementById("statStudySessions").textContent = sessions.length;

    const slotsEl = document.getElementById("todaySlots");
    if (todayCourses.length === 0) {
      slotsEl.innerHTML = `<div class="empty-state"><div class="empty-icon"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></div><div class="empty-title">Pas de cours aujourd'hui</div><div class="empty-sub">Profitez pour réviser !</div></div>`;
    } else {
      slotsEl.innerHTML = todayCourses.sort((a,b) => timeToMin(a.start)-timeToMin(b.start)).map(c => {
        const startMin = timeToMin(c.start), endMin = timeToMin(c.end);
        const isActive = nowMin >= startMin && nowMin < endMin;
        const isPast   = nowMin >= endMin;
        return `<div class="slot ${isActive?"active":""} ${isPast?"past":""}" onclick="App.showCourseDetail('${c.code}')">
          <div class="slot-dot"></div>
          <div class="slot-content">
            <div class="slot-time">${c.start} – ${c.end}</div>
            <div class="slot-name">${esc(c.name)}</div>
            <div class="slot-meta"><span class="slot-code">${esc(c.code)}</span>${esc(c.salle)}</div>
          </div>
        </div>`;
      }).join("");
    }

    const ssEl = document.getElementById("studySessionsList");
    const upcoming = sessions.filter(s => s.date >= todayStr()).sort((a,b) => a.date.localeCompare(b.date)).slice(0,4);
    if (upcoming.length === 0) {
      ssEl.innerHTML = `<div class="empty-state"><div class="empty-icon"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></div><div class="empty-title">Aucune session planifiée</div><div class="empty-sub">Planifiez vos révisions !</div></div>`;
    } else {
      ssEl.innerHTML = upcoming.map(s => {
        const c = courseByCode(s.courseCode);
        const color = courseColor(c);
        return `<div class="session-item">
          <div class="session-color" style="background:${color}"></div>
          <div class="session-info">
            <div class="session-name">${esc(c ? c.name : s.courseCode)}</div>
            <div class="session-when">${formatDate(s.date)} · ${s.startTime||""}${s.startTime?" · ":""}${s.duration}h · <span class="tag tag-muted" style="padding:1px 6px">${TYPE_LABELS[s.type]||s.type}</span></div>
          </div>
        </div>`;
      }).join("");
    }
  }

  /* ══════ COURSE LIST ══════ */
  static renderCourseList() {
    const el = document.getElementById("courseList");
    el.innerHTML = getActiveCourses().map(c => {
      const color = courseColor(c);
      return `<div class="course-item" onclick="App.showCourseDetail('${c.code}')">
        <div class="ci-code" style="color:${color};background:${color}20">${esc(c.code)}</div>
        <div class="ci-info">
          <div class="ci-name">${esc(c.name)}</div>
          <div class="ci-meta">
            <span class="ci-cr">
              ${Array(c.credits).fill("").map(()=>`<span class="credit-dot" style="background:${color}"></span>`).join("")}
              ${c.credits} crédit${c.credits>1?"s":""}
            </span>
            ${c.prof ? `<span style="display:inline-flex;align-items:center;gap:4px"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>${esc(c.prof)}</span>` : ""}
            ${c.jour
              ? `<span style="display:inline-flex;align-items:center;gap:4px"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${esc(c.jour)} ${esc(c.start)}–${esc(c.end)}</span>`
              : `<span style="display:inline-flex;align-items:center;gap:4px;color:var(--red)"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Horaire non défini</span>`
            }
          </div>
        </div>
        <div class="ci-actions">
          <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();App.showCourseDetail('${c.code}')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </button>
        </div>
      </div>`;
    }).join("");
  }

  /* ══════ SCHEDULE LIST ══════ */
  static renderScheduleList() {
    const byDay = {};
    DAYS_SELECT.forEach(d => (byDay[d] = []));
    getActiveCourses().filter(c => c.jour).forEach(c => byDay[c.jour] && byDay[c.jour].push(c));
    const el = document.getElementById("scheduleList");
    el.innerHTML = Object.entries(byDay).map(([day,courses]) => {
      if (courses.length === 0)
        return `<div class="card mb-4"><div class="card-header"><div class="card-title">${day}</div><div class="tag tag-muted">Libre</div></div></div>`;
      return `<div class="card mb-4">
        <div class="card-header"><div class="card-title">${day}</div><div class="tag tag-green">${courses.length} cours</div></div>
        <div class="card-body" style="padding:12px">
          ${courses.sort((a,b)=>timeToMin(a.start)-timeToMin(b.start)).map(c=>`
            <div class="slot" onclick="App.showCourseDetail('${c.code}')">
              <div class="slot-dot"></div>
              <div class="slot-content">
                <div class="slot-time">${c.start} – ${c.end}</div>
                <div class="slot-name">${esc(c.name)}</div>
                <div class="slot-meta"><span class="slot-code">${esc(c.code)}</span>${esc(c.prof)} · ${esc(c.salle)}</div>
              </div>
              <div class="tag tag-green" style="flex-shrink:0">${c.credits}cr</div>
            </div>`).join("")}
        </div>
      </div>`;
    }).join("");
  }

  /* ══════ WEEK GRID ══════ */
  static renderWeekGrid() {
    const container = document.getElementById("weekGridContainer");
    const days = DAYS_SELECT;
    const todayName = DAYS[new Date().getDay()];
    const START_H = 7, END_H = 19, SLOT_H = 40, totalPx = (END_H-START_H)*SLOT_H;
    let html = `<div style="display:grid;grid-template-columns:50px repeat(5,1fr);min-width:600px">`;
    html += `<div style="background:var(--bg3);padding:10px 4px;border-bottom:1px solid var(--border);border-right:1px solid var(--border)"></div>`;
    days.forEach(d => {
      html += `<div class="wg-header ${d===todayName?"today-col":""}">${d.slice(0,3).toUpperCase()}</div>`;
    });
    html += `<div style="display:contents">`;
    html += `<div style="position:relative;height:${totalPx}px;border-right:1px solid var(--border);background:var(--bg3)">`;
    for (let h=START_H; h<=END_H; h++) {
      const top = (h-START_H)*SLOT_H;
      html += `<div style="position:absolute;top:${top}px;right:6px;font-size:9px;color:var(--muted2);transform:translateY(-50%)">${String(h).padStart(2,"0")}h</div>`;
      html += `<div style="position:absolute;top:${top}px;left:0;right:0;border-top:1px solid #ffffff0a"></div>`;
    }
    html += `</div>`;
    days.forEach(day => {
      const isToday = day === todayName;
      const dayCourses = getActiveCourses().filter(c => c.jour===day && c.start);
      html += `<div style="position:relative;height:${totalPx}px;border-right:1px solid var(--border);background:${isToday?"var(--green-dim)":""};min-width:0">`;
      for (let h=START_H; h<=END_H; h++) {
        const top=(h-START_H)*SLOT_H;
        html += `<div style="position:absolute;top:${top}px;left:0;right:0;border-top:1px solid #ffffff0a"></div>`;
      }
      dayCourses.forEach(c => {
        const color = courseColor(c);
        const startMin = timeToMin(c.start)-START_H*60;
        const dur = timeToMin(c.end)-timeToMin(c.start);
        const top = (startMin/60)*SLOT_H;
        const height = Math.max((dur/60)*SLOT_H-4, 20);
        html += `<div class="wg-event type-cours" style="top:${top}px;height:${height}px;border-left-color:${color}" onclick="App.showCourseDetail('${c.code}')" title="${esc(c.name)}">
          <div class="ev-name">${esc(c.code)}</div>
          <div class="ev-time">${c.start}–${c.end}</div>
        </div>`;
      });
      html += `</div>`;
    });
    html += `</div></div>`;
    container.innerHTML = html;
  }

  /* ══════ COURSE DETAIL ══════ */
  static showCourseDetail(code) {
    const c = courseByCode(code);
    if (!c) return;
    const color = courseColor(c);
    document.getElementById("cdTitle").textContent = c.name;
    const sessions = Storage.getSessions().filter(s => s.courseCode === code);
    document.getElementById("cdBody").innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div class="tip-card" style="padding:12px"><div style="font-size:10px;color:var(--muted);margin-bottom:4px">CODE UE</div><div style="font-family:'Syne',sans-serif;font-weight:700;color:${color}">${esc(c.code)}</div></div>
        <div class="tip-card" style="padding:12px"><div style="font-size:10px;color:var(--muted);margin-bottom:4px">CRÉDITS</div><div style="font-family:'Syne',sans-serif;font-weight:700;color:var(--text)">${c.credits} ECTS</div></div>
      </div>
      ${c.prof ? `<div class="form-group"><div class="form-label">PROFESSEUR</div><div style="font-size:13px;color:var(--text)">${esc(c.prof)}</div></div>` : ""}
      ${c.jour
        ? `<div class="form-group"><div class="form-label">HORAIRE</div><div style="font-size:13px;color:var(--text)">${esc(c.jour)} · ${esc(c.start)} – ${esc(c.end)}</div></div>`
        : `<div style="display:flex;align-items:center;gap:6px;color:var(--red);font-size:12px;margin-bottom:12px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Horaire non encore défini</div>`
      }
      ${c.salle ? `<div class="form-group"><div class="form-label">SALLE</div><div style="font-size:13px;color:var(--text)">${esc(c.salle)}</div></div>` : ""}
      <div class="divider"></div>
      <div class="form-label">SESSIONS DE RÉVISION (${sessions.length})</div>
      ${sessions.length===0
        ? `<div style="font-size:12px;color:var(--muted);padding:8px 0">Aucune session planifiée pour ce cours.</div>`
        : sessions.map(s=>`<div class="session-item" style="margin-bottom:6px">
            <div class="session-color" style="background:${color}"></div>
            <div class="session-info">
              <div class="session-name">${formatDate(s.date)}</div>
              <div class="session-when">${s.duration}h · ${TYPE_LABELS[s.type]||s.type}${s.notes?" · "+esc(s.notes):""}</div>
            </div>
          </div>`).join("")
      }`;
    UI.openModal("courseDetail");
  }

  /* ══════ STUDY SESSIONS CRUD ══════ */
  static saveStudySession() {
    const course    = document.getElementById("studyCourse").value;
    const date      = document.getElementById("studyDate").value;
    const dur       = document.getElementById("studyDuration").value;
    const startTime = document.getElementById("studyStartTime").value;
    const type      = document.getElementById("studyType").value;
    const notes     = document.getElementById("studyNotes").value;
    if (!validateStudySession({ courseCode: course, date, duration: dur, startTime }, "study")) return;
    const sessions = Storage.getSessions();
    sessions.push({ id: uniqueId(), courseCode: course, date, duration: parseFloat(dur), startTime, type, notes });
    Storage.saveSessions(sessions);
    UI.closeModal("addStudy");
    UI.toast("Session de révision planifiée !", "success");
    document.getElementById("studyCourse").value   = "";
    document.getElementById("studyNotes").value    = "";
    document.getElementById("studyDuration").value = "";
    this.renderDashboard();
    if (UI.currentPage === "planner") this.renderPlanner();
    UI.renderMiniCalendar(date, null);
  }

  static deleteSession(id) {
    UI.confirm({ message:"Supprimer cette session ?", title:"Supprimer la session", confirmText:"Supprimer", cancelText:"Annuler", icon:"trash", danger:true }).then(ok => {
      if (!ok) return;
      Storage.saveSessions(Storage.getSessions().filter(s => s.id !== id));
      UI.toast("Session supprimée.", "info");
      this.renderDashboard();
      this.renderPlanner();
    });
  }

  static openEditSession(id) {
    const s = Storage.getSessions().find(s => s.id === id);
    if (!s) return;
    document.getElementById("editSessionId").value        = s.id;
    document.getElementById("editStudyCourse").value      = s.courseCode;
    document.getElementById("editStudyDate").value        = s.date;
    document.getElementById("editStudyDuration").value    = s.duration;
    document.getElementById("editStudyStartTime").value   = s.startTime || "";
    document.getElementById("editStudyType").value        = s.type;
    document.getElementById("editStudyNotes").value       = s.notes || "";
    UI.openModal("editStudy");
  }

  static updateStudySession() {
    const id        = document.getElementById("editSessionId").value;
    const courseCode = document.getElementById("editStudyCourse").value;
    const date      = document.getElementById("editStudyDate").value;
    const duration  = document.getElementById("editStudyDuration").value;
    const startTime = document.getElementById("editStudyStartTime").value;
    if (!validateStudySession({ courseCode, date, duration, startTime }, "editStudy")) return;
    const sessions = Storage.getSessions();
    const idx = sessions.findIndex(s => s.id === id);
    if (idx === -1) return;
    sessions[idx] = { ...sessions[idx],
      courseCode,
      date,
      duration:   parseFloat(duration),
      startTime,
      type:       document.getElementById("editStudyType").value,
      notes:      document.getElementById("editStudyNotes").value,
    };
    Storage.saveSessions(sessions);
    UI.closeModal("editStudy");
    UI.toast("Session mise à jour !", "success");
    this.renderDashboard();
    this.renderPlanner();
  }

  /* ══════ PLANNER ══════ */
  static renderPlanner() {
    const sessions = Storage.getSessions().sort((a,b) => a.date.localeCompare(b.date));
    const el = document.getElementById("plannerSessionsList");
    if (sessions.length === 0) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></div><div class="empty-title">Aucune session de révision</div><div class="empty-sub">Cliquez sur "+ Planifier" pour commencer</div></div>`;
    } else {
      el.innerHTML = sessions.map(s => {
        const c = courseByCode(s.courseCode);
        const color  = courseColor(c);
        const tColor = typeColor(TYPE_COLORS[s.type]);
        const isPast = s.date < todayStr();
        return `<div class="session-item">
          <div class="session-color" style="background:${color}"></div>
          <div class="session-info">
            <div class="session-name" style="color:${isPast?"var(--muted)":""}">${esc(c?c.name:s.courseCode)}</div>
            <div class="session-when">${formatDate(s.date)}${s.startTime?` · ${s.startTime}`:""} · ${s.duration}h · <span style="color:${tColor};font-size:10px;font-weight:600">${TYPE_LABELS[s.type]||s.type}</span>${isPast?`<span class="tag tag-muted" style="margin-left:4px">Passé</span>`:""}</div>
            ${s.notes?`<div style="font-size:11px;color:var(--muted);margin-top:3px;display:flex;align-items:center;gap:4px"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>${esc(s.notes)}</div>`:""}
          </div>
          <div class="session-actions">
            <button class="icon-btn" onclick="App.openEditSession('${s.id}')" title="Modifier"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></button>
            <button class="icon-btn del" onclick="App.deleteSession('${s.id}')" title="Supprimer"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg></button>
          </div>
        </div>`;
      }).join("");
    }
    const statsEl = document.getElementById("plannerStats");
    const byCourse = {};
    sessions.forEach(s => { byCourse[s.courseCode] = (byCourse[s.courseCode]||0) + s.duration; });
    if (Object.keys(byCourse).length === 0) {
      statsEl.innerHTML = `<div style="font-size:12px;color:var(--muted);text-align:center;padding:16px">Pas encore de données</div>`;
    } else {
      const max = Math.max(...Object.values(byCourse));
      statsEl.innerHTML = Object.entries(byCourse).map(([code,hrs]) => {
        const c = courseByCode(code);
        const color = courseColor(c);
        return `<div style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="font-size:11px;color:var(--text)">${esc(c?c.name:code)}</span>
            <span style="font-size:11px;color:var(--green);font-weight:600">${hrs}h</span>
          </div>
          <div class="bar-track"><div class="bar-fill" style="width:${(hrs/max)*100}%;background:${color}"></div></div>
        </div>`;
      }).join("");
    }
    UI.renderMiniCalendar(todayStr(), null);
  }
}