"use strict";

/**
 * Combo — composant combobox custom
 * Remplace les <datalist> natifs pour un rendu cohérent avec les thèmes.
 */
export class Combo {
  static _activeId = null;

  static init() {
    // Initialise toutes les dropdowns au chargement
    document.querySelectorAll(".combo-dropdown[data-options]").forEach((el) => {
      const wrapId = el.closest(".combo-wrap")?.id;
      if (wrapId) this._buildList(wrapId, "");
    });

    // Ferme si clic en dehors
    document.addEventListener("mousedown", (e) => {
      if (!e.target.closest(".combo-wrap")) {
        this._closeAll();
      }
    });
  }

  static _getOptions(wrapId) {
    const list = document.getElementById(`${wrapId}-list`);
    if (!list) return [];
    try {
      return JSON.parse(list.dataset.options || "[]");
    } catch {
      return [];
    }
  }

  static _buildList(wrapId, query) {
    const list = document.getElementById(`${wrapId}-list`);
    const options = this._getOptions(wrapId);
    const q = query.toLowerCase().trim();
    const filtered = q
      ? options.filter((o) => o.toLowerCase().includes(q))
      : options;

    if (filtered.length === 0) {
      list.innerHTML = `<div class="combo-option no-results">Aucun résultat — saisie libre acceptée</div>`;
      return;
    }

    list.innerHTML = filtered
      .map(
        (o) =>
          `<div class="combo-option" onmousedown="Combo.select('${wrapId}','${o.replace(/'/g, "\\'")}')">
        ${o}
      </div>`,
      )
      .join("");
  }

  static open(wrapId) {
    const wrap = document.getElementById(wrapId);
    const input = document.getElementById(wrapId.replace("combo-", "set-"));
    if (!wrap) return;
    this._closeAll();
    wrap.classList.add("open");
    this._activeId = wrapId;
    this._buildList(wrapId, input?.value || "");
  }

  static blur(wrapId) {
    // Délai pour laisser le mousedown sur une option s'exécuter
    setTimeout(() => {
      const wrap = document.getElementById(wrapId);
      if (wrap) wrap.classList.remove("open");
      if (this._activeId === wrapId) this._activeId = null;
    }, 180);
  }

  static filter(wrapId) {
    const input = document.getElementById(wrapId.replace("combo-", "set-"));
    const wrap = document.getElementById(wrapId);
    if (wrap && !wrap.classList.contains("open")) wrap.classList.add("open");
    this._buildList(wrapId, input?.value || "");
  }

  static select(wrapId, value) {
    const input = document.getElementById(wrapId.replace("combo-", "set-"));
    if (input) input.value = value;
    const wrap = document.getElementById(wrapId);
    if (wrap) wrap.classList.remove("open");
    this._activeId = null;
  }

  static _closeAll() {
    document
      .querySelectorAll(".combo-wrap.open")
      .forEach((w) => w.classList.remove("open"));
    this._activeId = null;
  }
}