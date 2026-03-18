"use strict";

import { getActiveCourses, esc, courseColor, courseByCode } from "./utils.js";

/* ══════════════════════════════════════════════
   INDEXEDDB — Documents
══════════════════════════════════════════════ */
class DocDB {
  static DB_NAME = "upte_docs";
  static DB_VERSION = 1;
  static STORE = "documents";
  static _db = null;

  static open() {
    return new Promise((resolve, reject) => {
      if (this._db) {
        resolve(this._db);
        return;
      }
      const req = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.STORE))
          db.createObjectStore(this.STORE, { keyPath: "id" });
      };
      req.onsuccess = (e) => {
        this._db = e.target.result;
        resolve(this._db);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  static async saveDoc(courseCode, file) {
    const db = await this.open();
    const buffer = await file.arrayBuffer();
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const ext = file.name.split(".").pop().toLowerCase();
    const type = { pdf: "pdf", docx: "docx", pptx: "pptx" }[ext] || "other";
    const doc = {
      id,
      courseCode,
      name: file.name,
      type,
      size: file.size,
      date: new Date().toISOString().split("T")[0],
      data: buffer,
    };
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE, "readwrite");
      tx.objectStore(this.STORE).put(doc);
      tx.oncomplete = () => resolve(id);
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  static async getDocs(courseCode) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE, "readonly");
      const req = tx.objectStore(this.STORE).getAll();
      req.onsuccess = () =>
        resolve(
          req.result
            .filter((d) => d.courseCode === courseCode)
            .map(({ data, ...meta }) => meta)
            .sort((a, b) => b.date.localeCompare(a.date)),
        );
      req.onerror = (e) => reject(e.target.error);
    });
  }

  static async getAllMeta() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE, "readonly");
      const req = tx.objectStore(this.STORE).getAll();
      req.onsuccess = () => resolve(req.result.map(({ data, ...m }) => m));
      req.onerror = (e) => reject(e.target.error);
    });
  }

  static async getDocFull(id) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE, "readonly");
      const req = tx.objectStore(this.STORE).get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  static async deleteDoc(id) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE, "readwrite");
      tx.objectStore(this.STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  }
}

/* ══════════════════════════════════════════════
   POMODORO
══════════════════════════════════════════════ */
const MODES = {
  work: { label: "Travail", min: 25, color: "var(--green)", key: "work" },
  shortBreak: {
    label: "Pause courte",
    min: 5,
    color: "var(--orange)",
    key: "shortBreak",
  },
  longBreak: {
    label: "Grande pause",
    min: 15,
    color: "#818cf8",
    key: "longBreak",
  },
};

const MSG_WORK = [
  "Concentré.",
  "Un seul objectif.",
  "Coupe les distractions.",
  "Tu y es presque.",
  "Reste dans ta zone.",
  "25 minutes. Pas une de plus.",
  "Éteins le téléphone.",
  "C'est maintenant.",
];
const MSG_BREAK = [
  "Lève-toi.",
  "Bois de l'eau.",
  "Ferme les yeux.",
  "Respire lentement.",
  "Regarde au loin.",
  "Tu l'as mérité.",
  "Étire-toi.",
  "Décroche.",
];

class Pomodoro {
  constructor() {
    this.mode = "work";
    this.timeLeft = MODES.work.min * 60;
    this.running = false;
    this._interval = null;
    this.round = 0;
    this.total = parseInt(localStorage.getItem("upte_pomo_total") || "0");
    this.msg = MSG_WORK[0];
  }

  toggle() {
    this.running ? this.pause() : this.start();
  }
  start() {
    if (this.running) return;
    this.running = true;
    this._interval = setInterval(() => this._tick(), 1000);
    this._render();
  }
  pause() {
    this.running = false;
    clearInterval(this._interval);
    this._render();
  }
  reset() {
    this.running = false;
    clearInterval(this._interval);
    this.timeLeft = MODES[this.mode].min * 60;
    this._render();
  }
  skip() {
    this.running = false;
    clearInterval(this._interval);
    this._complete();
  }

