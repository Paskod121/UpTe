"use strict";

import { Storage } from "./storage.js";
import { esc } from "./utils.js";
import { MONTHS } from "./constants.js";

const THEME_KEY = "upte_theme";
const THEMES = [
  { id: "green", label: "Vert" },
  { id: "blue", label: "Bleu" },
  { id: "light", label: "Clair" },
  { id: "rose", label: "Rose" },
];

const THEME_META = {
  light: "#ffffff",
  blue: "#0a1628",
  green: "#111510",
  rose: "#0f080b",
};

export class UI {
  static currentPage = "dashboard";
  static calYear = new Date().getFullYear();
  static calMonth = new Date().getMonth();
  static _themeChanging = false;

  static getStoredTheme() {
    try {
      const t = localStorage.getItem(THEME_KEY);
      return THEMES.some((x) => x.id === t) ? t : "light";
    } catch {
      return "light";
    }
  }

  static setStoredTheme(themeId) {
    try {
      localStorage.setItem(THEME_KEY, themeId);
    } catch {}
  }

  static applyTheme(themeId) {
    const doc = document.documentElement;
    const id = THEMES.some((x) => x.id === themeId) ? themeId : "green";
    if (id === "green") {
      doc.removeAttribute("data-theme");
    } else {
      doc.setAttribute("data-theme", id);
    }
    const badge = document.getElementById("themeBadge");
    if (badge) {
      const theme = THEMES.find((x) => x.id === id);
      badge.textContent = theme ? theme.label : "Vert";
    }
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.content = THEME_META[id] ?? "#111510";
  }

  static cycleTheme() {
    if (this._themeChanging) return;
    this._themeChanging = true;

    const current = this.getStoredTheme();
    const idx = THEMES.findIndex((x) => x.id === current);
    const next = THEMES[(idx + 1) % THEMES.length];
    this.setStoredTheme(next.id);
    this.applyTheme(next.id);
    this._rerenderAll();
    this._themeChanging = false;
  }
  static _rerenderAll() {
    const page = this.currentPage;
    if (window.App) {
      window.App.renderCourseList();
      window.App.renderScheduleList();
      window.App.renderWeekGrid();
      window.App.renderDashboard();
      if (page === "planner") window.App.renderPlanner();
      if (page === "settings") window.App.renderSettings();
      if (page === "learn" && window.Learn) window.Learn.render();
      if (page === "notes" && window.Notes) window.Notes.render();
    }
    if (page === "tips") this.renderTips();
    this.renderMiniCalendar(null, null);
  }

  static navigate(page) {
    const current = document.querySelector(".page.active");
    if (current) {
      current.style.animation = "none";
      current.style.opacity = "0";
      current.style.transform = "scale(0.98)";
      current.style.transition = "opacity 0.1s ease, transform 0.1s ease";
    }
    document
      .querySelectorAll(".nav-item")
      .forEach((n) => n.classList.remove("active"));

    setTimeout(() => {
      document.querySelectorAll(".page").forEach((p) => {
        p.classList.remove("active");
        p.style.cssText = "";
      });
      const el = document.getElementById("page-" + page);
      if (el) el.classList.add("active");
    }, 100);

    document.querySelectorAll(".nav-item").forEach((n) => {
      if (
        n.getAttribute("onclick") &&
        n.getAttribute("onclick").includes("'" + page + "'")
      )
        n.classList.add("active");
    });
    this.currentPage = page;
    const titles = {
      dashboard: "Tableau de bord",
      schedule: "Emploi du temps",
      courses: "Mes cours",
      planner: "Planificateur",
      tips: "Conseils de révision",
      settings: "Paramètres",
      learn: "Espace d'apprentissage",
      notes: "Prise de notes",
    };
    document.getElementById("pageTitle").textContent = titles[page] || page;
    this.closeSidebar();
    if (page === "planner") window.App.renderPlanner();
    if (page === "schedule") window.App.renderWeekGrid();
    if (page === "tips") this.renderTips();
    if (page === "dashboard") window.App.renderDashboard();
    if (page === "settings") window.App.renderSettings();
    if (page === "learn") window.Learn.render();
    if (page === "notes") window.Notes.render();
  }

  static openModal(id) {
    document.getElementById("modal-" + id).classList.add("open");
  }
  static closeModal(id) {
    document.getElementById("modal-" + id).classList.remove("open");
  }

  static CONFIRM_ICONS = {
    trash: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,
    warning: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  };

