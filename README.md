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

## CLI headless (`qrs`)

Créer, gérer et composer des projets QR sans interface, depuis un terminal ou un
script — mêmes modules que l'app (`qr-catalog`, `qr-payload`, `qr-design`,
`qr-frame`, `qcp`), même tracé de rendu que l'aperçu.

```sh
bun run cli help                  # aide complète
bun run cli types                 # catalogue des types de QR

bun run cli init                  # préparer ./studio (ou QRS_STUDIO_DIR, ou --dir …)
bun run cli create "Wi-Fi invité" --type wifi \
  --set ssid=Invités --set password=bienvenue --template mint
bun run cli list
bun run cli payload "Wi-Fi invité"

bun run cli set "Wi-Fi invité" --set password=nouvelcode --design dotsColor=#10b981
bun run cli render "Wi-Fi invité" -o affiche.png --size 2048   # SVG avec --format svg
bun run cli pack "Wi-Fi invité"   # → archive .qcp ouvrable dans l'app desktop
bun run cli import projet.qcp     # et l'inverse

bun run cli duplicate "Wi-Fi invité"
bun run cli delete "Wi-Fi invité"
```

Espace de travail : un fichier JSON par projet (`./studio`, substituable par
l'option `--dir` ou `QRS_STUDIO_DIR`). Composition SVG sans DOM, PNG via
`@resvg/resvg-js` ; `--no-frame`, `--size` et `--design clé=valeur` permettent
de composer une variante sans modifier le projet (`bun run cli help <commande>`
pour le détail de chaque commande).

## Documentation

- [`AGENTS.md`](./AGENTS.md) — conventions à suivre pour travailler sur ce dépôt (dont la règle « icônes lucide-react uniquement »)
- [`docs/`](./docs/README.md) — specs produit (SpecKit) et checklists par fonctionnalité

## IDE recommandé

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://rust-lang.github.io/rust-analyzer/)
