# AGENTS.md

Guidelines for AI agents working in this repository.

## Icônes: lucide-react uniquement

Toutes les icônes de l'interface proviennent du set **`lucide-react`** (déjà en dépendance, import depuis `lucide-react` ou `import type { LucideIcon }`).

- **Interdit** : toute autre librairie d'icônes (`react-icons`, `heroicons`, `phosphor`, `@tabler/icons`…), tout SVG d'icône écrit à la main, tout emoji utilisé comme icône.
- Les composants shadcn (`src/components/ui/*`) importent déjà leurs icônes de `lucide-react` — ne pas les modifier sur ce point.
- Les SVG inline restants sont des **graphiques fonctionnels**, pas des icônes : vignettes de motifs QR et marqueurs de coin (`src/components/builder/previews.tsx`), jauge de score (`src/components/builder/tips-card.tsx`), wrapper d'export (`src/lib/qr-export.ts`), presets de logo (`src/lib/logo-presets.ts`). Les garder tels quels.
- Icônes dynamiques : typer les props avec `LucideIcon` (ex. `icon: LucideIcon` dans `src/lib/qr-catalog.ts`).
- Catalogue des icônes : https://lucide.dev/icons

## UI: shadcn components first

This app is **shadcn components first**. When building any UI:

1. **Always prefer an existing shadcn/ui component** (`src/components/ui/`) over hand-written markup. Check what's available before writing custom HTML/Tailwind structures.
2. **If a needed component doesn't exist yet**, add it via the shadcn CLI so it matches the configured style:
   ```sh
   bunx shadcn@latest add <component>
   ```
   Never copy component code by hand or import from other sources.
3. **Custom layout code is allowed only for composition** (positioning, spacing, grid/flex wrappers around shadcn components). Visual elements (buttons, inputs, cards, alerts, dialogs, etc.) must come from `src/components/ui/`.
4. Extend components via their `className` prop and design tokens (`bg-background`, `text-muted-foreground`, `font-mono`, ...) — never override their internals.
5. Keep imports using the `@/components/ui/*` alias.

## D.A. HUD : habillage des contrôles dans index.css

La direction artistique HUD (coins coupés, typo mono capitales, crans, lueurs) s'applique aussi aux contrôles shadcn — boutons, inputs, textarea, switch, tabs, select, slider, badge, toggle — **sans toucher à `src/components/ui/*`** :

- Le skin vit dans `src/index.css`, ciblé par `[data-slot="…"]` et scopé sous `html:not([data-hud="off"])`.
- HUD désactivé (`data-hud="off"`, réglage dans `use-settings.tsx`), le scope cesse de s'appliquer : les utilitaires Tailwind d'origine redeviennent prioritaires et les contrôles retrouvent la D.A. shadcn pure. Ne pas ajouter de neutralisations manuelles.
- Le focus clavier est reposé en **intérieur** (`box-shadow: inset`) car le `clip-path` des coins coupés découperait les anneaux (`ring`) externes.
- Pour habiller un composite maison (ex. `SegmentedControl` dans `controls.tsx`), lui donner un `data-slot` et l'ajouter à la même section CSS.

## Language: English for git artifacts

Commit messages, merge requests (titles, descriptions) and `CHANGELOG.md` entries are written in **English**. Code identifiers and comments keep their existing conventions.

## Stack

- Tauri 2 + React 19 + TypeScript
- Tailwind CSS v4 (CSS-first config in `src/index.css`, `@theme inline`)
- shadcn/ui, style `base-nova` (Base UI primitives), icon library: lucide
- Package manager: **bun**

## Fonts

- Principal font: **Manrope Variable** (`--font-sans`)
- Mono font: **JetBrains Mono Variable** (`--font-mono`) — use `font-mono` for technical values (URLs, payloads, IDs, code)
- HUD headings: **Anton** (poids unique 400), appliqué uniquement sous `html:not([data-hud="off"])` via `[data-slot="…-title"]` et la classe `.hud-heading`
- All loaded as inline latin-subset `@font-face` in `src/index.css` to keep the Tauri binary small. Do not import full Fontsource CSS files.

## Commands

- `bun run build` — typecheck + production build (must pass before finishing any UI change)
- `bun run tauri dev` — run the desktop app in development
- `bun run macos:sign` — sign the latest macOS `.app` produced by `tauri build` (prompts to pick a certificate when several identities are found, falls back to ad-hoc; `--dmg` also signs the latest `.dmg`, `--all` signs every `.app`, `--identity` / `--no-prompt` skip the prompt)
