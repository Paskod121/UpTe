# UpTe

Application web de gestion et planification des cours du Semestre 4 — Licence Professionnelle Génie Logiciel, École Polytechnique de Lomé.

---

## Ce que fait l'application

Un seul fichier HTML. Pas de serveur, pas de dépendances, pas de build.

L'emploi du temps du GL-S4 (2025–2026) est intégré directement : les 11 unités d'enseignement, leurs horaires, salles et professeurs. À partir de là, l'application permet de planifier des sessions de révision personnelles, de les modifier ou supprimer, et de suivre la répartition du temps de travail par UE.

Les données sont persistées dans le `localStorage` du navigateur. Rien n'est envoyé nulle part.

---

## Structure

```
gl-s4-planner/
└── GL-S4-Planner.html      fichier unique — HTML, CSS, JavaScript
```

Tout réside dans ce fichier. Le CSS utilise des variables custom properties. Le JavaScript est organisé en trois classes : `Storage`, `UI`, `App`.

---

## Utilisation

Ouvrir `GL-S4-Planner.html` dans un navigateur. C'est tout.

Aucune connexion internet requise après le premier chargement — à l'exception des polices Google Fonts (Syne, DM Sans). Pour un usage hors ligne complet, ces imports peuvent être retirés et remplacés par des polices système.

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

**Changer les données de cours** — la constante `COURSES_DATA` en tête du bloc `<script>`. Chaque objet suit ce format :

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

**Ajouter une page** — créer un `<div class="page" id="page-xxx">`, ajouter l'entrée dans `.nav-item` et le cas dans `UI.navigate()`.

---

## Licence

Usage personnel et académique. Université de Lomé — Promo GL 2025–2026.