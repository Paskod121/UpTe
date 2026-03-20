"use strict";

import { getActiveCourses, esc, courseColor, courseByCode } from "./utils.js";
import { UI } from "./ui.js";

/* 
   NOTES DB — IndexedDB
 */
class NotesDB {
  static DB_NAME = "upte_notes";
  static DB_VERSION = 1;
  static STORE = "notes";
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

  static async save(note) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE, "readwrite");
      tx.objectStore(this.STORE).put({
        ...note,
        updatedAt: new Date().toISOString(),
      });
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  static async getAll(courseCode) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE, "readonly");
      const req = tx.objectStore(this.STORE).getAll();
      req.onsuccess = () =>
        resolve(
          req.result
            .filter((n) => n.courseCode === courseCode)
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
        );
      req.onerror = (e) => reject(e.target.error);
    });
  }

  static async get(id) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE, "readonly");
      const req = tx.objectStore(this.STORE).get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  static async delete(id) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE, "readwrite");
      tx.objectStore(this.STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  static async getAllMeta() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE, "readonly");
      const req = tx.objectStore(this.STORE).getAll();
      req.onsuccess = () => resolve(req.result.map(({ content, ...m }) => m));
      req.onerror = (e) => reject(e.target.error);
    });
  }
}

/* 
   NOTES MODULE
 */
export class Notes {
  static activeCourse = null;
  static activeNoteId = null;
  static _saveTimer = null;
  static _dirty = false;

  static async init() {
    const courses = getActiveCourses();
    if (!this.activeCourse && courses.length > 0)
      this.activeCourse = courses[0].code;
  }

  /* ─── Rendu principal ─── */
  static async render() {
    const el = document.getElementById("notesPage");
    if (!el) return;

    const courses = getActiveCourses();
    if (!this.activeCourse && courses.length > 0)
      this.activeCourse = courses[0].code;

    el.innerHTML = `
      <div class="notes-layout">
        <!-- Sidebar notes -->
        <div class="notes-sidebar">
          <div class="notes-sidebar-top">
            <select class="form-select notes-course-select" id="notesCourseSelect"
              onchange="Notes.selectCourse(this.value)">
              ${courses
                .map(
                  (c) => `
                <option value="${c.code}" ${c.code === this.activeCourse ? "selected" : ""}>
                  ${esc(c.code)} — ${esc(c.name)}
                </option>`,
                )
                .join("")}
            </select>
            <button class="btn btn-primary btn-sm notes-new-btn"
              onclick="Notes.createNote()" title="Nouvelle note">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Nouvelle note
            </button>
          </div>
          <div class="notes-list" id="notesList"></div>
        </div>

        <!-- Éditeur -->
        <div class="notes-editor-wrap" id="notesEditorWrap">
          <div class="notes-empty-state" id="notesEmptyEditor">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="1.2" stroke-linecap="round">
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
            </svg>
            <p>Sélectionne une note ou crée-en une nouvelle</p>
          </div>
        </div>
      </div>
    `;

    await this._renderList();
    if (this.activeNoteId) await this._openNote(this.activeNoteId);
  }

  /* ─── Liste des notes ─── */
  static async _renderList() {
    const el = document.getElementById("notesList");
    if (!el) return;

    const notes = await NotesDB.getAll(this.activeCourse);
    const c = courseByCode(this.activeCourse);
    const color = courseColor(c);

    if (notes.length === 0) {
      el.innerHTML = `
        <div class="notes-list-empty">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <span>Aucune note pour cette UE</span>
        </div>`;
      return;
    }

    el.innerHTML = notes
      .map((n) => {
        const date = new Date(n.updatedAt);
        const dateStr = `${date.getDate()} ${["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"][date.getMonth()]}`;
        const isActive = n.id === this.activeNoteId;
        return `
        <div class="notes-list-item ${isActive ? "active" : ""}"
          onclick="Notes._openNote('${n.id}')"
          style="${isActive ? `border-left-color:${color}` : ""}">
          <div class="nli-title">${esc(n.title || "Note sans titre")}</div>
          <div class="nli-meta">${dateStr} · ${n.wordCount || 0} mots</div>
          <button class="icon-btn del nli-del"
            onclick="event.stopPropagation();Notes.deleteNote('${n.id}')"
            title="Supprimer">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
            </svg>
          </button>
        </div>`;
      })
      .join("");
  }

