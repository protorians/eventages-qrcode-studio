# Eventages QrCode Studio

**English** · [Français](./README.fr.md)

Eventages QrCode Studio is a desktop app (Tauri 2) for designing QR codes — **100% local, offline, no account, no server**. Every generation, every export and every piece of data stays on your machine.

![Atelier : aperçu du QR avec cadre, logo et contrôle de lisibilité](docs/images/builder-overview.png)

> Screenshots show the French interface (the UI ships in French). Labels are translated in parentheses where helpful.

## At a glance

- **22 QR types** — URL, Wi-Fi, vCard, SMS, WhatsApp, email, events, barcodes… plus self-contained page types (menus, PDF, galleries…) prepared for the next release and visible in the gallery as *Bientôt* (coming soon);
- **Project-based workflow** — drafts are editable indefinitely, publishing is a deliberate export step, and nothing is ever sent anywhere;
- **Deep visual customization** — module shapes, colors and gradients, corner markers, logos, frames with labels, and full-blown design templates;
- **Real-world mockups** — preview the code on an A3 poster, a business card, a table tent, packaging, a TV screen, a sticker or a T-shirt;
- **Scan-quality control** — a 0–100 readability score with one-click fixes (contrast, error correction, logo protection);
- **Local import** — open an existing QR/barcode image, SVG or PDF and it is decoded back into an editable project;
- **Multi-tab workspace** — every project lives in its own tab, like in a browser;
- **Headless CLI** — the same engine scripted for automation (`eventages-qr` / `eqr`).

## Projects & workspace tabs

The home tab is a permanent project registry: create, open, duplicate, delete, search and filter by type. Opening a project gives it its own tab in the title bar — the home tab stays always available. Every draft is saved automatically in the local registry; linking a `.qrd` file (Quick Response Document) lets you back a project with a real file on disk (manual save ⌘S or auto-save).

![Accueil : registre de projets avec recherche, filtres par type et progression](docs/images/home-projects.png)

Keyboard: ⌘N new, ⌘O open a `.qrd`/`.qcp` file, ⌘I import an existing code, ⌘W close tab, ⌘S save, ⇧⌘S save as, ⇧⌘E export, ⌘Z / ⇧⌘Z undo/redo (project-wide history), ⌘+ / ⌘− zoom the preview.

## QR type gallery

Types are grouped in families (Essentials, Contact, Web & social, Commerce, Events, Media, Advanced) with search and instant filtering.

![Galerie de types avec familles et encodage « direct »](docs/images/library-types.png)

| Type | What it encodes | Encoding |
| --- | --- | --- |
| URL, Texte | Link or free text | Direct |
| Wi-Fi | Join a network (SSID, WPA/WPA2/WPA3/WEP, hidden) | Direct |
| Email / SMS / WhatsApp | Pre-filled message or conversation | Direct |
| vCard | Full contact card | Direct |
| Événement (Event) | Calendar entry (iCalendar) | Direct |
| Code-barres (1D) | EAN-13, CODE-128, … dedicated 1D rendering | Direct |
| Menu, Produit, Coupon, PDF, Vidéo, Images, MP3, Playlist, Landing, Business, Feedback, App, vCard Plus, Liste de liens, Réseaux sociaux | Self-contained HTML pages to host yourself | Page • *Bientôt* (coming soon) |

All content is typed per type (URL validation, password fields, selects, switches, file upload…) with a completion progress and a **sample fill** button (*Exemple*) for quick demos.

## Customize the design

### Shapes, colors & robustness (Style)

Six module shapes, solid or gradient body color (rotation angle included), background colors or full transparency, error-correction level (L/M/Q/H) and quiet-zone width.

![Module style : formes, dégradé, fond, robustesse](docs/images/module-style.png)

### Corner markers (Coins)

Corner squares and corner centers can be restyled independently of the body (square, rounded, circle, soft, classy) — colors included.

![Module coins : marqueurs de position](docs/images/module-corners.png)

### Central logo

Upload your own square logo (PNG/JPG/SVG stays local) or pick one from the built-in vector set. Logo size, protection margin and hidden-dot compensation are tuned automatically against the error-correction level.

![Module logo : téléversement local et réglages de protection](docs/images/module-logo.png)

### Frames & label (Cadre)

A dozen numbered frames with adjustable radius/border/accent bar, plus an optional label («Scannez pour ouvrir») with its own typography and colors. The exact same composition math drives the on-screen preview and the exported file — what you see is what you get.

![Module cadre : habillage et libellé](docs/images/module-frame.png)

### Mockups

Swap the stage context to see the code in situ (decorative only — the code itself never changes).

![Mockups : mises en situation](docs/images/library-mockups.png)

### Design templates

Apply a complete look in one click (forms, colors, corners, frame) from eight templates — Aurora, Mono, Bubble, Classy, Citrus, Nightfall, Mint, Ticket — then fine-tune anything freely.

