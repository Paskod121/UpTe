"use strict";

import { COURSES_DATA, DAYS, MONTHS } from "./constants.js";
import { Storage } from "./storage.js";

export function timeToMin(t) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
export function minToTime(m) {
  const h = Math.floor(m / 60),
    mn = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mn).padStart(2, "0")}`;
}
export function formatDate(d) {
  const dt = new Date(d);
  return `${DAYS[dt.getDay()]} ${dt.getDate()} ${MONTHS[dt.getMonth()]}`;
}
export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function uniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
export function esc(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

/**
 * Normalise un cours vers le nouveau format schedules[].
 * Assure la rétrocompatibilité avec les anciens cours { jour, start, end }.
 */
export function normalizeCourse(c) {
  if (Array.isArray(c.schedules)) return c;
  // Ancien format — migration à la volée
  const schedules =
    c.jour && c.start && c.end
      ? [{ jour: c.jour, start: c.start, end: c.end }]
      : [];
  return { ...c, schedules };
}

/** Retourne les cours actifs normalisés */
export function getActiveCourses() {
  const raw =
    Storage.getCustomCourses() !== null
      ? Storage.getCustomCourses()
      : COURSES_DATA;
  return raw.map(normalizeCourse);
}

export function courseByCode(code) {
  return getActiveCourses().find((c) => c.code === code);
}

/** Retourne tous les créneaux d'un cours sous forme plate */
export function getCourseSchedules(c) {
  return normalizeCourse(c).schedules || [];
}

/** Retourne les créneaux d'un cours pour un jour donné */
export function getSchedulesForDay(c, jour) {
  return getCourseSchedules(c).filter((s) => s.jour === jour);
}

/** Retourne tous les cours qui ont au moins un créneau un jour donné */
export function getCoursesForDay(courses, jour) {
  return courses.filter((c) => getSchedulesForDay(c, jour).length > 0);
}

/** Retourne le thème actif : "green" | "blue" | "light" */
export function getTheme() {
  try {
    const t = localStorage.getItem("upte_theme");
    if (t === "blue")  return "blue";
    if (t === "green") return "green";
    return "light";
  } catch {
    return "light";
  }
}

export function courseColor(course) {
  if (!course) return "#16a34a";
  const t = getTheme();
  if (typeof course.color === "object")
    return course.color[t] ?? course.color.green ?? "#16a34a";
  return course.color;
}

export function typeColor(typeColors) {
  if (!typeColors) return "#16a34a";
  const t = getTheme();
  if (typeof typeColors === "object")
    return typeColors[t] ?? typeColors.green ?? "#16a34a";
  return typeColors;
}
