"use strict";

import { COURSES_DATA, DAYS, MONTHS } from "./constants.js";
import { Storage } from "./storage.js";

export function timeToMin(t) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
export function minToTime(m) {
  const h = Math.floor(m / 60), mn = m % 60;
  return `${String(h).padStart(2,"0")}:${String(mn).padStart(2,"0")}`;
}
export function formatDate(d) {
  const dt = new Date(d);
  return `${DAYS[dt.getDay()]} ${dt.getDate()} ${MONTHS[dt.getMonth()]}`;
}
export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
export function uniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2,7);
}
export function esc(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

/** Retourne les cours actifs : personnalisés si définis, sinon les données par défaut */
export function getActiveCourses() {
  const custom = Storage.getCustomCourses();
  return custom !== null ? custom : COURSES_DATA;
}

/** Cherche un cours par code dans les cours actifs */
export function courseByCode(code) {
  return getActiveCourses().find((c) => c.code === code);
}

/** Retourne le thème actif : "green" | "blue" | "light" */
export function getTheme() {
  try {
    const t = localStorage.getItem("upte_theme");
    if (t === "blue")  return "blue";
    if (t === "light") return "light";
    return "green";
  } catch { return "green"; }
}

/** Retourne la couleur d'un cours selon le thème actif */
export function courseColor(course) {
  if (!course) return "#16a34a";
  const t = getTheme();
  if (typeof course.color === "object") return course.color[t] ?? course.color.green ?? "#16a34a";
  return course.color;
}

/** Retourne la couleur d'un type de session selon le thème actif */
export function typeColor(typeColors) {
  if (!typeColors) return "#16a34a";
  const t = getTheme();
  if (typeof typeColors === "object") return typeColors[t] ?? typeColors.green ?? "#16a34a";
  return typeColors;
}