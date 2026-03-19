"use strict";

import { getActiveCourses, esc, courseColor, courseByCode } from "./utils.js";

/* 
   INDEXEDDB — Documents
 */
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

/* 
   POMODORO
   Méthode Cirillo stricte :
   · Seule une session TRAVAIL complétée via _tick()
     incrémente les statistiques.
   · setMode() manuel et skip() = zéro stat, zéro toast.
   · Anti-spam : un seul toast Pomodoro actif à la fois.
 */
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

export class Pomodoro {
  constructor() {
    this.mode = "work";
    this.timeLeft = MODES.work.min * 60;
    this.running = false;
    this._interval = null;
    this.round = 0;
    this.total = parseInt(localStorage.getItem("upte_pomo_total") || "0");
    this.msg = MSG_WORK[0];
    this._toastEl = null; // anti-spam
  }

  toggle() {
    this.running ? this.pause() : this.start();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._startedAt = Date.now();
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

  /* skip — passe au mode suivant SANS compter la session */
  skip() {
    this.running = false;
    clearInterval(this._interval);
    this._switchMode(this._nextMode());
  }

  /* setMode — changement manuel SANS stat SANS toast */
  setMode(mode) {
    this.running = false;
    clearInterval(this._interval);
    this._switchMode(mode);
  }

  /* ─── Interne ─── */

  _tick() {
    this.timeLeft--;
    if (this.timeLeft <= 0) this._completeNatural();
    else this._render();
  }

  /* Seul chemin qui incrémente les stats */
  _completeNatural() {
    this.running = false;
    clearInterval(this._interval);
    const expectedMs = MODES[this.mode].min * 60 * 1000;
    const elapsedMs = Date.now() - (this._startedAt || 0);
    if (elapsedMs < expectedMs * 0.97) return;
    this._beep();

    if (this.mode === "work") {
      this.round++;
      this.total++;
      localStorage.setItem("upte_pomo_total", this.total);
      const next = this.round % 4 === 0 ? "longBreak" : "shortBreak";
      this._toastCard({
        isWork: true,
        duration: MODES.work.min,
        nextMode: next,
      });
      this._setBadge(true);
      if (window._notifyPomoDone) window._notifyPomoDone("work", MODES[next].label);
      this._switchMode(next);
    } else {
      const duration = MODES[this.mode].min;
      this._toastCard({ isWork: false, duration, nextMode: "work" });
      this._setBadge(false);
      if (window._notifyPomoDone) window._notifyPomoDone(this.mode, "Travail");
      this._switchMode("work");
    }
  }

  _nextMode() {
    if (this.mode !== "work") return "work";
    return (this.round + 1) % 4 === 0 ? "longBreak" : "shortBreak";
  }

  _switchMode(mode) {
    this.mode = mode;
    this.timeLeft = MODES[mode].min * 60;
    this._pickMsg();
    this._render();
  }

  /* ─── Toast card premium, anti-spam, compatible thèmes ─── */
  _toastCard({ isWork, duration, nextMode }) {
    // Retire le toast Pomodoro précédent immédiatement
    if (this._toastEl) {
      clearTimeout(this._toastEl._timer);
      this._toastEl.style.animation = "toast-out .15s ease forwards";
      const old = this._toastEl;
      setTimeout(() => old.remove(), 150);
      this._toastEl = null;
    }

    const tc = document.getElementById("toastContainer");
    if (!tc) return;

    const accentColor = isWork ? "var(--green)" : "var(--orange)";
    const nextColor = MODES[nextMode].color;
    const nextLabel = MODES[nextMode].label;
    const title = isWork ? "Session accomplie" : "Pause terminée";
    const message = isWork
      ? `${duration} min de travail concentré.`
      : `${duration} min de repos bien mérité.`;

    const iconWork = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>`;
    const iconBreak = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;

    const el = document.createElement("div");
    el.className = "toast success toast-pomo-card";
    el.innerHTML = `
      <div class="tpc-body">
        <div class="tpc-icon" style="background:${accentColor}1a;border-color:${accentColor}50;color:${accentColor}">
          ${isWork ? iconWork : iconBreak}
        </div>
        <div class="tpc-text">
          <div class="tpc-title">${title}</div>
          <div class="tpc-msg">${message}</div>
        </div>
      </div>
      <div class="tpc-footer">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--muted2)" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        <span class="tpc-next-label">Prochain</span>
        <span class="tpc-next-badge" style="color:${nextColor};background:${nextColor}18">${nextLabel}</span>
      </div>
      <div class="tpc-bar" style="background:${accentColor}"></div>`;

    tc.appendChild(el);
    this._toastEl = el;

    // Barre de progression CSS (4s)
    requestAnimationFrame(() => {
      el.querySelector(".tpc-bar").style.transform = "scaleX(0)";
    });

    // Fermeture au clic
    el.addEventListener(
      "click",
      () => {
        clearTimeout(el._timer);
        el.style.animation = "toast-out .2s ease forwards";
        setTimeout(() => {
          el.remove();
          if (this._toastEl === el) this._toastEl = null;
        }, 200);
      },
      { once: true },
    );

    // Auto-fermeture 4s
    el._timer = setTimeout(() => {
      el.style.animation = "toast-out .3s ease forwards";
      setTimeout(() => {
        el.remove();
        if (this._toastEl === el) this._toastEl = null;
      }, 300);
    }, 4000);
  }

  /* ─── Badge nav Apprentissage ─── */
  _setBadge(show) {
    document.querySelectorAll(".nav-item").forEach((n) => {
      if (!n.getAttribute("onclick")?.includes("'learn'")) return;
      let badge = n.querySelector(".pomo-nav-badge");
      if (show) {
        if (!badge) {
          badge = document.createElement("span");
          badge.className = "pomo-nav-badge nav-badge";
          n.appendChild(badge);
        }
        badge.textContent = "🍅";
        badge.style.cssText =
          "margin-left:auto;font-size:12px;background:transparent;animation:pomoBadgePop .3s ease";
      } else {
        badge?.remove();
      }
    });
  }

  /* ─── Son ─── */
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

  /* Render — silencieux si pomodoroWidget absent du DOM */
  _render() {
    const el = document.getElementById("pomodoroWidget");
    if (!el) return;

    const m = MODES[this.mode],
      prog = this._progress(),
      R = 88,
      C = 2 * Math.PI * R;
    const workedH = Math.floor((this.total * 25) / 60);
    const workedM = (this.total * 25) % 60;
    const sessionInCycle = this.round % 4;
    const dot = Array(4)
      .fill(0)
      .map(
        (_, i) =>
          `<div class="pomo-dot ${i < sessionInCycle ? "filled" : ""}"></div>`,
      )
      .join("");

    el.innerHTML = `
      <div class="pomo-modes">
        ${Object.values(MODES)
          .map(
            (md) => `
          <button class="pomo-mode-btn ${this.mode === md.key ? "active" : ""}"
            onclick="window._pomo.setMode('${md.key}')"
            style="${this.mode === md.key ? `color:${md.color};border-color:${md.color};background:${md.color}18` : ""}">
            ${md.label}
          </button>`,
          )
          .join("")}
      </div>
      <div class="pomo-ring-wrap">
        <svg class="pomo-ring" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <circle cx="100" cy="100" r="${R}" fill="none" stroke="var(--border)" stroke-width="8"/>
          <circle cx="100" cy="100" r="${R}" fill="none"
            stroke="${m.color}" stroke-width="8" stroke-linecap="butt"
            stroke-dasharray="${C.toFixed(2)}"
            stroke-dashoffset="${(C * (1 - prog)).toFixed(2)}"
            transform="rotate(-90 100 100)"
            style="transition:stroke-dashoffset 0.85s linear,stroke .3s;opacity:${prog < 0.01 ? 0 : 1}"/>
        </svg>
        <div class="pomo-center">
          <div class="pomo-time" style="color:${m.color}">${this._fmt()}</div>
          <div class="pomo-label">${m.label}</div>
        </div>
      </div>
      <div class="pomo-msg">${this.msg}</div>
      <div class="pomo-dots">${dot}</div>
      <div class="pomo-controls">
        <button class="pomo-btn pomo-secondary"
          onclick="window._pomo.reset()"
          title="Annuler la session"
          ${!this.running && this.timeLeft === MODES[this.mode].min * 60 ? 'disabled style="opacity:.3;cursor:not-allowed"' : ""}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-6.18 2.45"/>
<polyline points="3 3 3 8 8 8"/>
          </svg>
        </button>
        <button class="pomo-btn pomo-primary"
          onclick="${this.mode === "work" && this.running ? "window._pomo.reset()" : "window._pomo.toggle()"}"
          style="background:${
            this.mode === "work" && this.running
              ? "var(--red-dim)"
              : m.color + "22"
          };border-color:${
            this.mode === "work" && this.running ? "var(--red)" : m.color
          };color:${
            this.mode === "work" && this.running ? "var(--red)" : m.color
          }">
          ${
            this.mode === "work" && this.running
              ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="17" y1="7" x2="7" y2="17"/><line x1="7" y1="7" x2="17" y2="17"/></svg>
               <span>Annuler</span>`
              : this.mode !== "work" && this.running
                ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3" fill="currentColor" stroke="none"/></svg>
               <span>Reprendre</span>`
                : this.running
                  ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
               <span>Pause</span>`
                  : `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3" fill="currentColor" stroke="none"/></svg>
               <span>Démarrer</span>`
          }
        </button>
        <button class="pomo-btn pomo-secondary"
          onclick="window._pomo.skip()"
          title="Passer"
          ${!this.running && this.timeLeft === MODES[this.mode].min * 60 ? 'disabled style="opacity:.3;cursor:not-allowed"' : ""}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <polygon points="5 4 15 12 5 20 5 4" fill="currentColor" stroke="none"/>
<line x1="19" y1="4" x2="19" y2="20" stroke-width="2.5"/>
          </svg>
        </button>
      </div>
      <div class="pomo-stats-row">
        <div class="pomo-stat">
          <div class="pomo-stat-n">${sessionInCycle}</div>
          <div class="pomo-stat-l">Session</div>
        </div>
        <div class="pomo-stat-sep"></div>
        <div class="pomo-stat">
          <div class="pomo-stat-n">${this.total}</div>
          <div class="pomo-stat-l">Total</div>
        </div>
        <div class="pomo-stat-sep"></div>
        <div class="pomo-stat">
          <div class="pomo-stat-n">${workedH}h${String(workedM).padStart(2, "0")}</div>
          <div class="pomo-stat-l">Travaillées</div>
        </div>
      </div>`;

    this._updateTopbarIndicator();
    this._updateNavCounter();
  }

