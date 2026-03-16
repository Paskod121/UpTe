# Guide de développement

---

## 1. Environnement

- **Serveur local requis** (modules ES incompatibles avec `file://`) :
  - Node : `npx serve .`
  - Python 3 : `python -m http.server 8080`
- Aucune dépendance npm, aucun build.

---

## 2. Conventions

- **JS** : ES modules (`import`/`export`), `"use strict"`. `App` et `UI` exposés sur `window` dans `main.js`.
- **Validation** : toutes les règles métier dans `validator.js`. `app.js` appelle les fonctions du validator, n'implémente pas de règles directement.
- **Couleurs** : jamais de hex en dur dans le CSS ni dans le JS de rendu — toujours via `var(--xxx)` ou `courseColor()` / `typeColor()`.
- **Icônes** : SVG inline uniquement. Pas d'emoji ni de caractères spéciaux décoratifs.

---

## 3. Modifications courantes

### 3.1 Modifier le CSS

| Fichier | Modifier quand |
|---|---|
| `variables.css` | Changer une couleur, ajouter un thème |
| `layout.css` | Sidebar, topbar, grilles, responsive |
| `components.css` | Composant existant : card, slot, modale, formulaire, toast |
| `utilities.css` | Bouton, tag, animation, helper, settings, color picker |

Ne jamais écrire de styles dans `main.css`.

**Ajouter un thème :**

1. `variables.css` — ajouter `[data-theme="mon-theme"] { ... }`
2. `ui.js` — ajouter dans `THEMES` : `{ id: "mon-theme", label: "Mon thème" }`
3. `ui.js` — ajouter dans `THEME_META` : `"mon-theme": "#xxxxxx"`
4. `constants.js` — ajouter la clé dans `color` de chaque cours et dans `TYPE_COLORS`
5. `utils.js` — `getTheme()` : ajouter le cas `if (t === "mon-theme") return "mon-theme"`

### 3.2 Modifier les données de cours

Éditer `src/js/constants.js`, tableau `COURSES_DATA`. Schéma complet dans `src/docs/DONNEES.md`.

Les utilisateurs peuvent aussi modifier leurs cours directement depuis la page Paramètres — ces modifications sont stockées dans `localStorage` (`upte_courses`) et prennent le dessus sur `COURSES_DATA`.

### 3.3 Ajouter une page

1. `index.html` — ajouter `<div class="page" id="page-ma-page">` et le `nav-item`
2. `ui.js` — ajouter dans `titles` de `navigate()` et le cas de rendu
3. `app.js` — implémenter `renderMaPage()` si nécessaire

### 3.4 Ajouter un type de session

1. `constants.js` — ajouter dans `TYPE_COLORS` (avec les 3 clés `green/blue/light`) et `TYPE_LABELS`
2. `index.html` — ajouter `<option>` dans les deux selects de type (modales Ajouter et Modifier)

### 3.5 Ajouter une règle de validation

Ouvrir `src/js/validator.js`. Chaque formulaire a sa fonction dédiée. Ajouter la règle dans la fonction concernée — elle utilisera `setFieldError(fieldId, message)` pour afficher l'erreur sous le champ.

### 3.6 Ajouter une image, vidéo, police

- Images : `src/images/`
- Vidéos : `src/videos/`
- Polices : `src/fonts/` + `@font-face` dans `variables.css`

---

## 4. Fichiers à ne pas casser

- `index.html` — ne pas renommer. Chemins `src/css/main.css` et `src/js/main.js` fixes.
- `src/css/main.css` — uniquement les `@import`, dans l'ordre : variables → layout → components → utilities.
- `src/js/main.js` — point d'entrée unique JS.
- `Storage.KEY` (`gl_s4_planner_v2`) — changer cette clé repart d'un localStorage vide pour les sessions.

---

## 5. Déploiement

Copier la racine + `src/` sur un hébergeur statique (Netlify, GitHub Pages). Aucun build requis.

---

## 6. Mise à jour de la documentation

Après une modification importante :

1. `ARCHITECTURE.md` — si structure ou modules changent
2. `DONNEES.md` — si modèle de données change
3. `DEVELOPPEMENT.md` — si conventions ou procédures changent
4. `src/docs/README.md` — si nouveau document ajouté
5. `README.md` racine — si utilisation ou structure globale change
6. `CHANGELOG.md` — entrée pour chaque modification notable