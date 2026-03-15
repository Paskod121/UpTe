# Architecture technique

Structure du projet UpTe, modules JavaScript, flux de données et choix techniques.

---

## 1. Vue d'ensemble

UpTe est une **application web statique** : un seul HTML, assets (CSS, JS) côté client. Aucun serveur métier, aucun build. Données : constantes (cours) + `localStorage` (sessions).

- **Front** : HTML5, CSS3 (variables custom), JavaScript ES modules.
- **Données** : `COURSES_DATA` (cours) + `localStorage` (sessions).
- **Navigateurs** : modernes, support ES modules et localStorage.

---

## 2. Arborescence

```
UpTe/
├── index.html
├── README.md
├── CHANGELOG.md
├── LICENSE
└── src/
    ├── css/main.css
    ├── js/
    │   ├── main.js      → point d'entrée, expose App / UI
    │   ├── constants.js  → cours, jours, mois, types
    │   ├── storage.js    → localStorage
    │   ├── utils.js      → dates, esc, courseByCode
    │   ├── ui.js         → navigation, modales, toasts, calendrier, conseils
    │   └── app.js        → dashboard, emploi du temps, planificateur
    ├── images/
    ├── videos/
    ├── fonts/
    └── docs/
```

---

## 3. Modules JavaScript

**Chargement** : `index.html` charge `src/js/main.js` avec `type="module"`. Servir en HTTP (pas `file://`).

**Dépendances** :
- `main.js` → `app.js`, `ui.js` (et les attache à `window`)
- `app.js` → `storage`, `ui`, `constants`, `utils`
- `ui.js` → `storage`, `utils`, `constants` ; utilise `window.App` pour les rendus après navigation
- `utils.js` → `constants.js`
- `storage.js`, `constants.js` : sans dépendance

**Rôles** :
- **Storage** : lecture/écriture localStorage (sessions).
- **UI** : navigation, modales, toasts, mini-calendrier, page Conseils.
- **App** : logique métier et rendu (dashboard, cours, emploi du temps, planificateur, CRUD sessions).

Les `onclick` du HTML appellent `UI.*` ou `App.*` via `window`.

---

## 4. Flux de données

1. **Chargement** : `App.init()` → date, listes déroulantes, rendu des vues.
2. **Navigation** : `UI.navigate(page)` → affichage de `#page-xxx`, puis selon la page appel à `App.renderDashboard()`, `App.renderWeekGrid()`, `App.renderPlanner()` ou `UI.renderTips()`.
3. **Sessions** : formulaires → `App.saveStudySession()` / `updateStudySession()` / `deleteSession()` → `Storage.saveSessions()` → re-rendu des vues concernées.
4. **Lecture** : cours = `COURSES_DATA` ; sessions = `Storage.getSessions()`.

Aucune donnée envoyée à un serveur.

---

## 5. CSS

- Un seul fichier : `src/css/main.css`.
- Variables dans `:root` (--bg, --surface, --green, etc.).
- Polices : Google Fonts dans `index.html` ; pour hors ligne, mettre les fichiers dans `src/fonts/` et utiliser `@font-face` dans `main.css`.

---

## 6. Extension

- **Nouvelle page** : bloc `#page-xxx` dans `index.html`, lien nav, cas dans `UI.navigate()` + rendu éventuel dans `App`. Voir DEVELOPPEMENT.md.
- **Nouveaux cours** : modifier `COURSES_DATA` dans `src/js/constants.js`. Voir DONNEES.md.
- **Nouveau type de session** : ajouter dans `TYPE_COLORS` et `TYPE_LABELS` (constants.js) + option dans les formulaires.

---

*Document à maintenir avec le code.*
