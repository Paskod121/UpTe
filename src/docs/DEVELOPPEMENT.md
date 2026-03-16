# Guide de développement

---

## 1. Environnement

- Serveur local requis (modules ES) :
  - Node : `npx serve .`
  - Python 3 : `python -m http.server 8080`
- Aucune dépendance npm, aucun build.

---

## 2. Conventions

- **JS** : ES modules, `"use strict"`. `App`, `UI`, `Learn`, `Notes` exposés sur `window` dans `main.js`.
- **Validation** : toutes les règles métier dans `validator.js`. `app.js` n'implémente aucune règle directement.
- **Couleurs** : jamais de hex en dur — toujours `var(--xxx)` en CSS ou `courseColor()` / `typeColor()` en JS.
- **Icônes** : SVG inline uniquement. Pas d'emoji ni de caractères décoratifs.
- **Créneaux** : toujours passer par `getCourseSchedules()` — jamais lire `c.jour` directement.

---

## 3. Modifications courantes

### 3.1 Modifier le CSS

| Fichier | Modifier quand |
|---|---|
| `variables.css` | Couleur, nouveau thème |
| `layout.css` | Sidebar, topbar, grilles, responsive |
| `components.css` | Card, slot, modale, formulaire, toast |
| `utilities.css` | Bouton, tag, animation, schedule builder |
| `learning.css` | Pomodoro, viewer documents, éditeur notes |

Ne jamais écrire dans `main.css`.

**Ajouter un thème :**

1. `variables.css` → `[data-theme="mon-theme"] { ... }`
2. `ui.js` → tableau `THEMES` : `{ id: "mon-theme", label: "..." }`
3. `ui.js` → objet `THEME_META` : `"mon-theme": "#xxxxxx"`
4. `constants.js` → clé `color` de chaque cours et `TYPE_COLORS`
5. `utils.js` → `getTheme()` : ajouter `if (t === "mon-theme") return "mon-theme"`

### 3.2 Modifier les données de cours

Éditer `src/js/constants.js`, tableau `COURSES_DATA`. Format attendu :

```js
{
  code: "INF1427", name: "Structure de Données", credits: 3,
  prof: "M. PASKOD", salle: "Amphi A",
  schedules: [
    { jour: "Lundi", start: "08:00", end: "10:00" },
    { jour: "Jeudi", start: "14:00", end: "16:00" },
  ],
  color: { green: "#22c55e", blue: "#38bdf8", light: "#15803d" }
}
```

Les utilisateurs peuvent aussi modifier leurs cours depuis la page **Paramètres** via le schedule builder dynamique — ces modifications sont persistées dans `localStorage`.

### 3.3 Ajouter un créneau à un cours existant

Depuis l'interface : Paramètres → cliquer sur l'icône modifier du cours → "+ Ajouter un créneau".

Depuis le code : ajouter un objet `{ jour, start, end }` dans le tableau `schedules` du cours dans `constants.js`.

### 3.4 Ajouter une page

1. `index.html` — `<div class="page" id="page-ma-page">` et `nav-item`
2. `ui.js` — `titles` dans `navigate()` et cas de rendu
3. `app.js` (ou nouveau module) — `renderMaPage()`

### 3.5 Ajouter un type de session

1. `constants.js` — `TYPE_COLORS` (3 clés green/blue/light) et `TYPE_LABELS`
2. `index.html` — `<option>` dans les deux selects de type

### 3.6 Ajouter une règle de validation

Ouvrir `src/js/validator.js`, trouver la fonction concernée, appeler `setFieldError(fieldId, message)`.

---

## 4. Fichiers à ne pas casser

- `index.html` — chemins `src/css/main.css` et `src/js/main.js` fixes.
- `src/css/main.css` — uniquement `@import`, ordre : variables → layout → components → utilities → learning.
- `src/js/main.js` — point d'entrée unique, expose les 4 classes sur `window`.
- `Storage.KEY` (`gl_s4_planner_v2`) — changer repart d'un localStorage vide.
- Ne jamais lire `c.jour`, `c.start`, `c.end` directement — toujours `getCourseSchedules(c)`.

---

## 5. Déploiement

Copier racine + `src/` sur hébergeur statique. Aucun build requis.

---

## 6. Mise à jour de la documentation

Après toute modification importante :

1. `ARCHITECTURE.md` — structure ou modules
2. `DONNEES.md` — modèle de données
3. `DEVELOPPEMENT.md` — conventions ou procédures
4. `src/docs/README.md` — si nouveau document
5. `README.md` racine — structure globale
6. `CHANGELOG.md` — entrée datée