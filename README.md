# QR Code Studio

Application desktop (Tauri 2) de création de QR codes, 100 % locale et sans compte.

## Stack

- **Tauri 2** + **React 19** + **TypeScript**
- **Tailwind CSS v4** (config CSS-first dans `src/index.css`, `@theme inline`)
- **shadcn/ui**, style `base-nova` (primitives Base UI)
- **Icônes : [lucide-react](https://lucide.dev/icons)** — set unique pour toute l'interface. Aucune autre librairie d'icônes, aucun SVG d'icône écrit à la main, aucun emoji utilisé comme icône. Les seuls SVG inline du code sont des graphiques fonctionnels (aperçus de motifs QR, jauge de score), pas des icônes UI.
- Polices : Manrope Variable (sans) et JetBrains Mono Variable (mono), embarquées en sous-ensembles latins dans `src/index.css`

## Développement

```sh
bun install          # installer les dépendances (bun obligatoire)
bun run tauri dev    # lancer l'app desktop en développement
bun run build        # typecheck + build production (à valider avant toute fin de modification UI)
```

## Documentation

- [`AGENTS.md`](./AGENTS.md) — conventions à suivre pour travailler sur ce dépôt (dont la règle « icônes lucide-react uniquement »)
- [`docs/`](./docs/README.md) — specs produit (SpecKit) et checklists par fonctionnalité

## IDE recommandé

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://rust-lang.github.io/rust-analyzer/)
