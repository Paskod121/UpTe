# Changelog

---

## [Non versionné] — 2025–2026

### Ajouté — Créneaux multiples par cours

- Modèle de données migré : `jour/start/end` → `schedules: [{ jour, start, end }]`.
- Un cours peut avoir zéro, un ou plusieurs créneaux sur des jours différents.
- `normalizeCourse()` dans `utils.js` — migration à la volée, rétrocompatibilité totale.
- Nouveaux helpers : `getCourseSchedules`, `getSchedulesForDay`, `getCoursesForDay`.
- `renderWeekGrid`, `renderScheduleList`, `renderDashboard`, `renderCourseList`, `showCourseDetail` mis à jour pour lire `schedules[]`.
- Schedule builder dynamique dans les modales add/edit cours : lignes `[Jour] [Début] → [Fin] [×]`, bouton "+ Ajouter un créneau", validation ligne par ligne, détection des doublons.
- `validator.js` mis à jour : validation de chaque créneau individuellement.
- `utilities.css` : styles `.schedule-row`, `.schedule-builder`, `.schedule-add-btn`.

### Ajouté — Espace d'apprentissage

- Page **Apprentissage** : Pomodoro + bibliothèque de documents par UE.
- Pomodoro : ring SVG animé, 3 modes, son WebAudio, messages rotatifs, stats persistées.
- Documents : upload PDF/DOCX/PPTX (max 20 Mo), stockage IndexedDB (`upte_docs`).
- Viewer PDF via PDF.js, DOCX via mammoth.js, PPTX via JSZip — chargés à la demande.
- `src/js/learn.js`, `src/css/learning.css`.

### Ajouté — Éditeur de notes

- Page **Prise de notes** : éditeur riche par UE, stockage IndexedDB (`upte_notes`).
- Toolbar : titres H1–H4, gras/italique/souligné/barré/exposant, taille ±, 8 couleurs + surlignage, listes, alignement, indentation, undo/redo, plein écran.
- Sauvegarde automatique 1.2s, Ctrl+S, indicateur d'état.
- Export en fichier HTML téléchargeable.
- `src/js/notes.js` (styles dans `learning.css`).

### Ajouté — Paramètres et CRUD cours

- Page **Paramètres** : université, école, parcours, semestre.
- CRUD cours avec color picker 12 couleurs et schedule builder.
- `Storage.getCustomCourses`, `saveCustomCourses`, `resetCourses`, `getSettings`, `saveSettings`.
- `getActiveCourses()` — cours custom ou COURSES_DATA selon localStorage.

### Ajouté — Validation centralisée

- `src/js/validator.js` — toutes les règles métier séparées de `app.js`.
- `.field-invalid` — bordure rouge + glow sur champ invalide.

### Ajouté — 3 thèmes

- `[data-theme="light"]` — clair, palette verte saturée.
- Triple palette `color: { green, blue, light }` par cours et par type.
- `UI._rerenderAll()` — re-rendu complet au changement de thème, sans rechargement.
- Cycle : `light` → `blue` → `green`.

### Ajouté — CSS modulaire

- `variables.css`, `layout.css`, `components.css`, `utilities.css`, `learning.css`.
- `main.css` — 5 `@import` uniquement.

### Ajouté — Initialisation

- Architecture modulaire sous `src/`.
- Nom **Up●Te**, PWA, modale confirmation, icônes SVG inline.

---

*Format [SemVer](https://semver.org/) recommandé pour les versions à venir.*