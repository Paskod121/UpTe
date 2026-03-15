# UpTe

Application web de gestion et planification des cours du Semestre 4 — Licence Professionnelle Génie Logiciel, École Polytechnique de Lomé.

---

## Ce que fait l'application

Architecture modulaire (HTML, CSS, JS séparés). Pas de build, pas de dépendances npm.

L'emploi du temps du GL-S4 (2025–2026) est intégré directement : les 11 unités d'enseignement, leurs horaires, salles et professeurs. L'application permet de planifier des sessions de révision personnelles, de les modifier ou supprimer, et de suivre la répartition du temps de travail par UE.

Les données sont persistées dans le `localStorage` du navigateur. Rien n'est envoyé nulle part.

---

## Structure

À la racine : uniquement le point d'entrée et les fichiers de projet. Tout le reste est dans `src/`.
Documentation détaillée dans **[src/docs/](src/docs/)**.

```
UpTe/
├── index.html
├── manifest.json
├── README.md
├── CHANGELOG.md
├── LICENSE
└── src/
    ├── css/
    │   ├── main.css          @import uniquement — point d'entrée CSS
    │   ├── variables.css     custom properties et thèmes
    │   ├── layout.css        sidebar, topbar, grilles, responsive
    │   ├── components.css    cards, slots, modales, formulaires, toasts, tips
    │   └── utilities.css     boutons, tags, animations, helpers
    ├── js/
    │   ├── main.js           point d'entrée JS
    │   ├── constants.js      données statiques (cours, types)
    │   ├── storage.js        persistance localStorage
    │   ├── utils.js          fonctions utilitaires pures
    │   ├── ui.js             interface, navigation, thèmes, modales
    │   └── app.js            logique métier et rendu
    ├── fonts/
    ├── images/
    ├── videos/
    └── docs/
```

---

## Utilisation

Les modules ES nécessitent un serveur HTTP. Depuis la racine du projet :

- **Node** : `npx serve .`
- **Python 3** : `python -m http.server 8080`

Aucune connexion internet requise après le premier chargement — à l'exception des polices Google Fonts (Syne, DM Sans). Pour un usage hors ligne complet, placer les fichiers de polices dans `src/fonts/` et adapter les `@font-face` dans `src/css/variables.css`.

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

Tout navigateur moderne. Testé sur Chrome 120+, Firefox 121+, Safari 17+.

---

## Modifications courantes

**Changer les données de cours** — `src/js/constants.js`, tableau `COURSES_DATA`.

**Modifier le CSS** — éditer le fichier concerné dans `src/css/` selon le rôle de chacun. Ne pas écrire dans `main.css`.

**Ajouter une page** — voir `src/docs/DEVELOPPEMENT.md`, section 3.3.

**Ajouter un thème** — voir `src/docs/DEVELOPPEMENT.md`, section 3.1.

---

## Licence

Usage personnel et académique. Université de Lomé — Promo GL 2025–2026.