  /* ─── Ouvrir une note ─── */
  static async _openNote(id) {
    await this._autoSave();
    this.activeNoteId = id;
    const note = await NotesDB.get(id);
    if (!note) return;

    const wrap = document.getElementById("notesEditorWrap");
    if (!wrap) return;

    const c = courseByCode(note.courseCode);
    const color = courseColor(c);

    wrap.innerHTML = `
      <div class="notes-editor-inner">

        <!-- Titre -->
        <div class="notes-title-row">
          <input class="notes-title-input" id="noteTitleInput"
            value="${esc(note.title || "")}"
            placeholder="Titre de la note…"
            oninput="Notes._markDirty()"
            style="border-bottom-color:${color}20"/>
          <div class="notes-meta-row">
            <span class="notes-course-badge" style="color:${color};background:${color}18">
              ${esc(note.courseCode)}
            </span>
            <span class="notes-save-status" id="noteSaveStatus">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Sauvegardé
            </span>
            <button class="btn btn-ghost btn-sm" onclick="Notes.exportNote()"
              title="Exporter en HTML">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Exporter
            </button>
          </div>
        </div>

        ${
          window.innerWidth <= 768
            ? `
          <div class="notes-toolbar-mobile" id="notesToolbarMobile">
            <div class="ntb-mobile-main">
              <button class="ntb-btn" onclick="Notes._exec('bold')" title="Gras">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>
              </button>
              <button class="ntb-btn" onclick="Notes._exec('italic')" title="Italique">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>
              </button>
              <button class="ntb-btn" onclick="Notes._execBlock('h2')" title="Titre">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h7"/></svg>
              </button>
              <button class="ntb-btn" onclick="Notes._exec('insertUnorderedList')" title="Liste">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/></svg>
              </button>
              <button class="ntb-btn" onclick="Notes._execHighlight('#fef08a')" title="Surligner">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </button>
              <button class="ntb-btn" onclick="Notes._exec('undo')" title="Annuler">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>
              </button>
              <div class="ntb-sep"></div>
              <button class="ntb-btn ntb-more-btn" onclick="Notes._toggleMoreTools()" title="Plus d'outils" id="ntbMoreBtn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/></svg>
              </button>
            </div>
            <div class="ntb-mobile-more" id="ntbMorePanel" style="display:none">
            </div>
          </div>`
            : ""
        }

        <!-- Toolbar -->
        <div class="notes-toolbar ${window.innerWidth <= 768 ? "ntb-hidden-mobile" : ""}" id="notesToolbar">

          <!-- Bloc 1 : Titres -->
          <div class="ntb-group">
            <select class="ntb-select" onchange="Notes._execBlock(this.value);this.value='p'"
              title="Style de paragraphe">
              <option value="p">Normal</option>
              <option value="h1">Titre 1</option>
              <option value="h2">Titre 2</option>
              <option value="h3">Titre 3</option>
              <option value="h4">Sous-titre</option>
              <option value="blockquote">Citation</option>
              <option value="pre">Code</option>
            </select>
          </div>

          <div class="ntb-sep"></div>

          <!-- Bloc 2 : Format -->
          <div class="ntb-group">
            <button class="ntb-btn" onclick="Notes._exec('bold')" title="Gras (Ctrl+B)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="3" stroke-linecap="round">
                <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
                <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
              </svg>
            </button>
            <button class="ntb-btn" onclick="Notes._exec('italic')" title="Italique (Ctrl+I)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <line x1="19" y1="4" x2="10" y2="4"/>
                <line x1="14" y1="20" x2="5" y2="20"/>
                <line x1="15" y1="4" x2="9" y2="20"/>
              </svg>
            </button>
            <button class="ntb-btn" onclick="Notes._exec('underline')" title="Souligné (Ctrl+U)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/>
                <line x1="4" y1="21" x2="20" y2="21"/>
              </svg>
            </button>
            <button class="ntb-btn" onclick="Notes._exec('strikeThrough')" title="Barré">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <path d="M17.3 4.9c-2.3-.6-4.4-1-6.2-.9-2.7 0-5.3.7-5.3 3.6 0 1.5 1.8 3.3 6 3.9h.9"/>
                <path d="M11.7 15c3.5.4 6.3 2 6.3 3.8 0 3.7-7.5 3.7-9.2 3.7-1.7 0-3.8-.1-5.2-.9"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
              </svg>
            </button>
            <button class="ntb-btn" onclick="Notes._exec('superscript')" title="Exposant">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <path d="m4 19 8-8"/><path d="m12 19L4 11"/>
                <path d="M20 12h-4c0-1.5.442-2 1.5-2.5S20 8.334 20 7.002c0-.472-.17-.93-.484-1.29a2.105 2.105 0 0 0-2.617-.436c-.42.239-.738.614-.899 1.06"/>
              </svg>
            </button>
          </div>

          <div class="ntb-sep"></div>

          <!-- Bloc 3 : Taille -->
          <div class="ntb-group">
            <button class="ntb-btn" onclick="Notes._fontSize(-1)" title="Diminuer la taille">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
            <span class="ntb-size-display" id="ntbSizeDisplay">16</span>
            <button class="ntb-btn" onclick="Notes._fontSize(1)" title="Augmenter la taille">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          </div>

          <div class="ntb-sep"></div>

          <!-- Bloc 4 : Couleur -->
          <div class="ntb-group ntb-colors">
            <button class="ntb-color-btn" style="background:#1a2118"
              onclick="Notes._execColor('#1a2118')" title="Noir/Sombre">
              <span class="ntb-color-dot" style="background:#1a2118"></span>
            </button>
            <button class="ntb-color-btn"
              onclick="Notes._execColor('var(--text)')" title="Texte normal">
              <span class="ntb-color-dot ntb-color-default"></span>
            </button>
            <button class="ntb-color-btn"
              onclick="Notes._execColor(getComputedStyle(document.documentElement).getPropertyValue('--green').trim())"
              title="Vert accent">
              <span class="ntb-color-dot" style="background:var(--green)"></span>
            </button>
            <button class="ntb-color-btn"
              onclick="Notes._execColor('#ef4444')" title="Rouge — important">
              <span class="ntb-color-dot" style="background:#ef4444"></span>
            </button>
            <button class="ntb-color-btn"
              onclick="Notes._execColor('#f97316')" title="Orange — à retenir">
              <span class="ntb-color-dot" style="background:#f97316"></span>
            </button>
            <button class="ntb-color-btn"
              onclick="Notes._execColor('#38bdf8')" title="Bleu — définition">
              <span class="ntb-color-dot" style="background:#38bdf8"></span>
            </button>
            <button class="ntb-color-btn"
              onclick="Notes._execColor('#a78bfa')" title="Violet — exemple">
              <span class="ntb-color-dot" style="background:#a78bfa"></span>
            </button>
            <button class="ntb-color-btn ntb-color-highlight"
              onclick="Notes._execHighlight('#fef08a')" title="Surligner jaune">
              <span class="ntb-color-dot ntb-highlight-dot"
                style="background:#fef08a"></span>
            </button>
          </div>

          <div class="ntb-sep"></div>

          <!-- Bloc 5 : Listes & alignement -->
          <div class="ntb-group">
            <button class="ntb-btn" onclick="Notes._exec('insertUnorderedList')"
              title="Liste à puces">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <line x1="9" y1="6" x2="20" y2="6"/>
                <line x1="9" y1="12" x2="20" y2="12"/>
                <line x1="9" y1="18" x2="20" y2="18"/>
                <circle cx="4" cy="6" r="1" fill="currentColor"/>
                <circle cx="4" cy="12" r="1" fill="currentColor"/>
                <circle cx="4" cy="18" r="1" fill="currentColor"/>
              </svg>
            </button>
            <button class="ntb-btn" onclick="Notes._exec('insertOrderedList')"
              title="Liste numérotée">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <line x1="10" y1="6" x2="21" y2="6"/>
                <line x1="10" y1="12" x2="21" y2="12"/>
                <line x1="10" y1="18" x2="21" y2="18"/>
                <path d="M4 6h1v4"/>
                <path d="M4 10h2"/>
                <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>
              </svg>
            </button>
            <button class="ntb-btn" onclick="Notes._exec('justifyLeft')"
              title="Aligner à gauche">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="15" y2="12"/>
                <line x1="3" y1="18" x2="18" y2="18"/>
              </svg>
            </button>
            <button class="ntb-btn" onclick="Notes._exec('justifyCenter')"
              title="Centrer">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="6" y1="12" x2="18" y2="12"/>
                <line x1="4" y1="18" x2="20" y2="18"/>
              </svg>
            </button>
            <button class="ntb-btn" onclick="Notes._exec('indent')"
              title="Indenter">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <polyline points="3 8 7 12 3 16"/>
                <line x1="21" y1="12" x2="11" y2="12"/>
                <line x1="21" y1="6" x2="3" y2="6"/>
                <line x1="21" y1="18" x2="3" y2="18"/>
              </svg>
            </button>
            <button class="ntb-btn" onclick="Notes._exec('outdent')"
              title="Désindenter">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <polyline points="7 8 3 12 7 16"/>
                <line x1="21" y1="12" x2="11" y2="12"/>
                <line x1="21" y1="6" x2="3" y2="6"/>
                <line x1="21" y1="18" x2="3" y2="18"/>
              </svg>
            </button>
          </div>

          <div class="ntb-sep"></div>

          <!-- Bloc 6 : Historique -->
          <div class="ntb-group">
            <button class="ntb-btn" onclick="Notes._exec('undo')" title="Annuler (Ctrl+Z)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <polyline points="9 14 4 9 9 4"/>
                <path d="M20 20v-7a4 4 0 0 0-4-4H4"/>
              </svg>
            </button>
            <button class="ntb-btn" onclick="Notes._exec('redo')" title="Rétablir (Ctrl+Y)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <polyline points="15 14 20 9 15 4"/>
                <path d="M4 20v-7a4 4 0 0 1 4-4h12"/>
              </svg>
            </button>
          </div>

          <div class="ntb-sep"></div>

          <!-- Bloc 7 : Plein écran -->
          <div class="ntb-group" style="margin-left:auto">
            <button class="ntb-btn" onclick="Notes._toggleFullscreen()" title="Plein écran">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round"
                id="ntbFsIcon">
                <polyline points="15 3 21 3 21 9"/>
                <polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/>
                <line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Zone d'édition -->
        <div class="notes-editor-area" id="noteEditorArea"
          contenteditable="true"
          spellcheck="false"
          lang="fr"
          oninput="Notes._onInput()"
          onkeydown="Notes._onKeydown(event)"
          onmouseup="Notes._updateSizeDisplay()"
          onkeyup="Notes._updateSizeDisplay()"
        >${note.content || "<p><br></p>"}</div>

        <!-- Barre de bas de page -->
        <div class="notes-footer">
          <span id="noteWordCount">${note.wordCount || 0} mots</span>
          <span id="noteCharCount">0 car.</span>
        </div>
      </div>
    `;

    this._updateCounts();
    this._updateSizeDisplay();
    await this._renderList();
    document.getElementById("noteEditorArea")?.focus();
  }

