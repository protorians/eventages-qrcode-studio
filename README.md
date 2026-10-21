# Eventages QrCode Studio

**English** · [Français](./README.fr.md)

Eventages QrCode Studio is a desktop app (Tauri 2) for creating QR codes — 100% local, no account required.

## Stack

- **Tauri 2** + **React 19** + **TypeScript**
- **Tailwind CSS v4** (CSS-first config in `src/index.css`, `@theme inline`)
- **shadcn/ui**, `base-nova` style (Base UI primitives)
- **Icons: [lucide-react](https://lucide.dev/icons)** — the single icon set for the whole UI. No other icon library, no hand-written icon SVGs, no emoji used as icons. The only inline SVGs in the code are functional graphics (QR pattern previews, score gauge), not UI icons.
- Fonts: Manrope Variable (sans) and JetBrains Mono Variable (mono), embedded as latin subsets in `src/index.css`

## Development

```sh
bun install          # install dependencies (bun required)
bun run tauri dev    # run the desktop app in development
bun run build        # typecheck + production build (must pass before finishing any UI change)
```

## Headless CLI (`eventages-qr`)

Create, manage and compose QR projects without any UI, from a terminal or a
script — same modules as the app (`qr-catalog`, `qr-payload`, `qr-design`,
`qr-frame`, `qcp`), same rendering path as the preview. The command ships under
two names, `eventages-qr` and its short alias `eqr`.

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

To make the commands available system-wide, open the app settings (CLI
section): the switch creates `eventages-qr` and `eqr` symlinks in the
PATH (macOS: `/usr/local/bin`), and turning it off removes them. Without
installation, `bun run cli <command>` works from the repository.

## Documentation

- [`AGENTS.md`](./AGENTS.md) — conventions to follow when working on this repo (including the "lucide-react icons only" rule)
- [`docs/`](./docs/README.md) — product specs (SpecKit) and per-feature checklists

## Recommended IDE

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://rust-lang.github.io/rust-analyzer/)
