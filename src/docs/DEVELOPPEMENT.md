# Guide de développement

Ce document décrit comment faire évoluer UpTe : conventions, ajout de pages ou de fonctionnalités, modification des données, et déploiement.

---

## 1. Environnement

- **Éditeur** : au choix (VS Code, Cursor, etc.).
- **Serveur local** : nécessaire pour charger les modules ES (pas d'ouverture directe en `file://`).
  - Depuis la **racine du projet** (où se trouve `index.html`) :
    - **Node** : `npx serve .`
    - **Python 3** : `python -m http.server 8080`
  - Ouvrir l'URL indiquée dans le navigateur.

Aucune dépendance npm, aucun build. Le code est servi tel quel.

---

## 2. Conventions

- **JavaScript** : ES modules (`import`/`export`), `"use strict"`. Les classes exposées au HTML (`App`, `UI`) sont attachées à `window` dans `main.js`.
- **CSS** : quatre fichiers sous `src/css/`, importés par `main.css` dans l'ordre. Voir section 3.1.
- **HTML** : une seule page `index.html`. Les « pages » sont des `<div class="page" id="page-xxx">` affichées/masquées via la navigation (classe `.active`).
- **Chemins** : depuis la racine du projet, les assets sont sous `src/` (ex. `src/css/main.css`, `src/js/main.js`).
- **Icônes** : SVG inline uniquement. Pas d'emoji, pas de caractères spéciaux décoratifs dans le rendu visible.

---

## 3. Modifications courantes

### 3.1 Modifier le CSS

Le CSS est découpé en quatre fichiers. `index.html` charge uniquement `src/css/main.css`, qui ne contient que les imports.

| Fichier | Modifier quand |
|---|---|
| `variables.css` | Changer une couleur, ajouter un thème |
| `layout.css` | Modifier la sidebar, le topbar, les grilles de pages, le responsive |
| `components.css` | Modifier un composant : card, slot, modale, formulaire, toast, tip |
| `utilities.css` | Ajouter un bouton, un tag, une animation, un helper |

Ne jamais écrire de styles directement dans `main.css` — ce fichier ne contient que les `@import`.

**Ajouter un thème** :

1. Déclarer un bloc dans `variables.css` :
   ```css
   [data-theme="mon-theme"] {
     --green: #xxx;
     --green2: #xxx;
     /* surcharger les variables nécessaires */
   }
   ```
2. Ajouter l'entrée dans le tableau `THEMES` de `src/js/ui.js` :
   ```js
   const THEMES = [
     { id: "green", label: "Vert" },
     { id: "blue", label: "Bleu" },
     { id: "mon-theme", label: "Mon thème" },
   ];
   ```

### 3.2 Changer les données de cours (UE)

1. Ouvrir **`src/js/constants.js`**.
2. Modifier le tableau **`COURSES_DATA`** selon le schéma décrit dans [DONNEES.md](./DONNEES.md).
3. Si le semestre ou la formation change, adapter les textes dans **`index.html`** (ex. « Licence Pro GL · Semestre 4 »).

### 3.3 Ajouter une page

1. **HTML** (`index.html`) — ajouter le bloc de page et l'item de menu :
   ```html
   <div class="page" id="page-ma-page">
     <!-- contenu -->
   </div>
   ```
   ```html
   <div class="nav-item" onclick="UI.navigate('ma-page')">… Libellé …</div>
   ```

2. **Navigation** (`src/js/ui.js`) — ajouter le titre dans `navigate()` :
   ```js
   const titles = {
     // ...
     "ma-page": "Mon titre",
   };
   ```
   Si la page déclenche un rendu au chargement :
   ```js
   if (page === "ma-page") window.App.renderMaPage();
   ```

3. **Rendu** (`src/js/app.js`) — implémenter `renderMaPage()` si nécessaire.

### 3.4 Ajouter un type de session de révision

1. `src/js/constants.js` — ajouter dans `TYPE_COLORS` et `TYPE_LABELS`.
2. `index.html` — ajouter l'`<option>` dans les deux `<select>` de type (modales Ajouter et Modifier).

### 3.5 Ajouter une image, une vidéo, une police

- **Images** : `src/images/`, référencer par `src="src/images/fichier.ext"`.
- **Vidéos** : `src/videos/`.
- **Polices** : `src/fonts/`. Déclarer avec `@font-face` dans `variables.css`. Pour un mode 100 % hors ligne, retirer l'import Google Fonts dans `index.html`.

---

## 4. Fichiers à ne pas casser

- **`index.html`** : ne pas renommer. Les chemins `src/css/main.css` et `src/js/main.js` doivent rester valides depuis la racine.
- **`src/css/main.css`** : ne contient que les `@import`. L'ordre doit rester : variables → layout → components → utilities.
- **`src/js/main.js`** : point d'entrée unique JS. Expose `App` et `UI` sur `window`, appelle `App.init()`.
- **`Storage.KEY`** : si la clé change, les données existantes des utilisateurs ne sont plus lues (nouveau départ).

---

## 5. Déploiement

Copier l'intégralité du projet (racine + `src/`) sur un hébergeur statique (Netlify, GitHub Pages, hébergement classique). La racine du site doit contenir `index.html` et le dossier `src/` avec les mêmes chemins relatifs. Aucun build requis.

---

## 6. Mise à jour de la documentation

Après une modification importante :

1. **`ARCHITECTURE.md`** — si la structure des fichiers ou des modules change.
2. **`DONNEES.md`** — si le modèle de données change.
3. **`DEVELOPPEMENT.md`** (ce fichier) — si les conventions ou procédures changent.
4. **`src/docs/README.md`** — si un nouveau document est ajouté.
5. **`README.md`** racine — si l'utilisation ou la structure globale change.
6. **`CHANGELOG.md`** — ajouter une entrée pour chaque modification notable.

---

*Pour le modèle de données, voir [DONNEES.md](./DONNEES.md). Pour l'architecture technique, voir [ARCHITECTURE.md](./ARCHITECTURE.md).*