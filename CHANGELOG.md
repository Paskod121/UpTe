# Changelog

Toutes les modifications notables du projet UpTe sont consignées ici.

---

## [Non versionné] — 2025–2026

### Ajouté — CSS modulaire

- `src/css/variables.css` : custom properties (`:root`) et thèmes (`[data-theme]`).
- `src/css/layout.css` : structure globale — sidebar, topbar, grilles de pages, responsive.
- `src/css/components.css` : composants — cards, slots, modales, formulaires, toasts, tips, sessions, cours, calendrier.
- `src/css/utilities.css` : boutons, tags, animations, classes helpers.
- `src/css/main.css` réduit à quatre `@import` dans l'ordre : variables → layout → components → utilities.

### Modifié — CSS modulaire

- `src/css/main.css` : ne contient plus les styles directement, uniquement les imports.
- `src/docs/ARCHITECTURE.md` : section CSS mise à jour, tableau des fichiers et rôles.
- `src/docs/DEVELOPPEMENT.md` : section 3.1 réécrite avec le guide de modification par fichier et la procédure d'ajout de thème.
- `README.md` racine : structure du projet mise à jour.

---

### Ajouté — initialisation du projet

- Architecture modulaire : code sous `src/` (css, js, images, videos, fonts, docs).
- Renommage en **UpTe** (Up●Te).
- Bouton de changement de thème dans la sidebar : thème vert (défaut) et thème bleu.
- Modale de confirmation native remplacée par une modale stylée (`UI.confirm()` — `Promise<boolean>`).
- PWA : `manifest.json`, meta tags apple, `theme-color`.
- Documentation dans `src/docs/` : `README.md`, `ARCHITECTURE.md`, `DONNEES.md`, `DEVELOPPEMENT.md`.
- `CHANGELOG.md` à la racine.
- Icônes SVG inline à la place des emoji dans toute l'interface.

### Modifié — initialisation du projet

- Chemins des assets : `css/` et `js/` remplacés par `src/css/` et `src/js/` dans `index.html`.
- README racine : structure du projet mise à jour, chemins vers `src/`, mention de la documentation.

---

*Format [SemVer](https://semver.org/) recommandé pour les versions à venir (ex. 1.0.0).*