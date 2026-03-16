# UpTe

Plateforme académique de suivi, révision et apprentissage — Licence Pro GL, EPL, Université de Lomé.

---

## Ce que fait l'application

Architecture modulaire (HTML, CSS, JS séparés). Pas de build, pas de dépendances npm.

| Page | Fonctionnalité |
|---|---|
| Tableau de bord | Cours du jour en temps réel, sessions à venir |
| Emploi du temps | Grille semaine interactive + liste par jour |
| Mes cours | Toutes les UE avec créneaux multiples |
| Planificateur | CRUD sessions de révision, calendrier, stats |
| Conseils révision | 10 stratégies d'apprentissage |
| Apprentissage | Pomodoro + bibliothèque de documents (PDF/DOCX/PPTX) |
| Prise de notes | Éditeur riche par UE, sauvegarde auto, export |
| Paramètres | Établissement, CRUD cours avec créneaux multiples |

---

## Structure

```
UpTe/
├── index.html
├── manifest.json
├── README.md
├── CHANGELOG.md
├── LICENSE
└── src/
    ├── css/
    │   ├── main.css          @import uniquement
    │   ├── variables.css     custom properties et thèmes
    │   ├── layout.css        sidebar, topbar, grilles, responsive
    │   ├── components.css    composants UI
    │   ├── utilities.css     boutons, tags, schedule builder
    │   └── learning.css      pomodoro, documents, notes
    ├── js/
    │   ├── main.js           point d'entrée
    │   ├── constants.js      données statiques
    │   ├── storage.js        localStorage
    │   ├── utils.js          helpers + schedules
    │   ├── validator.js      validation centralisée
    │   ├── ui.js             interface et thèmes
    │   ├── app.js            logique métier
    │   ├── learn.js          pomodoro + documents
    │   └── notes.js          éditeur de notes
    ├── fonts/ · images/ · videos/
    └── docs/
```

---

## Utilisation

Modules ES — serveur local requis :

```bash
npx serve .           # Node
python -m http.server # Python 3
```

---

## Données intégrées (GL-S4, 2025–2026)

| Code | UE | Crédits |
|---|---|---|
| INF1427 | Structure de Données | 3 |
| INF1428 | Modélisation UML | 3 |
| INF1425 | Généralités sécurité informatique | 3 |
| INF1426 | Développement d'applications de bureau | 4 |
| INF1429 | Normes Documentaires | 4 |
| INF1421 | Administration de bases de données | 3 |
| 1INF1423 | Administration Système Linux | 2 |
| 2INF1423 | Administration Système Windows | 2 |
| DRT1420 | Droit de l'Informatique | 2 |
| CPT1420 | Comptabilité Générale de base | 2 |
| UE Libre | — | 2 |

Total : 27 crédits ECTS. Modifiable depuis Paramètres.

---

## Modifications courantes

- **Cours** → `src/js/constants.js` ou page Paramètres
- **CSS** → fichier concerné dans `src/css/` (ne pas écrire dans `main.css`)
- **Thème** → `src/docs/DEVELOPPEMENT.md`, section 3.1
- **Page** → `src/docs/DEVELOPPEMENT.md`, section 3.4

---

## Licence

Usage personnel et académique. Université de Lomé — Promo GL 2025–2026.