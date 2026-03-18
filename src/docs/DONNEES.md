# Modèle de données — UpTe

---

## 1. Cours (UE)

```js
{
  code:      "INF1427",
  name:      "Structure de Données",
  credits:   3,
  prof:      "M. PASKOD",
  salle:     "Amphi A",
  schedules: [
    { jour: "Lundi",    start: "08:00", end: "10:00" },
    { jour: "Samedi",   start: "09:00", end: "11:00" },
  ],
  color: { green: "#22c55e", blue: "#38bdf8", light: "#15803d" }
}
```

Jours disponibles : Lundi, Mardi, Mercredi, Jeudi, Vendredi, **Samedi, Dimanche**.
Plage horaire : **06h00 – 21h00**.

Rétrocompatibilité : `normalizeCourse()` convertit l'ancien format `{ jour, start, end }` à la volée.

---

## 2. Sessions de révision

Clé : `gl_s4_planner_v2` → `{ sessions: [] }`

```js
{
  id, courseCode, date, duration,  // 0.5–12h
  startTime, type, notes
}
```

---

## 3. Paramètres établissement

Clé : `upte_settings`

```js
{
  universite: "UNIVERSITÉ DE LOMÉ",
  ecole:      "EPL",
  parcours:   "Licence Pro GL",
  semestre:   "Semestre 4",
  annee:      "2025–2026",          // nouveau champ
}
```

Champs avec suggestions via combobox custom (non bloquant — saisie libre acceptée).

---

## 4. Documents

IndexedDB `upte_docs` / store `documents` — PDF, DOCX, PPTX, max 20 Mo.

---

## 5. Notes

IndexedDB `upte_notes` / store `notes` — HTML, sauvegarde auto, export.

---

## 6. Clés localStorage

| Clé | Contenu | Réinitialiser |
|---|---|---|
| `gl_s4_planner_v2` | Sessions | `Storage.saveSessions([])` |
| `upte_settings` | Établissement + année | `Storage.saveSettings(DEFAULT)` |
| `upte_courses` | Cours custom | `Storage.resetCourses()` |
| `upte_courses_backup` | Sauvegarde temporaire (30s) | Auto-supprimée après 30s |
| `upte_theme` | `"light"` \| `"blue"` \| `"green"` | `localStorage.removeItem` |
| `upte_pomo_total` | Compteur Pomodoro | `localStorage.removeItem` |

---

## 7. Bases IndexedDB

| Base | Store | Contenu |
|---|---|---|
| `upte_docs` | `documents` | Fichiers par UE |
| `upte_notes` | `notes` | Notes HTML par UE |

---

## 8. Règles de validation

| Formulaire | Champ | Règle |
|---|---|---|
| Cours | `code` | `A-Z0-9_` 2–12 chars, unique |
| Cours | `name` | 3–80 chars |
| Cours | `credits` | 1–10 |
| Cours | `schedules[i]` | jour + start + end, end > start, max 8h, pas de doublon |
| Session | `duration` | 0.5–12h |
| Session | `date` | valide, requis |
| Paramètres | tous | requis, limites longueur |