  /* ─── Créer une note ─── */
  static async createNote() {
    await this._autoSave();
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const note = {
      id,
      courseCode: this.activeCourse,
      title: "",
      content: "<p><br></p>",
      wordCount: 0,
      charCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await NotesDB.save(note);
    this.activeNoteId = id;
    await this._renderList();
    await this._openNote(id);
  }

  /* ─── Supprimer ─── */
  static async deleteNote(id) {
    const ok = await UI.confirm({
      message: "Supprimer cette note ?",
      title: "Supprimer la note",
      confirmText: "Supprimer",
      cancelText: "Annuler",
      icon: "trash",
      danger: true,
    });
    if (!ok) return;
    await NotesDB.delete(id);
    if (this.activeNoteId === id) {
      this.activeNoteId = null;
      const wrap = document.getElementById("notesEditorWrap");
      if (wrap)
        wrap.innerHTML = `
        <div class="notes-empty-state" id="notesEmptyEditor">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="1.2" stroke-linecap="round">
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
          </svg>
          <p>Sélectionne une note ou crée-en une nouvelle</p>
        </div>`;
    }
    await this._renderList();
  }

  /* ─── Changer de cours ─── */
  static async selectCourse(code) {
    await this._autoSave();
    this.activeCourse = code;
    this.activeNoteId = null;
    await this._renderList();
    const wrap = document.getElementById("notesEditorWrap");
    if (wrap)
      wrap.innerHTML = `
      <div class="notes-empty-state" id="notesEmptyEditor">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="1.2" stroke-linecap="round">
          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
        </svg>
        <p>Sélectionne une note ou crée-en une nouvelle</p>
      </div>`;
  }

  /* ─── Sauvegarde auto ─── */
  static _markDirty() {
    this._dirty = true;
    const st = document.getElementById("noteSaveStatus");
    if (st)
      st.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg> Non sauvegardé`;
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this._autoSave(), 1200);
  }

  static async _autoSave() {
    if (!this._dirty || !this.activeNoteId) return;
    const editor = document.getElementById("noteEditorArea");
    const title = document.getElementById("noteTitleInput");
    if (!editor) return;
    const text = editor.innerText || "";
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    await NotesDB.save({
      id: this.activeNoteId,
      courseCode: this.activeCourse,
      title: title?.value || "",
      content: editor.innerHTML,
      wordCount: words,
      charCount: text.length,
      createdAt: new Date().toISOString(),
    });
    this._dirty = false;
    const st = document.getElementById("noteSaveStatus");
    if (st)
      st.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Sauvegardé`;
  }

  /* ─── Commandes d'édition ─── */
  static _exec(cmd, val = null) {
    document.getElementById("noteEditorArea")?.focus();
    document.execCommand(cmd, false, val);
    this._markDirty();
  }

  static _execBlock(tag) {
    document.getElementById("noteEditorArea")?.focus();
    document.execCommand("formatBlock", false, tag);
    this._markDirty();
  }

  static _execColor(color) {
    document.getElementById("noteEditorArea")?.focus();
    const resolved = color.startsWith("var(")
      ? getComputedStyle(document.documentElement)
          .getPropertyValue(color.replace("var(", "").replace(")", "").trim())
          .trim()
      : color;
    document.execCommand("foreColor", false, resolved || color);
    this._markDirty();
  }

  static _execHighlight(color) {
    document.getElementById("noteEditorArea")?.focus();
    document.execCommand("hiliteColor", false, color);
    this._markDirty();
  }

  static _currentFontSize = 16;

  static _fontSize(delta) {
    const el = document.getElementById("noteEditorArea");
    if (!el) return;
    el.focus();
    this._currentFontSize = Math.max(
      10,
      Math.min(48, this._currentFontSize + delta * 2),
    );
    document.execCommand("fontSize", false, "7");
    const spans = el.querySelectorAll('font[size="7"]');
    spans.forEach((s) => {
      s.removeAttribute("size");
      s.style.fontSize = this._currentFontSize + "px";
    });
    this._updateSizeDisplay();
    this._markDirty();
  }

  static _updateSizeDisplay() {
    const el = document.getElementById("ntbSizeDisplay");
    if (el) el.textContent = this._currentFontSize;
  }

  static _onInput() {
    this._markDirty();
    this._updateCounts();
  }

  static _updateCounts() {
    const editor = document.getElementById("noteEditorArea");
    if (!editor) return;
    const text = editor.innerText || "";
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const wcEl = document.getElementById("noteWordCount");
    const ccEl = document.getElementById("noteCharCount");
    if (wcEl) wcEl.textContent = `${words} mot${words > 1 ? "s" : ""}`;
    if (ccEl) ccEl.textContent = `${chars} car.`;
  }

  static _onKeydown(e) {
    // Tab → indent
    if (e.key === "Tab") {
      e.preventDefault();
      document.execCommand(e.shiftKey ? "outdent" : "indent");
    }
    // Sauvegarde manuelle Ctrl+S
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      this._autoSave();
    }
  }