  _updateTopbarIndicator() {
    const el = document.getElementById("pomoTopbarIndicator");
    if (!el) return;
    const isIdle =
      !this.running &&
      this.mode === "work" &&
      this.timeLeft === MODES.work.min * 60;
    if (isIdle) {
      el.style.display = "none";
      return;
    }
    el.style.display = "flex";
    const m = MODES[this.mode];
    const C = (2 * Math.PI * 8).toFixed(2);
    const off = (2 * Math.PI * 8 * (1 - this._progress())).toFixed(2);
    el.innerHTML = `
      <div class="pti-ring">
        <svg width="20" height="20" viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="8" fill="none" stroke="var(--border)" stroke-width="2.5"/>
          <circle cx="10" cy="10" r="8" fill="none"
            stroke="${m.color}" stroke-width="2.5" stroke-linecap="round"
            stroke-dasharray="${C}" stroke-dashoffset="${off}"
            transform="rotate(-90 10 10)"
            style="transition:stroke-dashoffset 0.85s linear"/>
        </svg>
      </div>
      <span class="pti-time" style="color:${m.color}">${this._fmt()}</span>
      <span class="pti-dot ${this.running ? "running" : "paused"}"></span>`;
    const bar = document.getElementById("pomoTopbarBar");
    if (bar) {
      bar.style.width = `${Math.round(this._progress() * 100)}%`;
      bar.style.background = m.color;
    }
  }

