# Changelog

---

## [Non versionné] — 2025–2026

### Ajouté — Paramètres et CRUD cours

- Page **Paramètres** : modification de l'université, école, parcours, semestre — persisté dans `localStorage` (`upte_settings`).
- CRUD complet sur les cours : ajouter, modifier, supprimer depuis la page Paramètres.
- Color picker 12 couleurs pour choisir la couleur d'un cours ajouté manuellement.
- Bouton "Réinitialiser" pour revenir aux données par défaut.
- `Storage.getCustomCourses()`, `saveCustomCourses()`, `resetCourses()`, `getSettings()`, `saveSettings()`.
- `getActiveCourses()` dans `utils.js` — retourne cours custom ou `COURSES_DATA` selon localStorage.
- `openAddStudyForCourse(code)` — pré-sélectionne le cours dans la modale session.
- `_afterCoursesChange()` — re-synchronise tout après CRUD cours.

### Ajouté — Validation centralisée

- `src/js/validator.js` — module dédié, toutes les règles métier séparées de `app.js`.
- Validation sessions : cours, date, durée 0.5–12h, heure, dépassement minuit.
- Validation cours : code format strict, doublon, nom, crédits, cohérence horaire, durée max 8h.
- Validation paramètres : champs requis, limites de longueur.
- `.field-invalid` dans `components.css` — bordure rouge + glow sur champ invalide.

### Ajouté — Thème clair

- `[data-theme="light"]` dans `variables.css` — palette verte saturée sur fond clair.
- Triple palette par cours `color: { green, blue, light }` dans `constants.js`.
- `getTheme()` retourne `"green" | "blue" | "light"` comme clé distincte.
- Cycle des thèmes : `light` → `blue` → `green`. Thème par défaut : `light`.
- `.logo-badge { color: #fff }` — SVG du logo toujours blanc quel que soit le thème.

### Ajouté — Re-rendu automatique au changement de thème

- `UI._rerenderAll()` — force le re-rendu de tous les composants avec couleurs inline.
- `cycleTheme()` appelle `_rerenderAll()` — plus besoin de recharger la page.

### Ajouté — CSS modulaire

- `src/css/variables.css` — custom properties et thèmes.
- `src/css/layout.css` — structure globale, sidebar, topbar, responsive.
- `src/css/components.css` — composants.
- `src/css/utilities.css` — boutons, tags, animations, helpers, settings, color picker.
- `src/css/main.css` — 4 `@import` uniquement.

### Ajouté — Initialisation du projet

- Architecture modulaire sous `src/`.
- Renommage en **Up●Te**.
- Bouton thème dans la sidebar.
- Modale de confirmation stylée (`UI.confirm()` — `Promise<boolean>`).
- PWA : `manifest.json`, meta tags, `theme-color` dynamique.
- Documentation dans `src/docs/`.
- Icônes SVG inline à la place des emoji.

---

*Format [SemVer](https://semver.org/) recommandé pour les versions à venir.*