# Modèle de données

Ce document décrit les données utilisées par UpTe : unités d’enseignement (cours), sessions de révision, et persistance dans le navigateur.

---

## 1. Données des cours (UE)

Source : **fichier** `src/js/constants.js`, constante **`COURSES_DATA`**.

;

### 1.1 Structure d’un cours

Chaque élément de `COURSES_DATA` est un objet avec les champs suivants :

| Champ | Type | Description |
|-------|------|-------------|
| `code` | `string` | Code de l’UE (ex. `INF1427`, `UE_LIBRE`). Identifiant unique. |
| `name` | `string` | Intitulé de l’UE. |
| `credits` | `number` | Nombre de crédits ECTS (2, 3 ou 4). |
| `prof` | `string` | Nom du professeur (peut être `""`). |
| `salle` | `string` | Salle ou lieu (peut être `""`). |
| `jour` | `string \| null` | Jour de la semaine en français (`"Lundi"` … `"Vendredi"`) ou `null` si non défini. |
| `start` | `string \| null` | Heure de début au format `"HH:MM"` (ex. `"07:30"`) ou `null`. |
| `end` | `string \| null` | Heure de fin au format `"HH:MM"` ou `null`. |
| `color` | `string` | Couleur hexadécimale pour affichage (badges, barres, etc.). |

### 1.2 Exemple

```js
{
  code: "INF1428",
  name: "Modélisation UML",
  credits: 3,
  prof: "M. HOETOWOU",
  salle: "Salle N°2 Amphi Ampah Johnson",
  jour: "Mardi",
  start: "10:30",
  end: "13:30",
  color: "#16a34a"
}
```

### 1.3 Constantes associées

- **`DAYS`** : `["Dimanche", "Lundi", … , "Samedi"]` — ordre pour `Date.getDay()`.
- **`DAYS_SHORT`** : abréviations éventuelles.
- **`MONTHS`** : noms des mois en français pour l’affichage des dates.

---

## 2. Sessions de révision

Les sessions sont des **données utilisateur** : planification personnelle, créée/modifiée/supprimée dans l’application.

### 2.1 Structure d’une session

Chaque session est un objet avec les champs suivants :

| Champ | Type | Description |
|-------|------|-------------|
| `id` | `string` | Identifiant unique (généré par `utils.uniqueId()`). |
| `courseCode` | `string` | Code de l’UE concernée (référence à `COURSES_DATA`). |
| `date` | `string` | Date au format `YYYY-MM-DD`. |
| `duration` | `number` | Durée en heures (ex. 1.5, 2). |
| `startTime` | `string` | Heure de début optionnelle (`"HH:MM"` ou `""`). |
| `type` | `string` | Type : `revision`, `exercices`, `lecture`, `projet`, `tp`. |
| `notes` | `string` | Notes libres (optionnel). |

### 2.2 Types de session

Définis dans `constants.js` :

- **`TYPE_LABELS`** : libellés affichés (Révision, Exercices, Lecture, Projet, TP).
- **`TYPE_COLORS`** : couleurs d’affichage associées (hex).

Ajout d’un nouveau type : ajouter la clé dans `TYPE_COLORS` et `TYPE_LABELS`, puis l’option dans les formulaires (HTML + `app.js`).

---

## 3. Persistance (localStorage)

- **Clé** : `gl_s4_planner_v2` (définie dans `Storage.KEY`).
- **Format** : un seul objet JSON `{ "sessions": [ ... ] }`. Les cours ne sont pas stockés, ils viennent de `COURSES_DATA`.

### 3.1 API Storage (src/js/storage.js)

| Méthode | Description |
|---------|-------------|
| `Storage.get()` | Retourne `{ sessions: [] }` ou l’objet parsé depuis localStorage. |
| `Storage.set(data)` | Enregistre l’objet en JSON. |
| `Storage.getSessions()` | Retourne le tableau `sessions`. |
| `Storage.saveSessions(s)` | Met à jour `sessions` et appelle `set`. |

En cas d’erreur (parse, quota), `get()` renvoie `{ sessions: [] }` et `set()` ignore l’erreur.

---

## 4. Résumé des sources de données

| Donnée | Source | Modifiable par l’app |
|--------|--------|----------------------|
| Liste des UE, horaires, profs, salles | `COURSES_DATA` (constants.js) | Non |
| Jours, mois, types de session | `constants.js` | Non |
| Sessions de révision | localStorage (`gl_s4_planner_v2`) | Oui (CRUD) |

Pour **changer les cours** (nouveau semestre, autre formation), il suffit d’éditer `COURSES_DATA` dans `src/js/constants.js` et, si besoin, d’adapter les libellés (ex. « Semestre 4 ») dans le HTML ou les textes d’interface.

---

*Voir [DEVELOPPEMENT.md](./DEVELOPPEMENT.md) pour les procédures de modification (cours, pages, types de session).*
