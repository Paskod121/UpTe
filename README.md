# UpTe

Application web de gestion et planification des cours du Semestre 4 — Licence Professionnelle Génie Logiciel, École Polytechnique de Lomé.

---

## Ce que fait l'application

Application modulaire (HTML, CSS, JS séparés). Pas de build, pas de dépendances npm.

L'emploi du temps du GL-S4 (2025–2026) est intégré directement : les 11 unités d'enseignement, leurs horaires, salles et professeurs. À partir de là, l'application permet de planifier des sessions de révision personnelles, de les modifier ou supprimer, et de suivre la répartition du temps de travail par UE.

Les données sont persistées dans le `localStorage` du navigateur. Rien n'est envoyé nulle part.

---

## Structure (architecture modulaire)

À la racine : uniquement le point d'entrée et les fichiers de projet. Tout le reste est dans `src/`.  
**Documentation détaillée** : voir le dossier **[src/docs/](src/docs/)** (architecture, données, guide de développement).

```
UpTe/
├── index.html           point d'entrée — structure HTML
├── README.md
├── LICENSE
└── src/
    ├── css/
    │   └── main.css         styles (variables, layout, composants)
    ├── js/
    │   ├── main.js           point d'entrée — expose App / UI, lance init
    │   ├── constants.js      données (DAYS, MONTHS, COURSES_DATA, TYPE_*)
    │   ├── storage.js        persistance localStorage (classe Storage)
    │   ├── utils.js          helpers (formatDate, todayStr, esc, courseByCode…)
    │   ├── ui.js             interface (navigation, modales, toasts, mini-calendrier, conseils)
    │   └── app.js            logique métier (tableau de bord, emploi du temps, planificateur)
    ├── images/               réservé aux images (logos, icônes, visuels)
    ├── videos/               réservé aux vidéos
    ├── fonts/                polices locales (pour usage hors ligne)
    └── docs/                 documentation du projet
```

Le CSS utilise des variables (custom properties). Le JavaScript est découpé en modules ES : `Storage`, `UI`, `App` + constantes et utilitaires.

---

## Utilisation

Les modules ES nécessitent d'être servis en HTTP (pas d'ouverture directe en `file://`). Depuis la racine du projet :

- **Node** : `npx serve .` puis ouvrir l’URL indiquée (ex. http://localhost:3000).
- **Python 3** : `python -m http.server 8080` puis http://localhost:8080.

Aucune connexion internet requise après le premier chargement — à l'exception des polices Google Fonts (Syne, DM Sans). Pour un usage hors ligne complet, placez les fichiers de polices dans `src/fonts/` et adaptez les `@font-face` dans `src/css/main.css`.

---

## Données intégrées

| Code | UE | Crédits | Jour | Horaire |
|---|---|---|---|---|
| INF1427 | Structure de Données | 3 | — | — |
| INF1428 | Modélisation UML | 3 | Mardi | 10h30–13h30 |
| INF1425 | Généralités sur la sécurité informatique | 3 | Lundi | 07h30–10h30 |
| INF1426 | Développement d'applications de bureau | 4 | Lundi | 14h00–18h00 |
| INF1429 | Normes Documentaires | 4 | Mardi | 14h00–18h00 |
| INF1421 | Administration de bases de données | 3 | Vendredi | 14h30–17h30 |
| 1INF1423 | Administration Système Linux | 2 | Mercredi | 15h00–17h00 |
| 2INF1423 | Administration Système Windows | 2 | Jeudi | 15h00–17h00 |
| DRT1420 | Droit de l'Informatique | 2 | Vendredi | 07h30–09h30 |
| CPT1420 | Comptabilité Générale de base | 2 | Vendredi | 10h00–12h00 |
| UE Libre | — | 2 | — | — |

Total : 27 crédits ECTS.

---

## Navigateurs supportés

Tout navigateur moderne. Testé sur Chrome 120+, Firefox 121+, Safari 17+. L'interface s'adapte aux petits écrans (menu hamburger sous 900px).

---

## Modifications courantes

**Changer les données de cours** — éditer `src/js/constants.js`, constante `COURSES_DATA`. Chaque objet suit ce format :

```js
{
  code:    'INF1427',
  name:    'Structure de Données',
  credits: 3,
  prof:    'M. DUPONT',
  salle:   'Amphi A',
  jour:    'Lundi',       // null si non défini
  start:   '08:00',       // null si non défini
  end:     '10:00',       // null si non défini
  color:   '#22c55e'
}
```

**Ajouter une page** — créer un `<div class="page" id="page-xxx">` dans `index.html`, ajouter l'entrée dans `.nav-item`, et le cas correspondant dans `UI.navigate()` (`src/js/ui.js`).

---

## Licence

Usage personnel et académique. Université de Lomé — Promo GL 2025–2026.