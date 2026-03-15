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
    │   └── utilities.css   boutons, tags, animations, classes helpers
    ├── js/
    │   ├── main.js         point d'entrée — expose App/UI sur window, lance init
    │   ├── constants.js    données statiques : DAYS, MONTHS, COURSES_DATA, TYPE_*
    │   ├── storage.js      persistance localStorage (classe Storage)
    │   ├── utils.js        fonctions utilitaires pures (timeToMin, esc, formatDate…)
    │   ├── ui.js           interface : navigation, thème, modales, toasts, calendrier, tips
    │   └── app.js          logique métier : dashboard, emploi du temps, planificateur
    ├── fonts/              polices locales (usage hors ligne)
    ├── images/             logos, icônes, visuels
    ├── videos/             réservé
    └── docs/
        ├── README.md
        ├── ARCHITECTURE.md (ce fichier)
        ├── DEVELOPPEMENT.md
        └── DONNEES.md
```

---

## CSS — organisation modulaire

`index.html` charge un seul fichier : `src/css/main.css`. Ce fichier ne contient que quatre `@import` dans l'ordre :

```css
@import "./variables.css";
@import "./layout.css";
@import "./components.css";
@import "./utilities.css";
```

L'ordre est intentionnel : les variables doivent être déclarées avant d'être utilisées dans les autres fichiers.

| Fichier | Contenu | Modifier quand |
|---|---|---|
| `variables.css` | `:root`, `[data-theme="blue"]` | Ajout d'une couleur, d'un thème |
| `layout.css` | Sidebar, topbar, grilles de pages, responsive structure | Changement de mise en page globale |
| `components.css` | Cards, slots, modales, formulaires, toasts, tips, sessions | Modification d'un composant existant |
| `utilities.css` | Boutons, tags, animations, helpers | Ajout d'un utilitaire, d'une animation |

---

## Modules JavaScript

Le code JS est découpé en six fichiers ES modules. `main.js` est le seul point d'entrée ; les autres ne sont jamais chargés directement par `index.html`.

### `constants.js`

Données statiques. Aucune logique, aucun import externe.

- `DAYS`, `DAYS_SHORT`, `MONTHS` — tableaux de labels localisés
- `COURSES_DATA` — tableau des 11 UE du GL-S4 avec code, nom, crédits, prof, salle, jour, start, end, color
- `TYPE_COLORS`, `TYPE_LABELS` — maps clé→valeur pour les types de sessions

### `storage.js`

Classe `Storage`. Un seul rôle : lire et écrire dans `localStorage`.

```
Storage.getSessions()      → Session[]
Storage.saveSessions(arr)  → void
Storage.get()              → { sessions: [] }
Storage.set(data)          → void
```

Clé utilisée : `gl_s4_planner_v2`. Changer cette clé repart d'un localStorage vide.

### `utils.js`

Fonctions pures sans état, sans effet de bord.

```
timeToMin(t)          "14:30" → 870
minToTime(m)          870 → "14:30"
formatDate(d)         "2025-11-03" → "Lundi 3 Novembre"
todayStr()            → "2025-11-03"
uniqueId()            → identifiant unique (base36)
esc(s)                → chaîne HTML-escapée
courseByCode(code)    → objet UE ou undefined
```

### `ui.js`

Classe `UI`. Gère tout ce qui est visuel sans toucher aux données métier.

Responsabilités :
- Navigation entre pages (`.page.active`)
- Gestion des thèmes (`cycleTheme`, `applyTheme`, `getStoredTheme`)
- Ouverture/fermeture des modales
- Modale de confirmation (remplace `confirm()` natif) — retourne une `Promise<boolean>`
- Toasts
- Mini-calendrier du planificateur
- Rendu des conseils de révision

Thèmes disponibles : `green` (défaut), `blue`. Stocké dans `localStorage` sous la clé `upte_theme`.

### `app.js`

Classe `App`. Logique métier et rendu des données.

Responsabilités :
- `init()` — initialisation générale au chargement
- `renderDashboard()` — cours du jour, sessions à venir, stats
- `renderCourseList()` — liste des UE
- `renderScheduleList()` — emploi du temps par jour
- `renderWeekGrid()` — vue semaine visuelle
- `renderPlanner()` — sessions planifiées + stats par UE
- `showCourseDetail(code)` — modale détail d'une UE
- `saveStudySession()` / `updateStudySession()` / `deleteSession()` — CRUD sessions

### `main.js`

Point d'entrée. Trois lignes utiles :

```js
window.App = App;
window.UI = UI;
document.addEventListener("DOMContentLoaded", () => {
  UI.applyTheme(UI.getStoredTheme());
  App.init();
});
```

`App` et `UI` sont exposés sur `window` parce que le HTML appelle directement `App.xxx()` et `UI.xxx()` dans les attributs `onclick`.

---

## Flux de données

```
COURSES_DATA (constants.js)
      ↓
App.render*()          lit les données statiques + Storage.getSessions()
      ↓
DOM                    innerHTML, classList, textContent
      ↑
Interactions           onclick dans index.html → App.xxx() / UI.xxx()
      ↓
Storage.saveSessions() écrit dans localStorage
      ↓
App.renderDashboard() / renderPlanner()   re-rendu partiel
```

Pas de state global réactif. Chaque action déclenche un re-rendu ciblé de la section concernée.

---

## Thèmes

Les thèmes sont implémentés via un attribut `data-theme` sur `<html>`. Le CSS déclare les surcharges dans `variables.css` :

```css
[data-theme="blue"] {
  --green: #7dd3fc;
  /* … */
}
```

Ajouter un thème : déclarer un nouveau bloc `[data-theme="xxx"]` dans `variables.css`, ajouter l'entrée dans le tableau `THEMES` de `ui.js`.

---

## PWA

`manifest.json` à la racine déclare l'application comme installable. `index.html` contient les meta tags nécessaires (`theme-color`, `apple-mobile-web-app-capable`). Pas de service worker pour l'instant — les données restent dans `localStorage`, pas de cache offline géré côté SW.