  setMode(mode) {
    this.running = false;
    clearInterval(this._interval);
    this.mode = mode;
    this.timeLeft = MODES[mode].min * 60;
    this._pickMsg();
    this._render();
  }

  _tick() {
    this.timeLeft--;
    if (this.timeLeft <= 0) this._complete();
    else this._render();
  }

  _complete() {
    this.running = false;
    clearInterval(this._interval);
    this._beep();
    if (this.mode === "work") {
      this.round++;
      this.total++;
      localStorage.setItem("upte_pomo_total", this.total);
      this.setMode(this.round % 4 === 0 ? "longBreak" : "shortBreak");
    } else {
      this.setMode("work");
    }
  }

  _beep() {
    try {
      const ctx = new AudioContext();
      const play = (freq, t, dur) => {
        const o = ctx.createOscillator(),
          g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.frequency.value = freq;
        o.type = "sine";
        g.gain.setValueAtTime(0.25, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.start(t);
        o.stop(t + dur);
      };
      play(660, ctx.currentTime, 0.3);
      play(880, ctx.currentTime + 0.2, 0.3);
      play(1100, ctx.currentTime + 0.4, 0.4);
    } catch {}
  }

  _pickMsg() {
    const pool = this.mode === "work" ? MSG_WORK : MSG_BREAK;
    this.msg = pool[Math.floor(Math.random() * pool.length)];
  }

  _fmt() {
    const m = Math.floor(this.timeLeft / 60),
      s = this.timeLeft % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  _progress() {
    return 1 - this.timeLeft / (MODES[this.mode].min * 60);
  }

  _render() {
    const el = document.getElementById("pomodoroWidget");
    if (!el) return;
    const m = MODES[this.mode],
      prog = this._progress(),
      R = 88,
      C = 2 * Math.PI * R;
    const dot = Array(4)
      .fill(0)
      .map(
        (_, i) =>
          `<div class="pomo-dot ${i < this.round % 4 ? "filled" : ""}"></div>`,
      )
      .join("");
    const workedH = Math.floor((this.total * 25) / 60),
      workedM = (this.total * 25) % 60;

    el.innerHTML = `
      <div class="pomo-modes">
        ${Object.values(MODES)
          .map(
            (md) => `
          <button class="pomo-mode-btn ${this.mode === md.key ? "active" : ""}"
            onclick="Learn.pomo.setMode('${md.key}')"
            style="${this.mode === md.key ? `color:${md.color};border-color:${md.color};background:${md.color}18` : ""}">
            ${md.label}
          </button>`,
          )
          .join("")}
      </div>
      <div class="pomo-ring-wrap">
        <svg class="pomo-ring" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <circle cx="100" cy="100" r="${R}" fill="none" stroke="var(--border)" stroke-width="10"/>
          <circle cx="100" cy="100" r="${R}" fill="none"
            stroke="${m.color}" stroke-width="10" stroke-linecap="round"
            stroke-dasharray="${C.toFixed(2)}"
            stroke-dashoffset="${(C * (1 - prog)).toFixed(2)}"
            transform="rotate(-90 100 100)"
            style="transition:stroke-dashoffset 0.85s linear,stroke .3s"/>
        </svg>
        <div class="pomo-center">
          <div class="pomo-time" style="color:${m.color}">${this._fmt()}</div>
          <div class="pomo-label">${m.label}</div>
        </div>
      </div>
      <div class="pomo-msg">${this.msg}</div>
      <div class="pomo-dots">${dot}</div>
      <div class="pomo-controls">
        <button class="pomo-btn pomo-secondary" onclick="Learn.pomo.reset()" title="Réinitialiser">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/>
          </svg>
        </button>
        <button class="pomo-btn pomo-primary" onclick="Learn.pomo.toggle()"
          style="background:${m.color}22;border-color:${m.color};color:${m.color}">
          ${
            this.running
              ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`
              : `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`
          }
          <span>${this.running ? "Pause" : "Démarrer"}</span>
        </button>
        <button class="pomo-btn pomo-secondary" onclick="Learn.pomo.skip()" title="Passer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>
          </svg>
        </button>
      </div>
      <div class="pomo-stats-row">
        <div class="pomo-stat"><div class="pomo-stat-n">${this.round % 4}</div><div class="pomo-stat-l">Session</div></div>
        <div class="pomo-stat-sep"></div>
        <div class="pomo-stat"><div class="pomo-stat-n">${this.total}</div><div class="pomo-stat-l">Total</div></div>
        <div class="pomo-stat-sep"></div>
        <div class="pomo-stat"><div class="pomo-stat-n">${workedH}h${String(workedM).padStart(2, "0")}</div><div class="pomo-stat-l">Travaillées</div></div>
      </div>`;
  }
}

/* ══════════════════════════════════════════════
   VIEWER — PDF (premium, auto-hide nav, zoom, clavier)
══════════════════════════════════════════════ */
async function renderPDF(buffer, container) {
  if (!window.pdfjsLib) {
    await new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.6.347/pdf.min.js";
      s.onload = res;
      s.onerror = rej;
      document.head.appendChild(s);
    });
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.6.347/pdf.worker.min.js";
  }

  container.innerHTML = `<div class="doc-loading"><div class="doc-spinner"></div><span>Chargement…</span></div>`;

  try {
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    const totalPages = pdf.numPages;
    let currentPage = 1;
    let scale = 1.5;
    let navTimer = null;

    // ─── Wrapper principal ───
    const wrap = document.createElement("div");
    wrap.className = "doc-pdf-wrap";

    // ─── Barre de navigation (auto-hide) ───
    const nav = document.createElement("div");
    nav.className = "doc-pdf-nav doc-pdf-nav--hidden";
    nav.id = "pdfNav";

    // ─── Zone canvas ───
    const canvasWrap = document.createElement("div");
    canvasWrap.className = "doc-canvas-wrap";
    canvasWrap.id = "pdfCanvasWrap";

    // ─── Indicateur de page (toujours visible, petit, bas) ───
    const pageIndicator = document.createElement("div");
    pageIndicator.className = "pdf-page-indicator";
    pageIndicator.id = "pdfPageIndicator";

    wrap.appendChild(nav);
    wrap.appendChild(canvasWrap);
    wrap.appendChild(pageIndicator);
    container.innerHTML = "";
    container.appendChild(wrap);

    // ─── Rendu d'une page ───
    const renderPage = async (num) => {
      const page = await pdf.getPage(num);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.className = "pdf-canvas";
      canvas.style.maxWidth = "100%";
      await page.render({ canvasContext: canvas.getContext("2d"), viewport })
        .promise;
      return canvas;
    };

    // ─── Mise à jour de la nav ───
    const updateNav = () => {
      nav.innerHTML = `
        <button class="pdf-nav-btn" id="pdfPrev" ${currentPage <= 1 ? "disabled" : ""} onclick="window._pdfPrev()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span class="pdf-nav-label">
          <strong>${currentPage}</strong><span class="pdf-nav-sep">/</span>${totalPages}
        </span>
        <button class="pdf-nav-btn" id="pdfNext" ${currentPage >= totalPages ? "disabled" : ""} onclick="window._pdfNext()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>`;
      pageIndicator.textContent = `${currentPage} / ${totalPages}`;
    };

    // ─── Afficher/masquer nav ───
    const showNav = () => {
      nav.classList.remove("doc-pdf-nav--hidden");
      clearTimeout(navTimer);
      navTimer = setTimeout(
        () => nav.classList.add("doc-pdf-nav--hidden"),
        2200,
      );
    };

    // ─── Afficher une page ───
    const showPage = async (num) => {
      canvasWrap.innerHTML = `<div class="doc-loading"><div class="doc-spinner"></div></div>`;
      const canvas = await renderPage(num);
      canvasWrap.innerHTML = "";
      canvasWrap.appendChild(canvas);
      updateNav();
    };

    // ─── Navigation globale ───
    window._pdfPrev = async () => {
      if (currentPage > 1) {
        currentPage--;
        await showPage(currentPage);
        showNav();
      }
    };
    window._pdfNext = async () => {
      if (currentPage < totalPages) {
        currentPage++;
        await showPage(currentPage);
        showNav();
      }
    };

    // ─── Interactions souris/touch sur la zone canvas ───
    canvasWrap.addEventListener("click", showNav);
    canvasWrap.addEventListener("touchstart", showNav, { passive: true });
    canvasWrap.addEventListener("mousemove", showNav);

    // ─── Zoom trackpad / pinch (wheel avec ctrlKey) ───
    canvasWrap.addEventListener(
      "wheel",
      async (e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          const delta = e.deltaY > 0 ? -0.1 : 0.1;
          scale = Math.max(0.5, Math.min(4, scale + delta));
          await showPage(currentPage);
        }
      },
      { passive: false },
    );

