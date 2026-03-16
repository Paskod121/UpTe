# Modèle de données — UpTe

---

## 1. Cours (UE)

Définis dans `src/js/constants.js` (données par défaut) ou dans `localStorage` sous la clé `upte_courses` (données personnalisées).

```js
{
  code:    "INF1427",       // string — identifiant unique, format A-Z0-9_ 2–12 chars
  name:    "Structure de Données", // string — 3 à 80 caractères
  credits: 3,               // number — entier 1–10
  prof:    "M. DUPONT",     // string — peut être vide
  salle:   "Amphi A",       // string — peut être vide
  jour:    "Lundi",         // string | null — jour de la semaine ou null si non défini
  start:   "08:00",         // string | null — format HH:MM, requis si jour défini
  end:     "10:00",         // string | null — format HH:MM, requis si jour défini, > start
  color: {
    green: "#22c55e",       // hex — couleur thème vert
    blue:  "#38bdf8",       // hex — couleur thème bleu
    light: "#15803d",       // hex — couleur thème clair
  }
}
```

Les cours ajoutés manuellement ont `color: { green: hex, blue: hex, light: hex }` avec le même hex pour les trois thèmes.

`getActiveCourses()` dans `utils.js` retourne les cours custom si `upte_courses` existe dans localStorage, sinon `COURSES_DATA`.

---

## 2. Sessions de révision

Clé localStorage : `gl_s4_planner_v2` — objet `{ sessions: Session[] }`.

```js
{
  id:         "lxk2f3abc",  // string — identifiant unique base36
  courseCode: "INF1427",    // string — référence au code d'un cours
  date:       "2025-11-03", // string — format YYYY-MM-DD
  duration:   2,            // number — heures, 0.5 à 12
  startTime:  "08:00",      // string — format HH:MM, peut être vide
  type:       "revision",   // string — clé de TYPE_LABELS
  notes:      "Chapitre 3", // string — peut être vide
}
```

Types disponibles : `revision`, `exercices`, `lecture`, `projet`, `tp`.

---

## 3. Paramètres établissement

Clé localStorage : `upte_settings`.

```js
{
  universite: "UNIVERSITÉ DE LOMÉ",  // string — requis, max 60 chars
  ecole:      "EPL",                  // string — requis, max 60 chars
  parcours:   "Licence Pro GL",       // string — requis, max 60 chars
  semestre:   "Semestre 4",           // string — requis, max 30 chars
}
```

Valeurs par défaut définies dans `Storage.DEFAULT_SETTINGS`. Si la clé n'existe pas, les valeurs par défaut sont utilisées.

---

## 4. Thème

Clé localStorage : `upte_theme`.

Valeurs possibles : `"light"` (défaut), `"blue"`, `"green"`.

---

## 5. Règles de validation

Toutes les règles sont dans `src/js/validator.js`. Résumé :

| Champ | Règle |
|---|---|
| `code` cours | `A-Z0-9_`, 2–12 caractères, unique |
| `name` cours | 3–80 caractères |
| `credits` | Entier 1–10 |
| `jour` + `start` + `end` | Si `jour` défini, `start` et `end` requis. `end` > `start`. Durée max 8h. |
| `duration` session | 0.5–12 heures |
| `date` session | Format valide, requis |
| `startTime` session | Format HH:MM, session ne dépasse pas minuit |

---

## 6. Clés localStorage — récapitulatif

| Clé | Contenu | Suppression |
|---|---|---|
| `gl_s4_planner_v2` | Sessions de révision | Manuel ou `Storage.saveSessions([])` |
| `upte_settings` | Paramètres établissement | `Storage.saveSettings(DEFAULT)` |
| `upte_courses` | Cours personnalisés | `Storage.resetCourses()` — revient aux données par défaut |
| `upte_theme` | Thème actif | `localStorage.removeItem("upte_theme")` |