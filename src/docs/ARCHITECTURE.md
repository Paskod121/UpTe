# Architecture — UpTe

---

## Structure des fichiers

```
UpTe/
├── index.html
├── manifest.json
├── favicon.svg
├── sw.js                   service worker (offline)
├── README.md
├── CHANGELOG.md
├── LICENSE
└── src/
    ├── css/
    │   ├── main.css
    │   ├── variables.css
    │   ├── layout.css
    │   ├── components.css
    │   ├── utilities.css   + combobox, schedule builder, theme toast
    │   └── learning.css
    ├── js/
    │   ├── main.js         bootstrap, Auth, Sync, App
    │   ├── auth.js         Supabase auth + profil + WebAuthn (enrôlement)
    │   ├── auth-screen.js  UI connexion / onboarding / WebAuthn optionnel
    │   ├── sync.js         push/pull Supabase
    │   ├── supabase.js     client Supabase
    │   ├── constants.js    COURSES_DATA schedules[], WEEK_DAYS (7 jours)
    │   ├── storage.js      + backup/restore courses
    │   ├── utils.js
    │   ├── validator.js
    │   ├── combo.js        combobox custom (remplace datalist)
    │   ├── ui.js           + toggleFullscreen, cycleTheme anti-spam
    │   ├── app.js          + stats dynamiques, année académique, undo reset
    │   ├── learn.js
    │   └── notes.js        + deleteNote via UI.confirm
    ├── images/
    │   ├── icon-192.png    requis PWA
    │   ├── icon-512.png    requis PWA
    │   └── og-cover.png    prévisualisation réseaux sociaux
    ├── fonts/
    ├── videos/
    └── docs/
```

---

## CSS — organisation modulaire

| Fichier | Contenu |
|---|---|
| `variables.css` | `:root`, thèmes (`green` défaut, `blue`, `light`, `rose`), `::backdrop` pour transition fullscreen |
| `layout.css` | Sidebar scrollable, topbar, grilles, responsive |
| `components.css` | Cards, slots, modales, formulaires, validation |
| `utilities.css` | Boutons, tags, animations, combobox, schedule builder, theme toast, fullscreen btn |
| `learning.css` | Pomodoro, documents, notes |

---

## Modules JavaScript

### `constants.js`

```js
WEEK_DAYS = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"]
COURSES_DATA = [{ ..., schedules: [{ jour, start, end }], color: { green, blue, light } }]
TYPE_COLORS  = { revision: { green, blue, light }, ... }
```

### `storage.js`

Clés localStorage :

```
gl_s4_planner_v2         sessions de révision
upte_settings            { universite, ecole, parcours, semestre, annee }
upte_courses             cours personnalisés | null
upte_courses_backup      sauvegarde temporaire avant réinitialisation
upte_theme               "light" | "blue" | "green" | "rose"
upte_pomo_total          compteur Pomodoro
```

Méthodes ajoutées : `restoreCoursesBackup()`, `hasCoursesBackup()`.

### `combo.js`

Composant combobox custom — remplace les `<datalist>` natifs pour un rendu cohérent avec les thèmes.

```
Combo.init()                    initialise toutes les .combo-wrap
Combo.open(wrapId)              ouvre le dropdown
Combo.filter(wrapId)            filtre les options selon la saisie
Combo.select(wrapId, value)     sélectionne une option
Combo.blur(wrapId)              ferme avec délai (laisse le mousedown s'exécuter)
```

Exposé sur `window.Combo`. Fermeture automatique au clic en dehors.

### `utils.js`

```
normalizeCourse(c)          migration ancien format → schedules[]
getActiveCourses()          cours custom normalisés ou COURSES_DATA
courseByCode(code)
getCourseSchedules(c)       → Schedule[]
getSchedulesForDay(c, jour)
getCoursesForDay(courses, jour)
getTheme()                  → "green" | "blue" | "light" | "rose"
courseColor(course)
typeColor(typeColors)
```

### `ui.js`

- Navigation 8 pages : dashboard, schedule, courses, planner, tips, learn, notes, settings
- `cycleTheme()` — anti-spam (`_themeChanging`) ; enchaîne Vert → Bleu → Clair → Rose → Vert (pas de toast à chaque cycle)
- `toggleFullscreen()` — bascule fullscreen API, met à jour l'icône du bouton
- `_rerenderAll()` — re-rendu complet au changement de thème
- Sidebar scrollable via CSS (`nav-section` avec `overflow-y: auto`)

### `app.js`

Stats dynamiques dans `renderDashboard()` :

```js
// Mis à jour à chaque rendu
statTotalUE       ← getActiveCourses().length
statTotalCredits  ← somme des crédits
sidebarCredits    ← "XX ECTS"
creditsBar        ← width % (base 30 crédits)
```

Paramètres établissement — 5 champs : `universite`, `ecole`, `parcours`, `semestre`, `annee`.

`resetCourses()` — sauvegarde avant suppression + toast avec compte à rebours 30s + bouton "Annuler" → `_undoReset()`.

`renderWeekGrid()` — `START_H = 6`, `END_H = 21`, `totalPx + 24` (padding bas), colonnes dynamiques selon `WEEK_DAYS.length`.

Pages cours dynamiques — `coursesPageTitle`, `coursesCreditsTag`, `scheduleYearTag` mis à jour.

---

## Auth, synchronisation, onboarding

| Fichier | Rôle |
|---|---|
| `auth.js` | Supabase : Google OAuth, OTP e-mail, profil `users`. WebAuthn : enrôlement optionnel (`enrollWebAuthn`) — enregistre l’ID credential côté profil. La session reste **OAuth / OTP** ; un flux « connexion uniquement biométrie » nécessiterait un backend qui valide les assertions FIDO2 (non présent ici). |
| `auth-screen.js` | Écran connexion + questionnaire post-connexion : filières et semestres avec **champ de recherche** (liste indicative, saisie libre université/école). |
| `sync.js` | Push/pull (settings dont `theme`, cours, sessions) après connexion. |

---

## PWA

```
manifest.json
  display: "fullscreen"
  icons: icon-192.png, icon-512.png, favicon.svg
  shortcuts: "Planifier une révision", "Emploi du temps"
  background_color, theme_color

favicon.svg              onglet navigateur
src/images/icon-192.png  icône Android/iOS
src/images/icon-512.png  icône splash screen
src/images/og-cover.png  prévisualisation WhatsApp/Discord
```

Le plein écran automatique est demandé via `requestFullscreen()` au chargement. Sur Firefox, un flash noir apparaît — comportement navigateur non modifiable. Sur Chrome/Safari/Edge, la transition est fluide. Une fois installée comme PWA, la barre de confirmation du navigateur disparaît.

---

## Flux de données

```
getActiveCourses() → normalizeCourse() → schedules[]
        ↓
App.render*() + applySettings()
        ↓
DOM + IDs dynamiques (statTotalUE, sidebarCredits, sidebarAnnee...)
        ↑
onclick → App/UI/Combo/Learn/Notes
        ↓
validator.js → Storage.save*()
        ↓
re-rendu ciblé ou _rerenderAll()
```