  _updateNavCounter() {
    document.querySelectorAll(".nav-item").forEach((n) => {
      if (!n.getAttribute("onclick")?.includes("'learn'")) return;
      if (n.querySelector(".pomo-nav-badge")) return; // badge 🍅 prioritaire
      let counter = n.querySelector(".pomo-nav-counter");
      if (this.running) {
        if (!counter) {
          counter = document.createElement("span");
          counter.className = "pomo-nav-counter";
          n.appendChild(counter);
        }
        const m = MODES[this.mode];
        counter.textContent = this._fmt();
        counter.style.cssText = `
          margin-left:auto;font-family:'Syne',sans-serif;font-size:9px;font-weight:700;
          background:${m.color}22;color:${m.color};border:1px solid ${m.color}40;
          padding:2px 6px;border-radius:4px;min-width:36px;text-align:center;
          letter-spacing:.3px;flex-shrink:0;`;
      } else {
        counter?.remove();
      }
    });
  }
}

/* 
   VIEWERS
 */
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
    let currentPage = 1,
      scale = 1.5,
      navTimer = null;
    const wrap = document.createElement("div");
    wrap.className = "doc-pdf-wrap";
    const nav = document.createElement("div");
    nav.className = "doc-pdf-nav doc-pdf-nav--hidden";
    const canvasWrap = document.createElement("div");
    canvasWrap.className = "doc-canvas-wrap";
    const pageInd = document.createElement("div");
    pageInd.className = "pdf-page-indicator";
    wrap.appendChild(nav);
    wrap.appendChild(canvasWrap);
    wrap.appendChild(pageInd);
    container.innerHTML = "";
    container.appendChild(wrap);
    const renderPage = async (num) => {
      const page = await pdf.getPage(num);
      const vp = page.getViewport({ scale });
      const c = document.createElement("canvas");
      c.width = vp.width;
      c.height = vp.height;
      c.className = "pdf-canvas";
      c.style.maxWidth = "100%";
      await page.render({ canvasContext: c.getContext("2d"), viewport: vp })
        .promise;
      return c;
    };
    const updateNav = () => {
      nav.innerHTML = `
        <button class="pdf-nav-btn" ${currentPage <= 1 ? "disabled" : ""} onclick="window._pdfPrev()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span class="pdf-nav-label"><strong>${currentPage}</strong><span class="pdf-nav-sep">/</span>${totalPages}</span>
        <button class="pdf-nav-btn" ${currentPage >= totalPages ? "disabled" : ""} onclick="window._pdfNext()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>`;
      pageInd.textContent = `${currentPage} / ${totalPages}`;
    };
    const showNav = () => {
      nav.classList.remove("doc-pdf-nav--hidden");
      clearTimeout(navTimer);
      navTimer = setTimeout(
        () => nav.classList.add("doc-pdf-nav--hidden"),
        2200,
      );
    };
    const showPage = async (num) => {
      canvasWrap.innerHTML = `<div class="doc-loading"><div class="doc-spinner"></div></div>`;
      const c = await renderPage(num);
      canvasWrap.innerHTML = "";
      canvasWrap.appendChild(c);
      updateNav();
    };
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
    canvasWrap.addEventListener("click", showNav);
    canvasWrap.addEventListener("touchstart", showNav, { passive: true });
    canvasWrap.addEventListener("mousemove", showNav);
    canvasWrap.addEventListener(
      "wheel",
      async (e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          scale = Math.max(
            0.5,
            Math.min(4, scale + (e.deltaY > 0 ? -0.1 : 0.1)),
          );
          await showPage(currentPage);
        }
      },
      { passive: false },
    );
    const onKey = async (e) => {
      if (
        !document.getElementById("docViewerOverlay")?.classList.contains("open")
      )
        return;
      if (["ArrowRight", "ArrowDown", "PageDown"].includes(e.key)) {
        e.preventDefault();
        await window._pdfNext();
      } else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key)) {
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
  container.innerHTML = `<div class="doc-loading"><div class="doc-spinner"></div><span>Conversion…</span></div>`;
  try {
    const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
    const wrap = document.createElement("div");
    wrap.className = "doc-docx-content";
    wrap.innerHTML = result.value;
    container.innerHTML = "";
    container.appendChild(wrap);
  } catch {
    container.innerHTML = `<div class="doc-error"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><span>Erreur de lecture.</span></div>`;
  }
}

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
          <line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="12" x2="13" y2="12"/>
        </svg>
      </div>
      <div class="pptx-preview-name">${esc(name)}</div>
      <p class="pptx-preview-info">Les présentations contiennent des images et une mise en page qui ne peuvent pas être reproduites dans le navigateur.<br/>Télécharge le fichier pour l'ouvrir dans PowerPoint, LibreOffice ou Google Slides.</p>
      <a href="${blobUrl}" download="${esc(name)}" class="btn btn-primary pptx-download-btn">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
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

/* 
   LEARN — Module principal
 */
export class Learn {
  static activeCourse = null;
  static _docCountCache = {};

  static init() {
    if (!window._pomo) window._pomo = new Pomodoro();
    this._loadDocCounts();
  }

  static async render() {
    const courses = getActiveCourses();
    this.activeCourse = this.activeCourse || (courses[0]?.code ?? null);
    const docsEl = document.getElementById("learnDocsPanel");
    const pomoEl = document.getElementById("pomodoroWidget");
    if (!docsEl || !pomoEl) return;
    window._pomo._render();
    await this._renderDocs();
    window._pomo._setBadge(false);
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
        <label class="btn btn-primary btn-sm" style="cursor:pointer">
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
      Learn._toast("Format non supporté. PDF, DOCX ou PPTX.", "error");
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
      error: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="17" y1="7" x2="7" y2="17"/><line x1="7" y1="7" x2="17" y2="17"/></svg>`,
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
