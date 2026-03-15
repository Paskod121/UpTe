"use strict";

import { COURSES_DATA, DAYS, MONTHS } from "./constants.js";

export function timeToMin(t) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function minToTime(m) {
  const h = Math.floor(m / 60), mn = m % 60;
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

export function courseByCode(code) {
  return COURSES_DATA.find((c) => c.code === code);
}

export function getTheme() {
  try {
    const t = localStorage.getItem("upte_theme");
    return t === "blue" ? "blue" : "green";
  } catch {
    return "green";
  }
}

export function courseColor(course) {
  if (!course) return "#4ade80";
  const t = getTheme();
  return typeof course.color === "object"
    ? (course.color[t] ?? course.color.green)
    : course.color;
}

export function typeColor(typeColors) {
  if (!typeColors) return "#4ade80";
  const t = getTheme();
  return typeof typeColors === "object"
    ? (typeColors[t] ?? typeColors.green)
    : typeColors;
}