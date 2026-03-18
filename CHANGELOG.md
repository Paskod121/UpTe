# Changelog

---

## [Non versionné] — 2025–2026

### Ajouté — PWA & Installation

- `manifest.json` : `display: "fullscreen"`, icons 192/512, shortcuts (Planifier, Emploi du temps).
- `favicon.svg` comme icône SVG maskable.
- `src/images/icon-192.png` et `icon-512.png` requis pour installation Android/iOS.
- `src/images/og-cover.png` pour prévisualisation WhatsApp/Discord.
- Meta Open Graph et Twitter Card dans `index.html`.
- Bouton plein écran dans la topbar (`UI.toggleFullscreen()`).
- `::backdrop { background: var(--bg) }` — transition fullscreen adaptée au thème.

### Ajouté — Combobox custom

- `src/js/combo.js` — remplace les `<datalist>` natifs par un composant cohérent avec les thèmes.
- Champs Établissement (université, école, parcours, semestre, année) utilisent le combobox.
- Saisie libre acceptée — les suggestions ne sont pas bloquantes.
- Scrollbar invisible par défaut, apparaît au survol.

### Ajouté — Année académique

- Champ `annee` dans les paramètres établissement.
- `sidebarAnnee` mis à jour dynamiquement via `applySettings()`.
- `Storage.DEFAULT_SETTINGS` étendu avec `annee: "2025–2026"`.

### Ajouté — Stats dashboard dynamiques

- `statTotalUE`, `statTotalCredits`, `sidebarCredits`, `creditsBar` — calculés depuis `getActiveCourses()`.
- `coursesPageTitle`, `coursesCreditsTag`, `scheduleYearTag` — mis à jour dynamiquement.
- Barre crédits calculée sur base 30 crédits max.

### Ajouté — Undo réinitialisation

- `Storage.resetCourses()` sauvegarde dans `upte_courses_backup` avant suppression.
- `Storage.restoreCoursesBackup()` et `hasCoursesBackup()`.
- Toast avec compte à rebours 30s + bouton "Annuler" → `App._undoReset()`.
- Après 30s : backup supprimé définitivement.

### Ajouté — Samedi et Dimanche

- `WEEK_DAYS` étendu à 7 jours.
- Grille semaine, liste emploi du temps et schedule builder mis à jour.
- Plage horaire étendue : `START_H = 6`, `END_H = 21`, padding bas +24px.
- Colonnes grille dynamiques selon `WEEK_DAYS.length`.

### Ajouté — Theme switcher premium

- Anti-spam : `_themeChanging = false` — clics multiples ignorés pendant 1.8s.
- Anciens toasts thème supprimés avant d'en créer un nouveau.
- Toast avec icône contextuelle (soleil/lune/smiley) + points colorés des 3 thèmes.
- Thème actif mis en évidence avec `transform: scale(1.4)`.

### Ajouté — Sidebar scrollable

- `.nav-section` : `overflow-y: auto`, scrollbar 3px invisible par défaut.
- Apparaît au survol via `scrollbar-color` transition.
- Logo et bloc thème/crédits toujours visibles — seule la navigation scrolle.

### Modifié — Notes

- `deleteNote()` utilise `UI.confirm()` au lieu du `confirm()` natif du navigateur.

### Modifié — Stat cards mobile

- `@media (max-width: 480px)` : `grid-template-columns: 1fr 1fr` au lieu de `1fr`.

### Modifié — Schedule builder

- Select jour : `160px` de large, `font-size: 13px`, `height: 38px`.
- `align-items: start` pour afficher les erreurs sans chevauchement.

---

### Ajouté — Créneaux multiples, Paramètres CRUD, Validation, Thèmes, CSS modulaire

*(voir entrées précédentes)*

---

*Format [SemVer](https://semver.org/) recommandé pour les versions à venir.*