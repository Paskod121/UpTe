# Architecture — UpTe

Structure technique du projet, modules JavaScript, flux de données et choix de conception.

---

## Structure des fichiers

```
UpTe/
├── index.html              point d'entrée — structure HTML, modales, scripts
├── manifest.json           configuration PWA
├── README.md
├── CHANGELOG.md
├── LICENSE
└── src/
    ├── css/
    │   ├── main.css        point d'entrée CSS — @import uniquement
    │   ├── variables.css   custom properties (:root) et thèmes (data-theme)
    │   ├── layout.css      structure globale : sidebar, topbar, grilles, responsive
    │   ├── components.css  composants : cards, slots, modales, formulaires, toasts, tips
    │   └── utilities.css   boutons, tags, animations, helpers, settings, color picker
    ├── js/
    │   ├── main.js         point d'entrée — expose App/UI sur window, lance init
    │   ├── constants.js    données statiques : DAYS, MONTHS, COURSES_DATA, TYPE_*
    │   ├── storage.js      persistance localStorage (sessions, settings, cours custom)
    │   ├── utils.js        fonctions utilitaires pures
    │   ├── validator.js    validation centralisée de tous les formulaires
    │   ├── ui.js           interface : navigation, thème, modales, toasts, calendrier, tips
    │   └── app.js          logique métier : dashboard, emploi du temps, planificateur, settings
    ├── fonts/
    ├── images/
    ├── videos/
    └── docs/
```

---

## CSS — organisation modulaire

| Fichier | Contenu | Modifier quand |
|---|---|---|
| `variables.css` | `:root`, `[data-theme="blue"]`, `[data-theme="light"]` | Ajout couleur ou thème |
| `layout.css` | Sidebar, topbar, grilles, responsive | Changement de mise en page |
| `components.css` | Cards, slots, modales, formulaires, toasts, validation | Modification composant |
| `utilities.css` | Boutons, tags, animations, helpers, settings, color picker | Ajout utilitaire |

---

## Modules JavaScript

### `constants.js`

- `COURSES_DATA` — 11 UE avec triple palette `{ green, blue, light }`
- `TYPE_COLORS` — `{ green, blue, light }` par type de session
- `DAYS`, `MONTHS`, `TYPE_LABELS`

### `storage.js`

Trois clés localStorage :

```
gl_s4_planner_v2    sessions de révision
upte_settings       paramètres établissement
upte_courses        cours personnalisés (null = COURSES_DATA par défaut)
```

Méthodes : `getSessions`, `saveSessions`, `getSettings`, `saveSettings`, `getCustomCourses`, `saveCustomCourses`, `resetCourses`.

### `utils.js`

```
timeToMin / minToTime / formatDate / todayStr / uniqueId / esc
getActiveCourses()     → cours custom si définis, sinon COURSES_DATA
courseByCode(code)     → cherche dans getActiveCourses()
getTheme()             → "green" | "blue" | "light"
courseColor(course)    → hex selon thème actif
typeColor(typeColors)  → hex selon thème actif
```

### `validator.js`

Validation centralisée. Toutes les règles métier sont ici, pas dans `app.js`.

```
validateStudySession(data, prefix)              → boolean
validateCourse(data, prefix, origCode, courses) → boolean
validateSettings(data)                          → boolean
setFieldError(fieldId, msg)                     → affiche erreur sous le champ
clearErrors(fieldIds)                           → efface les erreurs
```

Règles :

| Formulaire | Règles principales |
|---|---|
| Session | Cours requis, date valide, durée 0.5–12h, heure valide |
| Cours | Code `A-Z0-9_` 2–12 chars, pas de doublon, nom 3–80 chars, crédits 1–10, cohérence jour/start/end, end > start, max 8h |
| Paramètres | Tous champs requis, limites de longueur |

### `ui.js`

- Navigation, thèmes (`cycleTheme`, `applyTheme`, `_rerenderAll`)
- Modales, confirmation `Promise<boolean>`, toasts
- Mini-calendrier, conseils de révision

Cycle des thèmes : `light` → `blue` → `green`. Thème par défaut : `light`.

`_rerenderAll()` — re-rend tous les composants avec couleurs inline après changement de thème.

### `app.js`

Logique métier complète :

- Dashboard, emploi du temps, liste cours, planificateur
- Settings : `renderSettings`, `saveSettings`
- CRUD cours : `openAddCourse`, `openEditCourse`, `saveCourse`, `updateCourse`, `deleteCourse`, `resetCourses`
- `openAddStudyForCourse(code)` — pré-sélectionne le cours dans la modale session
- CRUD sessions : `saveStudySession`, `openEditSession`, `updateStudySession`, `deleteSession`
- `_afterCoursesChange()` — re-synchronise selects + rendu global après CRUD cours
- `_courseFromForm(prefix)` — lit formulaire cours → objet structuré avec `color: { green, blue, light }`

---

## Flux de données

```
getActiveCourses() → cours custom ou COURSES_DATA
        ↓
App.render*() — lit sessions + settings depuis Storage
        ↓
DOM (innerHTML, style inline)
        ↑
onclick → App.xxx() / UI.xxx()
        ↓
validator.js → boolean + affichage erreurs
        ↓ si valide
Storage.save*() → localStorage
        ↓
re-rendu ciblé
```

---

## Palettes couleurs

```js
// constants.js
color: { green: "#22c55e", blue: "#38bdf8", light: "#15803d" }

// utils.js
courseColor(c) // lit c.color[getTheme()]
```

Cours ajoutés manuellement : `{ green: hex, blue: hex, light: hex }` — même hex pour les trois thèmes.

---

## PWA

`manifest.json` à la racine. `theme-color` mis à jour dynamiquement par `applyTheme()`. Pas de service worker.