  static _fullscreen = false;

  static _toggleFullscreen() {
    const wrap = document.querySelector(".notes-editor-inner");
    const icon = document.getElementById("ntbFsIcon");
    if (!wrap) return;
    this._fullscreen = !this._fullscreen;
    wrap.classList.toggle("notes-fullscreen", this._fullscreen);
    if (icon)
      icon.innerHTML = this._fullscreen
        ? `<polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/>
         <line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/>`
        : `<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
         <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>`;
  }

  static _moreOpen = false;

  static _toggleMoreTools() {
    const panel = document.getElementById("ntbMorePanel");
    const btn = document.getElementById("ntbMoreBtn");
    if (!panel) return;
    this._moreOpen = !this._moreOpen;

    if (this._moreOpen) {
      panel.style.display = "flex";
      panel.innerHTML = `
      <div class="ntb-group">
        <button class="ntb-btn" onclick="Notes._exec('underline')" title="Souligné">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/><line x1="4" y1="21" x2="20" y2="21"/></svg>
        </button>
        <button class="ntb-btn" onclick="Notes._exec('strikeThrough')" title="Barré">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="3" y1="12" x2="21" y2="12"/><path d="M7 7c0-1.657 2.239-3 5-3s5 1.343 5 3"/><path d="M7 17c0 1.657 2.239 3 5 3s5-1.343 5-3"/></svg>
        </button>
        <button class="ntb-btn" onclick="Notes._execBlock('h1')" title="Titre 1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M4 6h16M4 12h10"/></svg>
        </button>
        <button class="ntb-btn" onclick="Notes._exec('insertOrderedList')" title="Liste numérotée">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>
        </button>
        <button class="ntb-btn" onclick="Notes._exec('justifyLeft')" title="Aligner gauche">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>
        </button>
        <button class="ntb-btn" onclick="Notes._exec('justifyCenter')" title="Centrer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
        </button>
        <button class="ntb-btn" onclick="Notes._exec('redo')" title="Rétablir">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/></svg>
        </button>
        <button class="ntb-btn" onclick="Notes.exportNote()" title="Exporter">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
      </div>`;
      btn.style.color = "var(--green)";
    } else {
      panel.style.display = "none";
      panel.innerHTML = "";
      btn.style.color = "";
    }
  }

