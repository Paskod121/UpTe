# Guide de développement

---

## 1. Environnement

```bash
npx serve .           # Node
python -m http.server # Python 3
```

Modules ES — serveur local requis.

---

## 2. Conventions

- JS : ES modules, `"use strict"`. `App`, `UI`, `Learn`, `Notes`, `Combo` sur `window`.
- Validation : toutes les règles dans `validator.js`.
- Couleurs : `var(--xxx)` en CSS, `courseColor()` / `typeColor()` en JS. Jamais de hex en dur.
- Icônes : SVG inline. Pas d'emoji.
- Créneaux : toujours `getCourseSchedules()` — jamais `c.jour` directement.
- Placeholders prof : `M. PASKOD` ou `M. KOSSI`. Jamais d'autre nom.

---

## 3. Modifications courantes

### 3.1 CSS

| Fichier | Modifier quand |
|---|---|
| `variables.css` | Couleur, thème, backdrop fullscreen |
| `layout.css` | Sidebar, topbar, grilles, sidebar scroll |
| `components.css` | Composant existant |
| `utilities.css` | Bouton, tag, combobox, schedule builder, theme toast |
| `learning.css` | Pomodoro, documents, notes |

**Ajouter un thème :**
1. `variables.css` → `[data-theme="xxx"] { ... }`
2. `ui.js` → `THEMES` et `THEME_META`
3. `constants.js` → clé dans `color` et `TYPE_COLORS`
4. `utils.js` → `getTheme()` : ajouter le cas

### 3.2 Modifier les données de cours

`src/js/constants.js` → `COURSES_DATA`. Format :
```js
{
  code, name, credits, prof, salle,
  schedules: [{ jour, start, end }],  // Lundi–Dimanche, 06h–21h
  color: { green, blue, light }
}
```

Ou depuis la page Paramètres avec le schedule builder.

### 3.3 Ajouter/modifier les jours disponibles

`src/js/constants.js` → `WEEK_DAYS`. La grille semaine, la liste et le schedule builder s'adaptent automatiquement.

### 3.4 Modifier la plage horaire

`src/js/app.js` → `renderWeekGrid()` :
```js
const START_H = 6, END_H = 21, SLOT_H = 40, totalPx = (END_H-START_H)*SLOT_H + 24;
```

### 3.5 Ajouter une page

1. `index.html` — `<div class="page" id="page-xxx">` et `nav-item`
2. `ui.js` — `titles` dans `navigate()` et cas de rendu
3. `app.js` ou nouveau module — `renderXxx()`

### 3.6 Ajouter des suggestions au combobox

Dans `index.html`, trouver le `data-options` du combo concerné et ajouter la valeur dans le tableau JSON.

### 3.7 Ajouter un type de session

1. `constants.js` → `TYPE_COLORS` (3 clés) et `TYPE_LABELS`
2. `index.html` → `<option>` dans les deux selects de type

### 3.8 Ajouter une règle de validation

`src/js/validator.js` → fonction concernée → `setFieldError(fieldId, message)`.

---

## 4. PWA — checklist déploiement

- [ ] `src/images/icon-192.png` présent
- [ ] `src/images/icon-512.png` présent
- [ ] `src/images/og-cover.png` présent
- [ ] `manifest.json` valide (vérifier sur [web.dev/measure](https://web.dev/measure))
- [ ] HTTPS actif (Vercel le fournit automatiquement)

Installation : Chrome → icône d'installation barre d'adresse. iOS Safari → Partager → Sur l'écran d'accueil.

---

## 5. Fichiers à ne pas casser

- `index.html` — chemins `src/css/main.css` et `src/js/main.js` fixes.
- `src/css/main.css` — uniquement `@import`, ordre fixe.
- `src/js/main.js` — expose les 5 classes sur `window`.
- `Storage.KEY` — changer repart d'un localStorage vide.
- Ne jamais lire `c.jour` directement — toujours `getCourseSchedules(c)`.

---

## 6. Déploiement

```bash
git add .
git commit -m "feat: description"
git push
# Vercel déploie automatiquement
```

---

## 7. Mise à jour de la documentation

Après toute modification importante : `ARCHITECTURE.md`, `DONNEES.md`, `DEVELOPPEMENT.md`, `CHANGELOG.md`, `README.md`.