"use strict";

export const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
export const DAYS_SHORT = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
export const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

export const COURSES_DATA = [
  { code: "INF1427", name: "Structure de Données", credits: 3, prof: "", salle: "", jour: null, start: null, end: null, color: "#22c55e" },
  { code: "INF1428", name: "Modélisation UML", credits: 3, prof: "M. HOETOWOU", salle: "Salle N°2 Amphi Ampah Johnson", jour: "Mardi", start: "10:30", end: "13:30", color: "#16a34a" },
  { code: "INF1425", name: "Généralités sur la sécurité informatique", credits: 3, prof: "M. BARATE", salle: "Salle Enseignement 1 DRSI", jour: "Lundi", start: "07:30", end: "10:30", color: "#15803d" },
  { code: "INF1426", name: "Développement d'applications de bureau", credits: 4, prof: "M. HOETOWOU", salle: "Salle N°2 Amphi Ampah Johnson", jour: "Lundi", start: "14:00", end: "18:00", color: "#4ade80" },
  { code: "INF1429", name: "Normes Documentaires", credits: 4, prof: "M. ANAKPA", salle: "Salle N°2 Ampah Johnson", jour: "Mardi", start: "14:00", end: "18:00", color: "#86efac" },
  { code: "INF1421", name: "Administration de bases de données", credits: 3, prof: "M. SALAMI Morou", salle: "Salle N°2 Amphi Ampah Johnson", jour: "Vendredi", start: "14:30", end: "17:30", color: "#34d399" },
  { code: "1INF1423", name: "Administration Système Linux", credits: 2, prof: "Dr TEPE", salle: "Salle N°2 Amphi Ampah Johnson", jour: "Mercredi", start: "15:00", end: "17:00", color: "#2dd4bf" },
  { code: "2INF1423", name: "Administration Système Windows", credits: 2, prof: "M. BARATE", salle: "Salle Enseignement 1 DRSI", jour: "Jeudi", start: "15:00", end: "17:00", color: "#6ee7b7" },
  { code: "DRT1420", name: "Droit de l'Informatique", credits: 2, prof: "M. Kokohou", salle: "Salle N°2 Amphi Ampah Johnson", jour: "Vendredi", start: "07:30", end: "09:30", color: "#a7f3d0" },
  { code: "CPT1420", name: "Comptabilité Générale de base", credits: 2, prof: "M. LAWSON BODY", salle: "Salle N°2 Amphi Ampah Johnson", jour: "Vendredi", start: "10:00", end: "12:00", color: "#bbf7d0" },
  { code: "UE_LIBRE", name: "UE Libre", credits: 2, prof: "", salle: "", jour: null, start: null, end: null, color: "#6b7f68" },
];

export const TYPE_COLORS = { revision: "#16a34a", exercices: "#d97706", lecture: "#2563eb", projet: "#7c3aed", tp: "#dc2626" };
export const TYPE_LABELS = { revision: "Révision", exercices: "Exercices", lecture: "Lecture", projet: "Projet", tp: "TP" };