  /* ─── Exporter ─── */
  static exportNote() {
    const editor = document.getElementById("noteEditorArea");
    const title = document.getElementById("noteTitleInput");
    if (!editor) return;
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>${title?.value || "Note"}</title>
<style>
  body { font-family: Georgia, serif; max-width: 720px; margin: 60px auto;
         padding: 0 20px; line-height: 1.8; color: #1a1a1a; }
  h1 { font-size: 2em; margin-top: 1.5em; }
  h2 { font-size: 1.5em; margin-top: 1.2em; }
  h3 { font-size: 1.2em; margin-top: 1em; }
  blockquote { border-left: 4px solid #ccc; margin: 0; padding-left: 16px; color: #666; }
  pre { background: #f4f4f4; padding: 12px; border-radius: 6px; overflow-x: auto; }
  ul, ol { padding-left: 24px; }
</style></head><body>
<h1>${title?.value || "Note"}</h1>
${editor.innerHTML}
</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${(title?.value || "note").replace(/[^a-z0-9]/gi, "-")}.html`;
    a.click();
  }

  static async getNotesCountByUE() {
    const all = await NotesDB.getAllMeta();
    const map = {};
    all.forEach((n) => {
      map[n.courseCode] = (map[n.courseCode] || 0) + 1;
    });
    return map;
  }
}
