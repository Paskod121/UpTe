"use strict";

/**
 * validator.js — Validation centralisée des entrées utilisateur
 * Toutes les règles métier sont ici. app.js appelle ces fonctions
 * et affiche les erreurs retournées.
 */

import { esc } from "./utils.js";

/* ══════════════════════════════════════════════
   HELPERS INTERNES
══════════════════════════════════════════════ */

function timeToMin(t) {
  if (!t) return null;
  const parts = t.split(":");
  if (parts.length !== 2) return null;
  const [h, m] = parts.map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

function isEmpty(v) {
  return !v || v.trim() === "";
}

/* ══════════════════════════════════════════════
   AFFICHAGE DES ERREURS — UI helpers
══════════════════════════════════════════════ */

/**
 * Affiche ou masque un message d'erreur sous un champ.
 * @param {string} fieldId   — id du champ input/select
 * @param {string|null} msg  — message d'erreur, ou null pour effacer
 */
export function setFieldError(fieldId, msg) {
  const field = document.getElementById(fieldId);
  if (!field) return;

  // Cherche un élément d'erreur associé (convention : id = "err-" + fieldId)
  let errEl = document.getElementById("err-" + fieldId);

  // Si pas d'élément dédié, on en crée un dynamiquement sous le champ
  if (!errEl) {
    errEl = document.createElement("div");
    errEl.id = "err-" + fieldId;
    errEl.className = "form-error";
    field.parentNode.insertBefore(errEl, field.nextSibling);
  }

  if (msg) {
    errEl.textContent = msg;
    errEl.classList.add("show");
    field.classList.add("field-invalid");
  } else {
    errEl.textContent = "";
    errEl.classList.remove("show");
    field.classList.remove("field-invalid");
  }
}

/**
 * Efface toutes les erreurs d'un tableau d'ids de champs.
 */
export function clearErrors(fieldIds) {
  fieldIds.forEach(id => setFieldError(id, null));
}

/* ══════════════════════════════════════════════
   RÈGLES MÉTIER
══════════════════════════════════════════════ */

/**
 * Valide le formulaire d'ajout / modification d'une session de révision.
 * @param {object} data — { courseCode, date, duration, startTime }
 * @param {string} prefix — "study" ou "editStudy" (pour les ids des champs)
 * @returns {boolean} true si valide
 */
export function validateStudySession(data, prefix) {
  const fields = [
    `${prefix}Course`,
    `${prefix}Date`,
    `${prefix}Duration`,
    `${prefix}StartTime`,
  ];
  clearErrors(fields);

  let valid = true;

  if (isEmpty(data.courseCode)) {
    setFieldError(`${prefix}Course`, "Veuillez sélectionner un cours.");
    valid = false;
  }

  if (isEmpty(data.date)) {
    setFieldError(`${prefix}Date`, "La date est requise.");
    valid = false;
  } else {
    const d = new Date(data.date);
    if (isNaN(d.getTime())) {
      setFieldError(`${prefix}Date`, "Date invalide.");
      valid = false;
    }
  }

  const dur = parseFloat(data.duration);
  if (isNaN(dur) || dur < 0.5 || dur > 12) {
    setFieldError(`${prefix}Duration`, "Durée entre 0.5 et 12 heures.");
    valid = false;
  }

  if (!isEmpty(data.startTime)) {
    const startMin = timeToMin(data.startTime);
    if (startMin === null) {
      setFieldError(`${prefix}StartTime`, "Format d'heure invalide (HH:MM).");
      valid = false;
    } else if (!isNaN(dur) && dur > 0) {
      const endMin = startMin + dur * 60;
      if (endMin > 24 * 60) {
        setFieldError(`${prefix}StartTime`, "La session dépasse minuit.");
        valid = false;
      }
    }
  }

  return valid;
}

/**
 * Valide le formulaire d'ajout / modification d'un cours.
 * @param {object} data — { code, name, credits, jour, start, end }
 * @param {string} prefix — "add" ou "edit"
 * @param {string|null} origCode — code original (edit) pour détecter les doublons
 * @param {Array} existingCourses — liste des cours actifs
 * @returns {boolean} true si valide
 */
export function validateCourse(data, prefix, origCode, existingCourses) {
  const fields = [
    `${prefix}-code`,
    `${prefix}-name`,
    `${prefix}-credits`,
    `${prefix}-start`,
    `${prefix}-end`,
  ];
  clearErrors(fields);

  let valid = true;

  // Code
  if (isEmpty(data.code)) {
    setFieldError(`${prefix}-code`, "Le code UE est requis.");
    valid = false;
  } else if (!/^[A-Z0-9_]{2,12}$/.test(data.code)) {
    setFieldError(`${prefix}-code`, "Code : 2–12 caractères, majuscules, chiffres ou _ uniquement.");
    valid = false;
  } else {
    // Doublon — on ignore si c'est le même code en mode édition
    const duplicate = existingCourses.find(c => c.code === data.code && c.code !== origCode);
    if (duplicate) {
      setFieldError(`${prefix}-code`, "Ce code existe déjà.");
      valid = false;
    }
  }

  // Nom
  if (isEmpty(data.name)) {
    setFieldError(`${prefix}-name`, "L'intitulé du cours est requis.");
    valid = false;
  } else if (data.name.trim().length < 3) {
    setFieldError(`${prefix}-name`, "L'intitulé doit contenir au moins 3 caractères.");
    valid = false;
  } else if (data.name.trim().length > 80) {
    setFieldError(`${prefix}-name`, "L'intitulé ne peut pas dépasser 80 caractères.");
    valid = false;
  }

  // Crédits
  const credits = parseInt(data.credits);
  if (isNaN(credits) || credits < 1 || credits > 10) {
    setFieldError(`${prefix}-credits`, "Crédits entre 1 et 10.");
    valid = false;
  }

  // Horaire — cohérence jour / start / end
  const hasJour  = !isEmpty(data.jour);
  const hasStart = !isEmpty(data.start);
  const hasEnd   = !isEmpty(data.end);

  if (hasJour && (!hasStart || !hasEnd)) {
    if (!hasStart) setFieldError(`${prefix}-start`, "Heure de début requise si un jour est sélectionné.");
    if (!hasEnd)   setFieldError(`${prefix}-end`,   "Heure de fin requise si un jour est sélectionné.");
    valid = false;
  }

  if (hasStart && hasEnd) {
    const startMin = timeToMin(data.start);
    const endMin   = timeToMin(data.end);
    if (startMin === null) {
      setFieldError(`${prefix}-start`, "Format d'heure invalide (HH:MM).");
      valid = false;
    } else if (endMin === null) {
      setFieldError(`${prefix}-end`, "Format d'heure invalide (HH:MM).");
      valid = false;
    } else if (endMin <= startMin) {
      setFieldError(`${prefix}-end`, "L'heure de fin doit être après l'heure de début.");
      valid = false;
    } else if ((endMin - startMin) > 8 * 60) {
      setFieldError(`${prefix}-end`, "Un cours ne peut pas dépasser 8 heures.");
      valid = false;
    }
  }

  if (!hasJour && (hasStart || hasEnd)) {
    // start/end sans jour — on efface silencieusement, pas une erreur bloquante
    // mais on prévient l'utilisateur
    if (!hasJour && hasStart) {
      setFieldError(`${prefix}-start`, "Sélectionnez un jour pour que cet horaire soit pris en compte.");
      valid = false;
    }
  }

  return valid;
}

/**
 * Valide le formulaire des paramètres établissement.
 * @param {object} data — { universite, ecole, parcours, semestre }
 * @returns {boolean} true si valide
 */
export function validateSettings(data) {
  const fields = ["set-universite", "set-ecole", "set-parcours", "set-semestre"];
  clearErrors(fields);

  let valid = true;

  if (isEmpty(data.universite)) {
    setFieldError("set-universite", "Le nom de l'université est requis.");
    valid = false;
  } else if (data.universite.trim().length > 60) {
    setFieldError("set-universite", "60 caractères maximum.");
    valid = false;
  }

  if (isEmpty(data.ecole)) {
    setFieldError("set-ecole", "Le nom de l'école ou faculté est requis.");
    valid = false;
  } else if (data.ecole.trim().length > 60) {
    setFieldError("set-ecole", "60 caractères maximum.");
    valid = false;
  }

  if (isEmpty(data.parcours)) {
    setFieldError("set-parcours", "Le parcours est requis.");
    valid = false;
  } else if (data.parcours.trim().length > 60) {
    setFieldError("set-parcours", "60 caractères maximum.");
    valid = false;
  }

  if (isEmpty(data.semestre)) {
    setFieldError("set-semestre", "Le semestre est requis.");
    valid = false;
  } else if (data.semestre.trim().length > 30) {
    setFieldError("set-semestre", "30 caractères maximum.");
    valid = false;
  }

  return valid;
}