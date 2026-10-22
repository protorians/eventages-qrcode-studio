# Composants

Le code d'interface est rangé en trois familles, avec une seule direction de
dépendance autorisée :

```
ui  ←  builder  ←  shell
```

Autrement dit : `ui` ne dépend de rien d'autre que `@/lib/utils` et de ses
propres primitives ; `builder` peut consommer `ui` ; `shell` peut consommer
`ui` et `builder`.

## 1. `ui/` — l'interface réutilisable

C'est le petit design system de l'application : des briques génériques qui ne
savent rien du métier QR. On y trouve les primitives de base (`button.tsx`,
`dialog.tsx`, `select.tsx`, …) ainsi que des contrôles composites dans
`controls.tsx` (`SectionTitle`, `FieldRow`, `SliderControl`, `SwitchControl`,
`SegmentedControl`, `ColorControl`, `FileControl`, `OptionRow`, …).

Règles à respecter :

- aucun store, aucune donnée métier, aucun accès à la plateforme (fichiers,
  fenêtres, menus système…) ;
- les palettes, formats et presets sont **injectés par props** (ex.
  `swatches`, `presets`) et non importés depuis `@/lib` ;
- les couleurs et tokens de thème sont définis globalement dans
  `src/index.css` — jamais en dur dans un composant.

L'idée directrice : ce dossier pourrait être copié tel quel dans un autre
projet sans y apporter de modification.

## 2. `builder/` — les composants métier

Tout ce qui connaît le domaine QR : atelier, modules d'édition, panneaux,
aperçus, vues projets et import.

- `module-*.tsx`, `options-panel.tsx`, `library-panel.tsx`, `stage.tsx` ;
- `previews.tsx`, `qr-artboard.tsx`, `mockup-scene.tsx`, `tips-card.tsx` ;
- `project-actions.tsx` ;
- `views/` (`home-view.tsx`, `import-view.tsx`) : écrans métier de l'espace
  de travail.

Ces composants parlent aux stores (`builder-store`, `workspace-store`) et aux
libs (`qr-design`, `qr-export`, …). Ils ne sont pas destinés à être réutilisés
hors du studio QR.

## 3. `shell/` — l'habillage applicatif

Tout ce qui habille ou recouvre l'application sans appartenir ni au design
system ni au métier :

- `title-bar.tsx` : barre de titre native et onglets ;
- `native-menu.tsx` : menu système de l'application ;
- `app-header.tsx`, `mobile-nav.tsx` : chrome de navigation ;
- `settings-dialog.tsx` : surcouche de réglages ;
- `hud.tsx` : ornements décoratifs de la D.A. HUD.

Cette couche est spécifique à l'application et n'est pas portable. Elle peut
en revanche composer `ui` et `builder`.

## Ajouter un composant

| Besoin | Dossier |
| --- | --- |
| Bouton, champ, primitive d'interface de base | `ui/` |
| Contrôle générique réutilisable | `ui/controls.tsx` |
| Élément lié au QR, aux projets ou à l'export | `builder/` |
| Chrome, menu, overlay, ornement de l'app | `shell/` |