  static confirm(opts = {}) {
    const overlay = document.getElementById("confirmOverlay");
    const modal = overlay.querySelector(".confirm-modal");
    const iconEl = document.getElementById("confirmIcon");
    const titleEl = document.getElementById("confirmTitle");
    const messageEl = document.getElementById("confirmMessage");
    const btnCancel = document.getElementById("confirmCancel");
    const btnOk = document.getElementById("confirmOk");

    const message = opts.message ?? "Confirmer cette action ?";
    const title = opts.title ?? "Confirmer";
    const confirmText = opts.confirmText ?? "OK";
    const cancelText = opts.cancelText ?? "Annuler";
    const icon =
      opts.icon && this.CONFIRM_ICONS[opts.icon] ? opts.icon : "info";
    const danger = !!opts.danger;

    iconEl.innerHTML = this.CONFIRM_ICONS[icon];
    titleEl.textContent = title;
    messageEl.textContent = message;
    btnCancel.textContent = cancelText;
    btnOk.textContent = confirmText;
    modal.classList.toggle("danger", danger);

    return new Promise((resolve) => {
      const finish = (value) => {
        overlay.classList.remove("open");
        btnCancel.onclick = null;
        btnOk.onclick = null;
        overlay.onclick = null;
        resolve(value);
      };
      btnCancel.onclick = () => finish(false);
      btnOk.onclick = () => finish(true);
      overlay.onclick = (e) => {
        if (e.target === overlay) finish(false);
      };
      modal.onclick = (e) => e.stopPropagation();
      overlay.classList.add("open");
    });
  }

  static toggleSidebar() {
    document.getElementById("sidebar").classList.toggle("open");
    document.getElementById("sidebarOverlay").classList.toggle("open");
  }
  static closeSidebar() {
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("sidebarOverlay").classList.remove("open");
  }

  static switchTab(section, tab) {
    const panels = document.querySelectorAll(`#page-${section} .tab-panel`);
    const tabs = document.querySelectorAll(`#page-${section} .tab`);
    panels.forEach((p) => p.classList.remove("active"));
    tabs.forEach((t) => t.classList.remove("active"));
    const panel = document.getElementById(`${section}-${tab}`);
    if (panel) panel.classList.add("active");
    tabs.forEach((t) => {
      if (
        t.getAttribute("onclick") &&
        t.getAttribute("onclick").includes(`'${tab}'`)
      )
        t.classList.add("active");
    });
  }