    // ─── Clavier ───
    const onKey = async (e) => {
      if (
        !document.getElementById("docViewerOverlay")?.classList.contains("open")
      )
        return;
      if (
        e.key === "ArrowRight" ||
        e.key === "ArrowDown" ||
        e.key === "PageDown"
      ) {
        e.preventDefault();
        await window._pdfNext();
      } else if (
        e.key === "ArrowLeft" ||
        e.key === "ArrowUp" ||
        e.key === "PageUp"
      ) {
        e.preventDefault();
        await window._pdfPrev();
      } else if (e.key === "+" || e.key === "=") {
        scale = Math.min(4, scale + 0.2);
        await showPage(currentPage);
      } else if (e.key === "-") {
        scale = Math.max(0.5, scale - 0.2);
        await showPage(currentPage);
      } else if (e.key === "Escape") {
        Learn.closeViewer();
      }
    };
    document.addEventListener("keydown", onKey);
    window._pdfCleanup = () => document.removeEventListener("keydown", onKey);

    await showPage(1);
    showNav();
  } catch {
    container.innerHTML = `<div class="doc-error"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><span>Erreur de lecture du PDF.</span></div>`;
  }
}

/* ══════════════════════════════════════════════
   VIEWER — DOCX
══════════════════════════════════════════════ */
async function renderDOCX(buffer, container) {
  if (!window.mammoth) {
    await new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src =
        "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.11.0/mammoth.browser.min.js";
      s.onload = res;
      s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  container.innerHTML = `<div class="doc-loading"><div class="doc-spinner"></div><span>Conversion du document…</span></div>`;

  try {
    const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
    const wrap = document.createElement("div");
    wrap.className = "doc-docx-content";
    wrap.innerHTML = result.value;
    container.innerHTML = "";
    container.appendChild(wrap);
  } catch {
    container.innerHTML = `<div class="doc-error"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><span>Erreur de lecture du document.</span></div>`;
  }
}

/* ══════════════════════════════════════════════
   VIEWER — PPTX (téléchargement direct + aperçu titre)
   Pas d'extraction de texte — les images et la mise
   en page ne peuvent pas être reproduites fidèlement.
══════════════════════════════════════════════ */
async function renderPPTX(buffer, name, container) {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  });
  const blobUrl = URL.createObjectURL(blob);

  container.innerHTML = `
    <div class="pptx-preview-wrap">
      <div class="pptx-preview-icon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" stroke-width="1.2" stroke-linecap="round">
          <rect x="2" y="3" width="20" height="14" rx="2"/>
          <polyline points="8 21 12 17 16 21"/>
          <line x1="8" y1="9" x2="16" y2="9"/>
          <line x1="8" y1="12" x2="13" y2="12"/>
        </svg>
      </div>
      <div class="pptx-preview-name">${esc(name)}</div>
      <p class="pptx-preview-info">
        Les présentations contiennent des images et une mise en page visuelle qui ne peuvent pas être reproduites dans le navigateur.<br/>
        Télécharge le fichier pour l'ouvrir dans PowerPoint, LibreOffice ou Google Slides.
      </p>
      <a href="${blobUrl}" download="${esc(name)}" class="btn btn-primary pptx-download-btn">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Télécharger la présentation
      </a>
      <div class="pptx-preview-apps">
        <span class="pptx-app-hint">Compatible avec</span>
        <span class="pptx-app-badge">PowerPoint</span>
        <span class="pptx-app-badge">LibreOffice</span>
        <span class="pptx-app-badge">Google Slides</span>
      </div>
    </div>`;
}

