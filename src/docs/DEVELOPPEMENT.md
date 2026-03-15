# Guide de développement

Ce document décrit comment faire évoluer UpTe : conventions, ajout de pages ou de fonctionnalités, modification des données, et déploiement.

---

## 1. Environnement

- **Éditeur** : au choix (VS Code, Cursor, etc.).
- **Serveur local** : nécessaire pour charger les modules ES (pas d’ouverture directe en `file://`).
  - Depuis la **racine du projet** (où se trouve `index.html`) :
    - **Node** : `npx serve .`
    - **Python 3** : `python -m http.server 8080`
  - Ouvrir l’URL indiquée dans le navigateur.

Aucune dépendance npm, aucun build. Le code est servi tel quel.

---

## 2. Conventions

- **JavaScript** : ES modules (`import`/`export`), `"use strict"`. Les classes exposées au HTML (`App`, `UI`) sont attachées à `window` dans `main.js`.
- **CSS** : un seul fichier `src/css/main.css`. Variables dans `:root`, pas de préfixes type BEM imposés, mais garder des noms cohérents (ex. `.card`, `.card-header`, `.btn-primary`).
- **HTML** : une seule page `index.html`. Les « pages » sont des `<div class="page" id="page-xxx">` affichées/masquées via la navigation (classe `.active`).
- **Chemins** : depuis la racine du projet, les assets sont sous `src/` (ex. `src/css/main.css`, `src/js/main.js`).

---

## 3. Modifications courantes

### 3.1 Changer les données de cours (UE)

1. Ouvrir **`src/js/constants.js`**.
2. Modifier le tableau **`COURSES_DATA`** :
   - Ajouter / supprimer / modifier des objets selon le schéma décrit dans [DONNEES.md](./DONNEES.md).
   - Conserver les champs : `code`, `name`, `credits`, `prof`, `salle`, `jour`, `start`, `end`, `color` (avec `null` ou `""` si non défini).
3. Si le semestre ou la formation change, adapter les textes dans **`index.html`** (ex. « Licence Pro GL · Semestre 4 », « EPL · UNIVERSITÉ DE LOMÉ »).

### 3.2 Ajouter une page

1. **HTML** (`index.html`)  
   - Ajouter un bloc :
     ```html
     <div class="page" id="page-ma-page">
       <div class="content">
         <!-- contenu -->
       </div>
     </div>
     ```
   - Dans la sidebar, ajouter un item de menu pointant vers cette page, par ex. :
     ```html
     <div class="nav-item" onclick="UI.navigate('ma-page')">… Libellé …</div>
     ```

2. **Navigation** (`src/js/ui.js`)  
   - Dans la méthode **`navigate(page)`**, ajouter le libellé du titre dans l’objet `titles` :
     ```js
     const titles = {
       dashboard: "Tableau de bord",
       // ...
       "ma-page": "Mon titre",
     };
     ```
   - Si la page doit déclencher un rendu spécifique au moment de l’affichage, ajouter un cas, par ex. :
     ```js
     if (page === "ma-page") window.App.renderMaPage();
     ```
     puis implémenter `App.renderMaPage()` dans **`src/js/app.js`** si besoin.

3. **Rendu** (optionnel)  
   - Si la page affiche des données dynamiques, ajouter dans **`src/js/app.js`** une méthode statique (ex. `renderMaPage()`) qui lit les données (Storage, constants) et met à jour le DOM de `#page-ma-page`.

### 3.3 Ajouter un type de session de révision

1. **Constantes** (`src/js/constants.js`)  
   - Ajouter une clé dans **`TYPE_COLORS`** (couleur hex) et **`TYPE_LABELS`** (libellé affiché).

2. **Formulaire** (`index.html`)  
   - Dans les modales « Planifier une révision » et « Modifier la session », ajouter une option dans le `<select>` du type, par ex. :
     ```html
     <option value="nouveau-type">Nouveau type</option>
     ```

Aucune migration des anciennes sessions n’est nécessaire : si une session a un `type` inconnu, le code affiche le `type` brut ou un libellé par défaut.

### 3.4 Ajouter une image, une vidéo, une police

- **Images** : placer les fichiers dans **`src/images/`** et les référencer depuis le HTML ou le CSS par ex. `src="src/images/logo.png"` (ou chemin relatif depuis la racine du site).
- **Vidéos** : **`src/videos/`**, puis utilisation dans le HTML (ex. `<video src="src/videos/…">`).
- **Polices** : **`src/fonts/`**. Déclarer les polices dans **`src/css/main.css`** avec `@font-face` et utiliser les `font-family` dans le CSS. Pour un mode 100 % hors ligne, remplacer l’import Google Fonts dans `index.html` par ces références.

---

## 4. Structure des fichiers à ne pas casser

- **`index.html`** : ne pas renommer ; les chemins `src/css/main.css` et `src/js/main.js` doivent rester valides depuis la racine.
- **`src/js/main.js`** : doit rester le point d’entrée unique (expose `App` et `UI` sur `window`, appelle `App.init()`).
- **`Storage.KEY`** : si vous la changez, les utilisateurs qui ont déjà des données verront un planificateur « vide » (nouvelle clé = nouveau stockage).

---

## 5. Déploiement

- Copier l’intégralité du projet (racine + `src/`) sur un hébergeur statique (Netlify, GitHub Pages, hébergement web classique).
- La racine du site doit contenir `index.html` et le dossier `src/` avec les mêmes chemins relatifs.
- Aucune étape de build n’est requise.

---

## 6. Mise à jour de la documentation

Après une modification importante (nouvelle page, changement de structure, nouveau type de donnée) :

1. Mettre à jour **`src/docs/ARCHITECTURE.md`** si la structure ou les modules changent.
2. Mettre à jour **`src/docs/DONNEES.md`** si le modèle de données (cours ou sessions) change.
3. Adapter **`src/docs/README.md`** (sommaire) si un nouveau document est ajouté.
4. Mettre à jour le **`README.md`** à la racine si l’utilisation ou la structure globale change.
5. Ajouter une entrée dans **`CHANGELOG.md`** pour la version ou la date concernée.

---

*Pour le détail du modèle de données, voir [DONNEES.md](./DONNEES.md). Pour l’architecture technique, voir [ARCHITECTURE.md](./ARCHITECTURE.md).*
