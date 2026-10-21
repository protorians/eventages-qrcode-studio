# Eventages QrCode Studio

[English](./README.md) · **Français**

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

## CLI headless (`eventages-qr`)

Créer, gérer et composer des projets QR sans interface, depuis un terminal ou un
script — mêmes modules que l'app (`qr-catalog`, `qr-payload`, `qr-design`,
`qr-frame`, `qcp`), même tracé de rendu que l'aperçu. La commande existe sous
deux noms : `eventages-qr` et son alias court `eqr`.

```sh
eventages-qr help               # aide complète (ou `eqr`)
bun run cli types               # équivalent en développement

eventages-qr init               # préparer ./studio (ou EVENTAGES_QR_DIR, ou --dir …)
eventages-qr create "Wi-Fi invité" --type wifi \
  --set ssid=Invités --set password=bienvenue --template mint
eventages-qr list
eventages-qr payload "Wi-Fi invité"

eventages-qr set "Wi-Fi invité" --set password=nouvelcode --design dotsColor=#10b981
eventages-qr render "Wi-Fi invité" -o affiche.png --size 2048   # SVG avec --format svg
eventages-qr pack "Wi-Fi invité"   # → archive .qrd (Quick Response Document) ouvrable dans l'app desktop
eventages-qr import projet.qrd     # et l'inverse (les archives .qcp historiques restent acceptées)

eventages-qr duplicate "Wi-Fi invité"
eventages-qr delete "Wi-Fi invité"
```

Espace de travail : un fichier JSON par projet (`./studio`, substituable par
l'option `--dir` ou `EVENTAGES_QR_DIR` — les anciens `EVENTAGES_LITE_DIR` et
`QRS_STUDIO_DIR` restent acceptés). Composition SVG sans DOM, PNG via
`@resvg/resvg-js` ; `--no-frame`, `--size` et `--design clé=valeur` permettent de
composer une variante sans modifier le projet (`eventages-qr help <commande>`
pour le détail de chaque commande).

Pour rendre les commandes disponibles partout, ouvrez les paramètres de l'app
(section CLI) : l'interrupteur pose les liens symboliques `eventages-qr` et
`eqr` dans le PATH (macOS : `/usr/local/bin`), et le retirer les supprime.
Sans installation, `bun run cli <commande>` fonctionne depuis le dépôt.

## Documentation

- [`AGENTS.md`](./AGENTS.md) — conventions à suivre pour travailler sur ce dépôt (dont la règle « icônes lucide-react uniquement »)
- [`docs/`](./docs/README.md) — specs produit (SpecKit) et checklists par fonctionnalité

## IDE recommandé

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://rust-lang.github.io/rust-analyzer/)