/* ══════════════════════════════════════════════
   LEARN — Module principal
══════════════════════════════════════════════ */
export class Learn {
  static pomo = new Pomodoro();
  static activeCourse = null;
  static _docCountCache = {};

  static init() {
    this._loadDocCounts();
  }

  static async render() {
    const courses = getActiveCourses();
    this.activeCourse = this.activeCourse || (courses[0]?.code ?? null);
    const docsEl = document.getElementById("learnDocsPanel");
    const pomoEl = document.getElementById("pomodoroWidget");
    if (!docsEl || !pomoEl) return;
    this.pomo._render();
    await this._renderDocs();
  }

  static async _renderDocs() {
    const courses = getActiveCourses();
    const panel = document.getElementById("learnDocsPanel");
    if (!panel) return;
    panel.innerHTML = `
      <div class="docs-course-selector">
        <label class="form-label">Unité d'enseignement</label>
        <select class="form-select" id="docsCourseSelect" onchange="Learn.selectCourse(this.value)">
          ${courses.map((c) => `<option value="${c.code}" ${c.code === this.activeCourse ? "selected" : ""}>${esc(c.code)} — ${esc(c.name)}</option>`).join("")}
        </select>
      </div>
      <div id="docsListWrap"></div>`;
    await this._renderDocList();
  }

