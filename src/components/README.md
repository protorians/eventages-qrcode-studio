# Composants

Trois groupes, avec une seule direction de dépendance autorisée :

```
ui  ←  builder  ←  shell
```

Autrement dit : `ui` ne dépend de rien d'autre que `@/lib/utils` et de ses
propres primitives ; `builder` peut consommer `ui` ; `shell` peut consommer
`ui` et `builder`.

## 1. `ui/` — interface réutilisable

Design system portable, copiable tel quel dans un autre projet React/Tailwind :

- primitives **shadcn/ui** (`button.tsx`, `dialog.tsx`, `select.tsx`, …) ;
- composites génériques dans `controls.tsx` (`SectionTitle`, `FieldRow`,
  `SliderControl`, `SwitchControl`, `SegmentedControl`, `ColorControl`,
  `FileControl`, `OptionRow`, …).

Règles :

- aucun store, aucune donnée métier, aucun appel Tauri ;
- les palettes, formats et presets sont **injectés par props** (ex.
  `swatches`, `presets`) et non importés depuis `@/lib` ;
- les tokens de thème viennent de `src/index.css`.

## 2. `builder/` — composants métier

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

## 3. `shell/` — surcouche applicative

Tout ce qui habille ou recouvre l'application sans appartenir ni au design
system ni au métier :

- `title-bar.tsx` : barre de titre native et onglets ;
- `native-menu.tsx` : menu système Tauri ;
- `app-header.tsx`, `mobile-nav.tsx` : chrome de navigation ;
- `settings-dialog.tsx` : surcouche de réglages ;
- `hud.tsx` : ornements décoratifs de la D.A. HUD.

Cette couche est spécifique à l'application et n'est pas portable. Elle peut
en revanche composer `ui` et `builder`.

## Ajouter un composant

| Besoin | Dossier |
| --- | --- |
| Bouton, champ, primitive shadcn | `ui/` (via `bunx shadcn@latest add …`) |
| Contrôle générique réutilisable | `ui/controls.tsx` |
| Élément lié au QR, aux projets ou à l'export | `builder/` |
| Chrome, menu, overlay, ornement de l'app | `shell/` |