![Modèles de design](docs/images/library-templates.png)

### Readability check (SYS.DIAG)

Each edit updates a 0–100 scan score with concrete warnings (low contrast, weak error correction with a logo, dense payload…) and one-click fixes (*Renforcer*).

## Import an existing code

Breathe new life into an old code: pick an image, SVG or PDF containing a QR or a 1D barcode and the local engine decodes it, detects the content type (URL, Wi-Fi, vCard, SMS, event, EAN…) and pre-fills a new editable project — design hints are restored when recognizable. The conversion runs off the main thread with a live progress panel; the app stays usable meanwhile.

## Export & share

![Module export : formats, résolution et exports rapides](docs/images/module-export.png)

- **Formats**: PNG (transparency), JPEG, WEBP and SVG (fully vector) at 512 → 4096 px;
- **Quick exports**: direct PNG download, vector version, and one-click access to the formats above;
- **`.qrd` archive** — packs the whole project (content, design, logo) in one file, openable back in the desktop app and interchangeable with the CLI (legacy `.qcp` archives are still accepted);
- **System share sheet** (native under Tauri, Web Share in the browser) and **clipboard copy** of the encoded content.

## Settings, themes & privacy

![Paramètres : modes et thèmes de couleurs](docs/images/settings-appearance.png)

- **Appearance** — dark/light mode plus 12 color themes (Eventages, Mono, Dracula, Tokyo Night…);
- **Interface** — the HUD art direction (cut corners, mono typography, readouts) can be toned down entirely (*mode HUD* off);
- **Project** — linked `.qrd` file behavior and auto-save;
- **Data** — everything (projects, drafts, designs, logos, stats) lives on this machine: no account, no sync, no telemetry, no network call. Printed codes keep working offline forever;
- **CLI** — one switch installs the `eventages-qr` and `eqr` commands system-wide (symlinks in `/usr/local/bin` on macOS); turning it off removes them.

![Paramètres : registre local et confidentialité](docs/images/settings-data.png)

![Thème clair de l'atelier](docs/images/builder-light.png)

## Headless CLI (`eventages-qr`)

Create, manage and compose QR projects without any UI, from a terminal or a script — same modules as the app (`qr-catalog`, `qr-payload`, `qr-design`, `qr-frame`, `qcp`), same rendering path as the preview. The command ships under two names, `eventages-qr` and its short alias `eqr`.

```sh
eventages-qr help                # full help (or `eqr`)
bun run cli types                # equivalent while developing

eventages-qr init                # prepare ./studio (or EVENTAGES_QR_DIR, or --dir …)
eventages-qr create "Guest Wi-Fi" --type wifi \
  --set ssid=Guests --set password=welcome --template mint
eventages-qr list
eventages-qr payload "Guest Wi-Fi"

eventages-qr set "Guest Wi-Fi" --set password=newcode --design dotsColor=#10b981
eventages-qr render "Guest Wi-Fi" -o poster.png --size 2048   # SVG with --format svg
eventages-qr pack "Guest Wi-Fi"    # → .qrd archive (Quick Response Document), openable in the desktop app
eventages-qr import project.qrd    # and the other way around (legacy .qcp archives also accepted)

eventages-qr duplicate "Guest Wi-Fi"
eventages-qr delete "Guest Wi-Fi"
```

Workspace: one JSON file per project (`./studio`, overridable with the `--dir`
option or `EVENTAGES_QR_DIR` — the legacy `EVENTAGES_LITE_DIR` and
`QRS_STUDIO_DIR` are still honoured). SVG composition without a DOM, PNG via
`@resvg/resvg-js`; `--no-frame`, `--size` and `--design key=value` let you
compose a variant without modifying the project (`eventages-qr help <command>`
for details on each command).

## Development

```sh
bun install          # install dependencies (bun required)
bun run tauri dev    # run the desktop app in development
bun run build        # typecheck + production build (must pass before finishing any UI change)
```

### Stack

- **Tauri 2** + **React 19** + **TypeScript**
- **Tailwind CSS v4** (CSS-first config in `src/index.css`, `@theme inline`)
- **shadcn/ui**, `base-nova` style (Base UI primitives)
- **Icons: [lucide-react](https://lucide.dev/icons)** — the single icon set for the whole UI. No other icon library, no hand-written icon SVGs, no emoji used as icons. The only inline SVGs in the code are functional graphics (QR pattern previews, score gauge), not UI icons.
- Fonts: Manrope Variable (sans) and JetBrains Mono Variable (mono), embedded as latin subsets in `src/index.css`

## Documentation

- [`AGENTS.md`](./AGENTS.md) — conventions to follow when working on this repo (including the "lucide-react icons only" rule)
- [`docs/`](./docs/README.md) — product specs (SpecKit) and per-feature checklists
- [`docs/images/`](./docs/images) — the screenshots used in this README

## Recommended IDE

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://rust-lang.github.io/rust-analyzer/)
