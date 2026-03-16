# Architecture — UpTe

Structure technique du projet, modules JavaScript, flux de données et choix de conception.

---

## Structure des fichiers

```
UpTe/
├── index.html
├── manifest.json
├── README.md
├── CHANGELOG.md
├── LICENSE
└── src/
    ├── css/
    │   ├── main.css        @import uniquement
    │   ├── variables.css   custom properties et thèmes
    │   ├── layout.css      sidebar, topbar, grilles, responsive
    │   ├── components.css  cards, slots, modales, formulaires, toasts, validation
    │   ├── utilities.css   boutons, tags, animations, helpers, settings, schedule builder
    │   └── learning.css    pomodoro, documents, éditeur de notes
    ├── js/
    │   ├── main.js         point d'entrée — expose App/UI/Learn/Notes sur window
    │   ├── constants.js    données statiques — COURSES_DATA avec schedules[]
    │   ├── storage.js      persistance localStorage (sessions, settings, cours custom)
    │   ├── utils.js        fonctions utilitaires + helpers schedules
    │   ├── validator.js    validation centralisée de tous les formulaires
    │   ├── ui.js           navigation, thèmes, modales, toasts, calendrier, tips
    │   ├── app.js          logique métier complète
    │   ├── learn.js        pomodoro + bibliothèque de documents (IndexedDB)
    │   └── notes.js        éditeur de notes riche (IndexedDB)
    ├── fonts/
    ├── images/
    ├── videos/
    └── docs/
```

---

## CSS — organisation modulaire

| Fichier | Contenu |
|---|---|
| `variables.css` | `:root`, `[data-theme="blue"]`, `[data-theme="light"]` |
| `layout.css` | Sidebar, topbar, grilles de pages, responsive |
| `components.css` | Cards, slots, modales, formulaires, toasts, `.field-invalid` |
| `utilities.css` | Boutons, tags, animations, helpers, settings list, color picker, schedule builder |
| `learning.css` | Pomodoro, documents (viewer PDF/DOCX/PPTX), éditeur de notes |

---

## Modules JavaScript

### `constants.js`

```js
// Nouveau format — créneaux multiples
COURSES_DATA = [{
  code, name, credits, prof, salle,
  schedules: [{ jour, start, end }, ...],  // tableau, peut être vide
  color: { green, blue, light }
}]

TYPE_COLORS = { revision: { green, blue, light }, ... }
TYPE_LABELS = { revision: "Révision", ... }
WEEK_DAYS   = ["Lundi", ..., "Vendredi"]
```

### `storage.js`

Trois clés localStorage :

```
gl_s4_planner_v2    sessions de révision
upte_settings       { universite, ecole, parcours, semestre }
upte_courses        cours personnalisés ou null (= COURSES_DATA par défaut)
```

### `utils.js`

```
timeToMin / minToTime / formatDate / todayStr / uniqueId / esc
normalizeCourse(c)              migration à la volée ancien→nouveau format
getActiveCourses()              cours custom normalisés ou COURSES_DATA normalisé
courseByCode(code)              cherche dans getActiveCourses()
getCourseSchedules(c)           → Schedule[]
getSchedulesForDay(c, jour)     → Schedule[] filtrés par jour
getCoursesForDay(courses, jour) → Course[] ayant un créneau ce jour
getTheme()                      → "green" | "blue" | "light"
courseColor(course)             → hex selon thème actif
typeColor(typeColors)           → hex selon thème actif
```

### `validator.js`

Validation centralisée. Toutes les règles métier sont ici.

```
validateStudySession(data, prefix)              → boolean
validateCourse(data, prefix, origCode, courses) → boolean
validateSettings(data)                          → boolean
setFieldError(fieldId, msg)                     → affiche erreur sous le champ
clearErrors(fieldIds)                           → efface les erreurs
```

Règles cours (nouveau) :

| Champ | Règle |
|---|---|
| `code` | `A-Z0-9_` 2–12 chars, unique |
| `name` | 3–80 chars |
| `credits` | entier 1–10 |
| `schedules[i].jour` | requis si la ligne existe |
| `schedules[i].start` | requis, format HH:MM |
| `schedules[i].end` | requis, > start, durée max 8h |
| doublon | deux créneaux ne peuvent pas avoir le même jour+heure de début |

### `ui.js`

Navigation, thèmes, modales, toasts, mini-calendrier, tips.

Cycle des thèmes : `light` → `blue` → `green`. Thème par défaut : `light`.

`_rerenderAll()` — re-rend tous les composants avec couleurs inline après changement de thème, incluant les pages learn et notes si actives.

Pages gérées : `dashboard`, `schedule`, `courses`, `planner`, `tips`, `settings`, `learn`, `notes`.

### `app.js`

Logique métier complète. Points clés :

- Toutes les lectures de créneaux passent par `getCourseSchedules()` et `getSchedulesForDay()` — jamais `c.jour` directement.
- `_scheduleRows` — state temporaire du schedule builder pendant l'édition d'un cours.
- `_renderScheduleBuilder(containerId, schedules)` — construit le formulaire dynamique de créneaux.
- `_addScheduleRow / _removeScheduleRow / _updateScheduleRow` — CRUD des lignes du builder.
- `currentCourseCode` — mémorise le cours ouvert pour pré-remplir la modale session.

### `learn.js`

Pomodoro (WebAudio, stats localStorage) + bibliothèque de documents par UE (IndexedDB `upte_docs`). Librairies chargées à la demande : PDF.js, mammoth.js, JSZip.

### `notes.js`

Éditeur de notes riche par UE (IndexedDB `upte_notes`). API native `contenteditable` + `document.execCommand`. Sauvegarde auto 1.2s, export HTML, plein écran.

---

## Modèle de données — Cours

### Ancien format (rétrocompatible)
```js
{ code, name, credits, prof, salle, jour, start, end, color }
```

### Nouveau format (actif)
```js
{ code, name, credits, prof, salle, schedules: [{ jour, start, end }], color: { green, blue, light } }
```

`normalizeCourse()` convertit automatiquement l'ancien format au chargement. Les données localStorage au format ancien continuent de fonctionner sans migration manuelle.

---

## Flux de données

```
getActiveCourses() → normalizeCourse() → cours avec schedules[]
        ↓
App.render*() — lit aussi Storage.getSessions() et Storage.getSettings()
        ↓
DOM (innerHTML, style inline)
        ↑
onclick → App.xxx() / UI.xxx()
        ↓
validator.js → boolean + affichage erreurs
        ↓ si valide
Storage.save*() → localStorage
        ↓
_afterCoursesChange() / renderDashboard() / renderPlanner() — re-rendu immédiat
```

---

## Palettes couleurs

```js
color: { green: "#22c55e", blue: "#38bdf8", light: "#15803d" }
// courseColor(c) lit c.color[getTheme()]
```

Cours ajoutés manuellement : `{ green: hex, blue: hex, light: hex }`.

---

## PWA

`manifest.json`, `theme-color` mis à jour par `applyTheme()`. Pas de service worker.