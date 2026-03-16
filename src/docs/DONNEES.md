# Modèle de données — UpTe

---

## 1. Cours (UE)

Source : `constants.js` (défaut) ou `localStorage` clé `upte_courses` (personnalisé).

```js
{
  code:      "INF1427",          // string — A-Z0-9_ 2–12 chars, unique
  name:      "Structure de Données", // string — 3–80 chars
  credits:   3,                  // number — entier 1–10
  prof:      "M. PASKOD",        // string — peut être vide
  salle:     "Amphi A",          // string — peut être vide
  schedules: [                   // tableau de créneaux — peut être vide
    { jour: "Lundi",    start: "08:00", end: "10:00" },
    { jour: "Jeudi",    start: "14:00", end: "16:00" },
  ],
  color: {
    green: "#22c55e",
    blue:  "#38bdf8",
    light: "#15803d",
  }
}
```

Un cours peut avoir zéro, un ou plusieurs créneaux. Chaque créneau spécifie un jour de la semaine et une plage horaire. Il n'y a pas de limite au nombre de créneaux par cours.

### Rétrocompatibilité

L'ancien format (`jour`, `start`, `end` directs sur l'objet) est converti automatiquement par `normalizeCourse()` dans `utils.js` :

```js
// Ancien — toujours lu correctement
{ code: "INF1426", jour: "Lundi", start: "14:00", end: "18:00" }

// Converti en
{ code: "INF1426", schedules: [{ jour: "Lundi", start: "14:00", end: "18:00" }] }
```

Aucune migration manuelle des données localStorage n'est nécessaire.

---

## 2. Sessions de révision

Clé localStorage : `gl_s4_planner_v2` — objet `{ sessions: Session[] }`.

```js
{
  id:         "lxk2f3abc",   // string — base36
  courseCode: "INF1427",     // string — code d'un cours
  date:       "2025-11-03",  // string — YYYY-MM-DD
  duration:   2,             // number — 0.5 à 12
  startTime:  "08:00",       // string — HH:MM, peut être vide
  type:       "revision",    // string — clé de TYPE_LABELS
  notes:      "Chapitre 3",  // string — peut être vide
}
```

Types : `revision`, `exercices`, `lecture`, `projet`, `tp`.

---

## 3. Paramètres établissement

Clé localStorage : `upte_settings`.

```js
{
  universite: "UNIVERSITÉ DE LOMÉ",  // max 60 chars
  ecole:      "EPL",                  // max 60 chars
  parcours:   "Licence Pro GL",       // max 60 chars
  semestre:   "Semestre 4",           // max 30 chars
}
```

Valeurs par défaut dans `Storage.DEFAULT_SETTINGS`.

---

## 4. Documents

Base IndexedDB `upte_docs`, store `documents`.

```js
{
  id:         "abc123",       // string — base36
  courseCode: "INF1427",      // string
  name:       "cours.pdf",    // string — nom du fichier
  type:       "pdf",          // "pdf" | "docx" | "pptx" | "other"
  size:       204800,         // number — octets
  date:       "2025-11-03",   // string — YYYY-MM-DD
  data:       ArrayBuffer,    // contenu binaire du fichier
}
```

Taille max par fichier : 20 Mo.

---

## 5. Notes

Base IndexedDB `upte_notes`, store `notes`.

```js
{
  id:         "xyz789",
  courseCode: "INF1427",
  title:      "Cours du 3 nov.",
  content:    "<h1>...</h1><p>...</p>",  // HTML
  wordCount:  142,
  charCount:  891,
  createdAt:  "2025-11-03T08:00:00.000Z",
  updatedAt:  "2025-11-03T09:12:00.000Z",
}
```

---

## 6. Thème

Clé localStorage : `upte_theme`. Valeurs : `"light"` (défaut), `"blue"`, `"green"`.

---

## 7. Pomodoro — stats

Clé localStorage : `upte_pomo_total`. Nombre entier — total de sessions Pomodoro complétées.

---

## 8. Clés localStorage — récapitulatif

| Clé | Contenu | Réinitialiser |
|---|---|---|
| `gl_s4_planner_v2` | Sessions de révision | `Storage.saveSessions([])` |
| `upte_settings` | Paramètres établissement | `Storage.saveSettings(DEFAULT_SETTINGS)` |
| `upte_courses` | Cours personnalisés | `Storage.resetCourses()` |
| `upte_theme` | Thème actif | `localStorage.removeItem("upte_theme")` |
| `upte_pomo_total` | Compteur Pomodoro | `localStorage.removeItem("upte_pomo_total")` |

## 9. Bases IndexedDB

| Base | Store | Contenu |
|---|---|---|
| `upte_docs` | `documents` | Fichiers PDF/DOCX/PPTX par UE |
| `upte_notes` | `notes` | Notes HTML par UE |

---

## 10. Règles de validation

Toutes dans `src/js/validator.js`.

| Formulaire | Champ | Règle |
|---|---|---|
| Cours | `code` | `A-Z0-9_` 2–12 chars, unique |
| Cours | `name` | 3–80 chars |
| Cours | `credits` | entier 1–10 |
| Cours | `schedules[i]` | jour + start + end requis, end > start, durée ≤ 8h, pas de doublon jour+start |
| Session | `courseCode` | requis |
| Session | `date` | requis, valide |
| Session | `duration` | 0.5–12h |
| Session | `startTime` | HH:MM valide, pas de dépassement minuit |
| Paramètres | tous | requis, limites de longueur |