  static toast(msg, type = "success") {
    const icons = {
      success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
      error: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
      info: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    };
    const tc = document.getElementById("toastContainer");
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span>${esc(msg)}</span>`;
    tc.appendChild(el);
    setTimeout(() => {
      el.style.animation = "toast-out .3s ease forwards";
      setTimeout(() => el.remove(), 300);
    }, 3000);
  }

  static renderTips() {
    const tips = [
      {
        icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5"/><path d="M9 3h6"/><path d="M19.07 4.93l-1.41 1.41"/></svg>`,
        title: "Méthode Pomodoro",
        text: "Travaillez 25 minutes intensément, puis 5 min de pause. Après 4 cycles, prenez 15–30 min. Idéal pour les UEs techniques comme Structure de Données et Modélisation UML.",
      },
      {
        icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>`,
        title: "Planifiez vos révisions à l'avance",
        text: "Commencez les révisions 3 semaines avant les examens. Priorisez INF1426 (4 crédits) et INF1429 (4 crédits) qui ont le plus de poids.",
      },
      {
        icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`,
        title: "Répétition espacée",
        text: "Révisez un sujet le lendemain, puis dans 3 jours, puis dans 7 jours. Cette méthode maximise la rétention à long terme pour des UEs comme l'Administration BDD.",
      },
      {
        icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/></svg>`,
        title: "Priorisez selon les crédits",
        text: "INF1426 (4cr) et INF1429 (4cr) méritent le plus de temps. Ensuite INF1425, INF1427, INF1421, INF1428 (3cr chacun). Les UEs à 2cr peuvent être traitées plus rapidement.",
      },
      {
        icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>`,
        title: "Fiches de synthèse",
        text: "Après chaque cours, rédigez une fiche d'1 page résumant les points clés. Pour INF1425 (Sécurité Informatique), listez les menaces, protocoles et contre-mesures.",
      },
      {
        icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
        title: "Groupes d'étude",
        text: "Formez des groupes de 3–4 personnes pour les cours difficiles. Les explications entre pairs renforcent la compréhension, notamment pour UML et le développement d'applications.",
      },
      {
        icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><polyline points="8 21 12 17 16 21"/><polyline points="7 8 10 11 13 8 16 12"/></svg>`,
        title: "Pratiquez régulièrement",
        text: "Pour les UEs pratiques (Linux, Windows, Dev bureau), pratiquez en dehors des cours. Installez une VM, exercez-vous sur les commandes Linux après chaque cours avec Dr TEPE.",
      },
      {
        icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><line x1="12" y1="7" x2="5" y2="17"/><line x1="12" y1="7" x2="19" y2="17"/><line x1="5" y1="19" x2="19" y2="19"/></svg>`,
        title: "Utilisez des schémas",
        text: "Modélisation UML et Normes Documentaires se prêtent très bien aux diagrammes et mind maps. Visualisez les concepts plutôt que de mémoriser du texte brut.",
      },
      {
        icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>`,
        title: "Respectez les créneaux libres",
        text: "Lundi matin jusqu'à 7h30, mercredi matin, jeudi matin et vendredi matin sont des créneaux idéaux pour des révisions personnelles calmes avant les cours.",
      },
      {
        icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
        title: "Gérez votre bien-être",
        text: "Dormez 7–8h minimum, mangez équilibré et faites de l'exercice. Un esprit reposé assimile 40% mieux l'information. Ne sacrifiez pas votre santé pour les examens.",
      },
    ];
    const html = tips
      .map(
        (t) => `
      <div class="tip-card">
        <div class="tip-icon">${t.icon}</div>
        <div class="tip-title">${esc(t.title)}</div>
        <div class="tip-text">${esc(t.text)}</div>
      </div>`,
      )
      .join("");
    document.getElementById("tipsContent").innerHTML = `
      <div class="section-header mb-4">
      <div class="section-title">Stratégies pour réussir — ${Storage.getSettings().parcours}</div>
        <div class="tag tag-green">10 conseils</div>
      </div>
      <div class="tips-columns">${html}</div>`;
  }

  static renderMiniCalendar(selectedDate, onSelect) {
    const container = document.getElementById("miniCalendar");
    const year = this.calYear,
      month = this.calMonth;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const sessions = Storage.getSessions();
    const sessionDates = new Set(sessions.map((s) => s.date));

    let html = `
      <div class="cm-header">
        <button class="icon-btn" onclick="UI.calPrev()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></button>
        <span class="cm-month">${MONTHS[month]} ${year}</span>
        <button class="icon-btn" onclick="UI.calNext()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></button>
      </div>
      <div class="cm-days">
        ${["L", "M", "M", "J", "V", "S", "D"].map((d) => `<div class="cm-day-label">${d}</div>`).join("")}`;

    const offset = (firstDay + 6) % 7;
    for (let i = 0; i < offset; i++)
      html += `<div class="cm-day other-month"></div>`;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isToday =
        today.getFullYear() === year &&
        today.getMonth() === month &&
        today.getDate() === d;
      const isSel = selectedDate === dateStr;
      const hasEv = sessionDates.has(dateStr);
      html += `<div class="cm-day ${isToday ? "today" : ""} ${isSel && !isToday ? "selected" : ""} ${hasEv ? "has-event" : ""}" onclick="UI.selectCalDay('${dateStr}')">${d}</div>`;
    }
    html += `</div>`;
    container.innerHTML = html;
  }

  static calPrev() {
    this.calMonth--;
    if (this.calMonth < 0) {
      this.calMonth = 11;
      this.calYear--;
    }
    this.renderMiniCalendar(null, null);
  }
  static calNext() {
    this.calMonth++;
    if (this.calMonth > 11) {
      this.calMonth = 0;
      this.calYear++;
    }
    this.renderMiniCalendar(null, null);
  }
  static selectCalDay(date) {
    this.renderMiniCalendar(date, null);
  }

  static toggleFullscreen() {
    const icon = document.getElementById("fsIcon");
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      if (icon)
        icon.innerHTML = `
        <polyline points="4 14 10 14 10 20"/>
        <polyline points="20 10 14 10 14 4"/>
        <line x1="10" y1="14" x2="3" y2="21"/>
        <line x1="21" y1="3" x2="14" y2="10"/>`;
    } else {
      document.exitFullscreen();
      if (icon)
        icon.innerHTML = `
        <polyline points="15 3 21 3 21 9"/>
        <polyline points="9 21 3 21 3 15"/>
        <line x1="21" y1="3" x2="14" y2="10"/>
        <line x1="3" y1="21" x2="10" y2="14"/>`;
    }
  }
}