  static async _renderDocList() {
    const wrap = document.getElementById("docsListWrap");
    if (!wrap || !this.activeCourse) return;
    wrap.innerHTML = `<div class="doc-loading" style="padding:20px 0"><div class="doc-spinner"></div></div>`;

    const c = courseByCode(this.activeCourse);
    const docs = await DocDB.getDocs(this.activeCourse);
    const color = courseColor(c);

    const fmtSize = (b) =>
      b > 1024 * 1024
        ? `${(b / 1024 / 1024).toFixed(1)} Mo`
        : `${(b / 1024).toFixed(0)} Ko`;

    const typeIcon = (type) =>
      ({
        pdf: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
        docx: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>`,
        pptx: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" stroke-width="2" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><polyline points="8 21 12 17 16 21"/></svg>`,
      })[type] ||
      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;

    wrap.innerHTML = `
      <div class="docs-header">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="width:3px;height:20px;border-radius:2px;background:${color}"></div>
          <span style="font-family:'Syne',sans-serif;font-weight:700;font-size:14px;color:${color}">${esc(c?.name || this.activeCourse)}</span>
          <span class="tag tag-muted">${docs.length} doc${docs.length > 1 ? "s" : ""}</span>
        </div>
        <label class="btn btn-primary btn-sm" style="cursor:pointer" title="Ajouter un document">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Ajouter
          <input type="file" accept=".pdf,.docx,.pptx" style="display:none" onchange="Learn.uploadDoc(this)"/>
        </label>
      </div>
      <div id="docsList" class="docs-list">
        ${
          docs.length === 0
            ? `<div class="empty-state" style="padding:30px 0">
               <div class="empty-icon"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
               <div class="empty-title">Aucun document</div>
               <div class="empty-sub">PDF, Word ou PowerPoint</div>
             </div>`
            : docs
                .map(
                  (d) => `
              <div class="doc-item" onclick="Learn.openViewer('${d.id}')">
                <div class="doc-item-icon">${typeIcon(d.type)}</div>
                <div class="doc-item-info">
                  <div class="doc-item-name">${esc(d.name)}</div>
                  <div class="doc-item-meta">${fmtSize(d.size)} · ${d.date}</div>
                </div>
                <button class="icon-btn del" onclick="event.stopPropagation();Learn.deleteDoc('${d.id}')" title="Supprimer">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>
                </button>
              </div>`,
                )
                .join("")
        }
      </div>`;
  }

