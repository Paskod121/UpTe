"use strict";

export const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
export const DAYS_SHORT = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
export const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

export const COURSES_DATA = [
  {
    code: "INF1427", name: "Structure de Données", credits: 3,
    prof: "", salle: "", jour: null, start: null, end: null,
    color: { green: "#22c55e", blue: "#38bdf8" },
  },
  {
    code: "INF1428", name: "Modélisation UML", credits: 3,
    prof: "M. HOETOWOU", salle: "Salle N°2 Amphi Ampah Johnson", jour: "Mardi", start: "10:30", end: "13:30",
    color: { green: "#16a34a", blue: "#0ea5e9" },
  },
  {
    code: "INF1425", name: "Généralités sur la sécurité informatique", credits: 3,
    prof: "M. BARATE", salle: "Salle Enseignement 1 DRSI", jour: "Lundi", start: "07:30", end: "10:30",
    color: { green: "#15803d", blue: "#0284c7" },
  },
  {
    code: "INF1426", name: "Développement d'applications de bureau", credits: 4,
    prof: "M. HOETOWOU", salle: "Salle N°2 Amphi Ampah Johnson", jour: "Lundi", start: "14:00", end: "18:00",
    color: { green: "#4ade80", blue: "#7dd3fc" },
  },
  {
    code: "INF1429", name: "Normes Documentaires", credits: 4,
    prof: "M. ANAKPA", salle: "Salle N°2 Ampah Johnson", jour: "Mardi", start: "14:00", end: "18:00",
    color: { green: "#86efac", blue: "#bae6fd" },
  },
  {
    code: "INF1421", name: "Administration de bases de données", credits: 3,
    prof: "M. SALAMI Morou", salle: "Salle N°2 Amphi Ampah Johnson", jour: "Vendredi", start: "14:30", end: "17:30",
    color: { green: "#34d399", blue: "#22d3ee" },
  },
  {
    code: "1INF1423", name: "Administration Système Linux", credits: 2,
    prof: "Dr TEPE", salle: "Salle N°2 Amphi Ampah Johnson", jour: "Mercredi", start: "15:00", end: "17:00",
    color: { green: "#2dd4bf", blue: "#67e8f9" },
  },
  {
    code: "2INF1423", name: "Administration Système Windows", credits: 2,
    prof: "M. BARATE", salle: "Salle Enseignement 1 DRSI", jour: "Jeudi", start: "15:00", end: "17:00",
    color: { green: "#6ee7b7", blue: "#a5f3fc" },
  },
  {
    code: "DRT1420", name: "Droit de l'Informatique", credits: 2,
    prof: "M. Kokohou", salle: "Salle N°2 Amphi Ampah Johnson", jour: "Vendredi", start: "07:30", end: "09:30",
    color: { green: "#a7f3d0", blue: "#e0f2fe" },
  },
  {
    code: "CPT1420", name: "Comptabilité Générale de base", credits: 2,
    prof: "M. LAWSON BODY", salle: "Salle N°2 Amphi Ampah Johnson", jour: "Vendredi", start: "10:00", end: "12:00",
    color: { green: "#bbf7d0", blue: "#f0f9ff" },
  },
  {
    code: "UE_LIBRE", name: "UE Libre", credits: 2,
    prof: "", salle: "", jour: null, start: null, end: null,
    color: { green: "#6b7f68", blue: "#4a6a8a" },
  },
];

export const TYPE_COLORS = {
  revision:  { green: "#16a34a", blue: "#0ea5e9" },
  exercices: { green: "#d97706", blue: "#d97706" },
  lecture:   { green: "#2563eb", blue: "#6366f1" },
  projet:    { green: "#7c3aed", blue: "#8b5cf6" },
  tp:        { green: "#dc2626", blue: "#dc2626" },
};

export const TYPE_LABELS = {
  revision: "Révision", exercices: "Exercices",
  lecture: "Lecture", projet: "Projet", tp: "TP",
};