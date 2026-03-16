"use strict";

import { esc } from "./utils.js";

function timeToMin(t) {
  if (!t) return null;
  const parts = t.split(":");
  if (parts.length !== 2) return null;
  const [h, m] = parts.map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}
function isEmpty(v) {
  return !v || String(v).trim() === "";
}

export function setFieldError(fieldId, msg) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  let errEl = document.getElementById("err-" + fieldId);
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

export function clearErrors(fieldIds) {
  fieldIds.forEach((id) => setFieldError(id, null));
}

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
  } else if (isNaN(new Date(data.date).getTime())) {
    setFieldError(`${prefix}Date`, "Date invalide.");
    valid = false;
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
    } else if (!isNaN(dur) && dur > 0 && startMin + dur * 60 > 24 * 60) {
      setFieldError(`${prefix}StartTime`, "La session dépasse minuit.");
      valid = false;
    }
  }
  return valid;
}

/**
 * Valide un cours avec schedules[].
 * @param {object} data — { code, name, credits, schedules: [{jour,start,end}] }
 */
export function validateCourse(data, prefix, origCode, existingCourses) {
  // Effacer les erreurs des champs fixes
  const fixedFields = [`${prefix}-code`, `${prefix}-name`, `${prefix}-credits`];
  clearErrors(fixedFields);

  // Effacer les erreurs des créneaux dynamiques
  (data.schedules || []).forEach((_, i) => {
    clearErrors([
      `${prefix}-jour-${i}`,
      `${prefix}-start-${i}`,
      `${prefix}-end-${i}`,
    ]);
  });

  let valid = true;

  // Code
  if (isEmpty(data.code)) {
    setFieldError(`${prefix}-code`, "Le code UE est requis.");
    valid = false;
  } else if (!/^[A-Z0-9_]{2,12}$/.test(data.code)) {
    setFieldError(
      `${prefix}-code`,
      "Code : 2–12 caractères, majuscules, chiffres ou _ uniquement.",
    );
    valid = false;
  } else {
    const dup = existingCourses.find(
      (c) => c.code === data.code && c.code !== origCode,
    );
    if (dup) {
      setFieldError(`${prefix}-code`, "Ce code existe déjà.");
      valid = false;
    }
  }

  // Nom
  if (isEmpty(data.name)) {
    setFieldError(`${prefix}-name`, "L'intitulé est requis.");
    valid = false;
  } else if (data.name.trim().length < 3) {
    setFieldError(`${prefix}-name`, "Au moins 3 caractères.");
    valid = false;
  } else if (data.name.trim().length > 80) {
    setFieldError(`${prefix}-name`, "80 caractères maximum.");
    valid = false;
  }

  // Crédits
  const cr = parseInt(data.credits);
  if (isNaN(cr) || cr < 1 || cr > 10) {
    setFieldError(`${prefix}-credits`, "Crédits entre 1 et 10.");
    valid = false;
  }

  // Créneaux
  const seenSlots = new Set();
  (data.schedules || []).forEach((s, i) => {
    const hasJour = !isEmpty(s.jour);
    const hasStart = !isEmpty(s.start);
    const hasEnd = !isEmpty(s.end);

    if (!hasJour) {
      setFieldError(`${prefix}-jour-${i}`, "Jour requis.");
      valid = false;
    }
    if (!hasStart) {
      setFieldError(`${prefix}-start-${i}`, "Heure de début requise.");
      valid = false;
    }
    if (!hasEnd) {
      setFieldError(`${prefix}-end-${i}`, "Heure de fin requise.");
      valid = false;
    }

    if (hasStart && hasEnd) {
      const sm = timeToMin(s.start),
        em = timeToMin(s.end);
      if (sm === null) {
        setFieldError(`${prefix}-start-${i}`, "Format invalide (HH:MM).");
        valid = false;
      } else if (em === null) {
        setFieldError(`${prefix}-end-${i}`, "Format invalide (HH:MM).");
        valid = false;
      } else if (em <= sm) {
        setFieldError(`${prefix}-end-${i}`, "La fin doit être après le début.");
        valid = false;
      } else if (em - sm > 8 * 60) {
        setFieldError(`${prefix}-end-${i}`, "Durée max 8h par créneau.");
        valid = false;
      }
    }

    // Doublon de créneau sur le même jour/heure
    if (hasJour && hasStart) {
      const key = `${s.jour}-${s.start}`;
      if (seenSlots.has(key)) {
        setFieldError(`${prefix}-jour-${i}`, "Créneau en double.");
        valid = false;
      }
      seenSlots.add(key);
    }
  });

  return valid;
}

export function validateSettings(data) {
  const fields = [
    "set-universite",
    "set-ecole",
    "set-parcours",
    "set-semestre",
  ];
  clearErrors(fields);
  let valid = true;

  const rules = [
    { id: "set-universite", label: "université", max: 60 },
    { id: "set-ecole", label: "école", max: 60 },
    { id: "set-parcours", label: "parcours", max: 60 },
    { id: "set-semestre", label: "semestre", max: 30 },
  ];
  rules.forEach((r) => {
    const val = data[r.id.replace("set-", "")];
    if (isEmpty(val)) {
      setFieldError(r.id, `Le champ ${r.label} est requis.`);
      valid = false;
    } else if (val.trim().length > r.max) {
      setFieldError(r.id, `${r.max} caractères maximum.`);
      valid = false;
    }
  });
  return valid;
}