  static selectCourse(code) {
    this.activeCourse = code;
    this._renderDocList();
  }

  static async uploadDoc(input) {
    const file = input.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["pdf", "docx", "pptx"].includes(ext)) {
      Learn._toast("Format non supporté. Utilisez PDF, DOCX ou PPTX.", "error");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      Learn._toast("Fichier trop lourd (max 20 Mo).", "error");
      return;
    }
    input.value = "";
    const wrap = document.getElementById("docsListWrap");
    if (wrap) {
      const bar = document.createElement("div");
      bar.className = "doc-upload-bar";
      bar.innerHTML = `<div class="doc-spinner" style="width:14px;height:14px"></div><span>Importation de ${esc(file.name)}…</span>`;
      wrap.prepend(bar);
    }
    try {
      await DocDB.saveDoc(this.activeCourse, file);
      Learn._toast(`${file.name} ajouté.`, "success");
    } catch {
      Learn._toast("Erreur lors de l'import.", "error");
    }
    await this._renderDocList();
  }

  static async deleteDoc(id) {
    const ok = await window.UI?.confirm({
      message: "Supprimer ce document ?",
      title: "Supprimer",
      confirmText: "Supprimer",
      cancelText: "Annuler",
      icon: "trash",
      danger: true,
    });
    if (!ok) return;
    await DocDB.deleteDoc(id);
    Learn._toast("Document supprimé.", "info");
    await this._renderDocList();
  }

  static async openViewer(id) {
    const doc = await DocDB.getDocFull(id);
    if (!doc) return;
    const overlay = document.getElementById("docViewerOverlay");
    const title = document.getElementById("docViewerTitle");
    const body = document.getElementById("docViewerBody");
    if (!overlay || !body) return;
    title.textContent = doc.name;
    body.innerHTML = `<div class="doc-loading"><div class="doc-spinner"></div><span>Ouverture…</span></div>`;
    overlay.classList.add("open");
    if (doc.type === "pdf") await renderPDF(doc.data, body);
    else if (doc.type === "docx") await renderDOCX(doc.data, body);
    else if (doc.type === "pptx") await renderPPTX(doc.data, doc.name, body);
    else
      body.innerHTML = `<div class="doc-error"><span>Format non supporté.</span></div>`;
  }

  static closeViewer() {
    const overlay = document.getElementById("docViewerOverlay");
    if (overlay) overlay.classList.remove("open");
    if (window._pdfCleanup) {
      window._pdfCleanup();
      delete window._pdfCleanup;
    }
    delete window._pdfPrev;
    delete window._pdfNext;
  }

  static _toast(msg, type = "success") {
    const icons = {
      success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
      error: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
      info: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/></svg>`,
    };
    const tc = document.getElementById("toastContainer");
    if (!tc) return;
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span>${esc(msg)}</span>`;
    tc.appendChild(el);
    setTimeout(() => {
      el.style.animation = "toast-out .3s ease forwards";
      setTimeout(() => el.remove(), 300);
    }, 3500);
  }

  static async _loadDocCounts() {
    try {
      const all = await DocDB.getAllMeta();
      this._docCountCache = {};
      all.forEach((d) => {
        this._docCountCache[d.courseCode] =
          (this._docCountCache[d.courseCode] || 0) + 1;
      });
    } catch {}
  }
}
