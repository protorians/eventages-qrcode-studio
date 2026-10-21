# Eventages Lite

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

## CLI headless (`eventages-lite`)

Créer, gérer et composer des projets QR sans interface, depuis un terminal ou un
script — mêmes modules que l'app (`qr-catalog`, `qr-payload`, `qr-design`,
`qr-frame`, `qcp`), même tracé de rendu que l'aperçu. La commande existe sous
deux noms : `eventages-lite` et son alias court `evenlite`.

```sh
eventages-lite help               # aide complète (ou `evenlite`)
bun run cli types                 # équivalent en développement

eventages-lite init               # préparer ./studio (ou EVENTAGES_LITE_DIR, ou --dir …)
eventages-lite create "Wi-Fi invité" --type wifi \
  --set ssid=Invités --set password=bienvenue --template mint
eventages-lite list
eventages-lite payload "Wi-Fi invité"

eventages-lite set "Wi-Fi invité" --set password=nouvelcode --design dotsColor=#10b981
eventages-lite render "Wi-Fi invité" -o affiche.png --size 2048   # SVG avec --format svg
eventages-lite pack "Wi-Fi invité"   # → archive .qcp ouvrable dans l'app desktop
eventages-lite import projet.qcp     # et l'inverse

eventages-lite duplicate "Wi-Fi invité"
eventages-lite delete "Wi-Fi invité"
```

Espace de travail : un fichier JSON par projet (`./studio`, substituable par
l'option `--dir` ou `EVENTAGES_LITE_DIR` — l'ancien `QRS_STUDIO_DIR` reste
accepté). Composition SVG sans DOM, PNG via `@resvg/resvg-js` ; `--no-frame`,
`--size` et `--design clé=valeur` permettent de composer une variante sans
modifier le projet (`eventages-lite help <commande>` pour le détail de chaque
commande).

Pour rendre les commandes disponibles partout, ouvrez les paramètres de l'app
(section CLI) : l'interrupteur pose les liens symboliques `eventages-lite` et
`evenlite` dans le PATH (macOS : `/usr/local/bin`), et le retirer les supprime.
Sans installation, `bun run cli <commande>` fonctionne depuis le dépôt.

## Documentation

- [`AGENTS.md`](./AGENTS.md) — conventions à suivre pour travailler sur ce dépôt (dont la règle « icônes lucide-react uniquement »)
- [`docs/`](./docs/README.md) — specs produit (SpecKit) et checklists par fonctionnalité

## IDE recommandé

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://rust-lang.github.io/rust-analyzer/)
