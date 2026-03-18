# UpTe

Plateforme académique de suivi, révision et apprentissage.
Installable comme application sur mobile et desktop (PWA).

---

## Pages

| Page | Fonctionnalité |
|---|---|
| Tableau de bord | Stats dynamiques, cours du jour, sessions à venir |
| Emploi du temps | Grille Lun–Dim, 6h–21h, liste par jour |
| Mes cours | UE avec créneaux multiples |
| Planificateur | CRUD sessions, calendrier, stats |
| Conseils révision | 10 stratégies |
| Apprentissage | Pomodoro + bibliothèque PDF/DOCX/PPTX |
| Prise de notes | Éditeur riche, sauvegarde auto, export HTML |
| Paramètres | Établissement + CRUD cours avec créneaux multiples |

---

## Structure

```
UpTe/
├── index.html
├── manifest.json
├── favicon.svg
├── README.md / CHANGELOG.md / LICENSE
└── src/
    ├── css/   main · variables · layout · components · utilities · learning
    ├── js/    main · constants · storage · utils · validator · combo · ui · app · learn · notes
    ├── images/  icon-192.png · icon-512.png · og-cover.png
    ├── fonts/ · videos/
    └── docs/
```

---

## Installation & lancement

```bash
npx serve .           # Node
python -m http.server # Python 3
```

Modules ES — serveur local requis. Pas de build, pas de dépendances npm.

---

## Installation comme app (PWA)

**Android** : Chrome → icône d'installation dans la barre d'adresse.
**iOS** : Safari → Partager → Sur l'écran d'accueil.
**Desktop** : Chrome/Edge → icône d'installation barre d'adresse.

Une fois installée, l'app se lance en plein écran sans barre du navigateur.

---

## Données intégrées (GL-S4, 2025–2026)

27 crédits ECTS — 11 UE de Lundi à Vendredi. Modifiable depuis Paramètres.
Plage horaire disponible : 06h00 – 21h00. Jours : Lundi à Dimanche.

---

## Modifications courantes

- **Cours** → `src/js/constants.js` ou page Paramètres
- **Jours/heures** → `constants.js` (`WEEK_DAYS`) et `app.js` (`renderWeekGrid`)
- **CSS** → fichier concerné dans `src/css/`
- **Thème** → `src/docs/DEVELOPPEMENT.md` section 3.1

---

## Déploiement

Vercel — push sur `main` → déploiement automatique.
URL : `https://up-te.vercel.app`

---

## Licence

Usage personnel et académique. Université de Lomé — Promo GL 2025–2026.