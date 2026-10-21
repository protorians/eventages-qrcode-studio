# Changelog

All notable changes to **Eventages QrCode Studio** are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and follows
[semantic versioning](https://semver.org/): at this stage, the app is in
`0.x` and the product is not yet promised stable.

---

## [0.1.1] — 2026-10-22 · Pipeline de release

Tranche d'infrastructure : aucune évolution fonctionnelle, l'application est inchangée.

### Interne
- **Pipeline de release desktop** (`.github/workflows/release.yml`) : builds Tauri sur
  `main`, `beta` et `alpha` (drafts glissants), publication directe à la poussée d'un
  tag `v*`.
- Correctif CI : `tauri-action` épinglé sur `v1` (le tag `v2` n'existe pas).
## [0.7.0] — 2026-10-20 · Identité Eventages Lite : nommage technique et icônes
## [0.12.0] — 2026-10-21 · Multilingual interface (11 languages, RTL)

### Added

- **Interface language setting** with a new "Language" section in Settings:
  eleven languages are offered (English, French, Spanish, German, Italian,
  Portuguese, Dutch, Russian, Japanese, Simplified Chinese, Arabic) and
  English is the default. The choice is applied instantly to the whole UI
  (including native menus, rebuild on language change), persisted locally
  with the other preferences, and reflected in `<html lang>`.
- **i18n infrastructure** (`src/lib/i18n/`): flat keyed dictionaries
  (`dictionaries/{en,fr,es,de,it,pt,nl,ru,ja,zh,ar}.ts`), `I18nProvider` +
  `useT()` React hook and `translate()` for non-React modules, `{param}`
  interpolation, and per-key English fallback. The English dictionary keys
  type the translator (`TranslationKey`), so `tsc` enforces key parity for
  every language.
- **System language detection on first launch**: when no language
  preference is stored yet, the interface starts in the system's preferred
  language (primary subtag match over `navigator.languages`, e.g.
  "pt-BR" → Portuguese); an explicit choice in Settings always wins and is
  then persisted as usual.
- **Right-to-left support with Arabic** (العربية): `<html lang>` and
  `<html dir>` track the UI language (`rtl`/`ltr` via `isRtlLocale`),
  setting `dir="rtl"` mirrors the shell — panel dividers and search fields
  moved to logical properties (`border-e/s`, `ps/pe`, `text-start`) and the
  mobile library/options drawers slide from the reading-side edge. Arabic
  system fonts ("Geeza Pro", "Segoe UI", "Noto Sans Arabic") serve as
  fallbacks for the latin-subset fonts without growing the binary, and
  letter-spacing is neutralized while `lang=ar` because it breaks Arabic
  letter joining (HUD/typestyle spacing included). Noun morphology uses an
  Arabic-aware `{plural}` param (full noun phrase: zero, singular, dual,
  plural for 3–10, and the 11–99 singular form).
- **Translated backend messages** (`src-tauri/src/i18n.rs`): the
  user-facing strings returned by Tauri commands are translated in the UI
  language — CLI status and install/uninstall, save/open/import/export
  interruptions, `.qrd` archive and QR-decode errors, and native share
  failures across the same eleven languages, with per-key English fallback.
  The `I18nProvider` sets the language at startup and on every change via
  the new `set_ui_locale` command, so command signatures stay untouched;
  catalog parity is enforced by unit tests, and system errors (io errors)
  remain in the OS language inside the translated wrapper.

### Changed

- **Release pipeline** (`.github/workflows/release.yml`): `tauri-action`
  bumped to v2, RPM build tools installed on the Linux runner, and the tag
  resolution step extracts the version from `tauri.conf.json` in native
  Bash (no Node.js required on the runner).
- All user-facing French strings moved to translation keys across the shell
  (title bar, native menus, settings dialog), home/import views, builder
  panels, QR type catalog (labels, taglines, form fields), design presets,
  barcode format hints, analysis messages and CLI dialog. Sample/default
  project CONTENT (e.g. vCard samples, template texts like "Scannez-moi")
  remains French by design: it is user data seeded into projects, not UI
  chrome.
- Versions aligned to 0.12.0 (`package.json`, `tauri.conf.json`,
  `Cargo.toml`).

---

## [0.11.0] — 2026-10-21 · macOS code signing and documentation overhaul

### Added

- **macOS code signing script** (`scripts/sign-macos.sh`) that signs the
  `.app` bundle (and optionally the `.dmg` via `--dmg`) produced by
  `tauri build`: when several code-signing identities exist, an interactive
  menu lets you pick the certificate to use (Developer ID first, then Apple
  Development; `--identity` / `--no-prompt` bypass the menu, non-interactive
  environments default to the first certificate), and it falls back to ad-hoc
  signing when no certificate is available; hardened runtime + timestamping
  are enabled automatically for Developer ID certificates (notarization-
  ready). Exposed as npm scripts `macos:sign`, `macos:sign:dmg` and
  `desktop:build:signed`.

### Changed

- **Documentation overhaul**: both READMEs rewritten as full product
  presentations (feature highlights, project/tab workflow, QR type gallery,
  design customization, import, export, settings & privacy) with screenshots
  embedded from the new `docs/images/` folder, and `AGENTS.md` documents the
  new `macos:sign` command.
- Versions aligned to 0.11.0 (`package.json`, `tauri.conf.json`,
  `Cargo.toml`).

---

## [0.10.0] — 2026-10-21 · Product rename to "Eventages QrCode Studio" and `.qrd` archives

### Added

- **Desktop release pipeline**: a new GitHub Actions workflow builds the
  Tauri 2 app on Windows (`.msi` + `.exe` setup), macOS (universal `.dmg`)
  and Linux (`.deb`, `.rpm`, `.AppImage`) and uploads the installers as
  assets of the matching GitHub release — published on a `v*` tag push,
  or created as a draft on manual dispatch (`.github/workflows/release.yml`).

### Changed

- **Product renamed to "Eventages QrCode Studio"** (formerly "Eventages
  Lite"): displayed name (title bar, tab titles, native menus, About
  dialog, window title, mockup watermark), iCalendar `PRODID`,
  `package.json`, release naming and documentation
  (`tauri.conf.json`, `title-bar.tsx`, `native-menu.tsx`,
  `mockup-scene.tsx`, `qr-payload.ts`).
- **Technical naming aligned with the new product name**: npm package name
  (`eventages-qr`), Rust crate name (`Eventages-Qr`), bundle identifier
  (`com.protorians.eventages-qr`), headless CLI entry script
  (`cli/eventages-lite.ts` → `cli/eventages-qr.ts`), CLI command names
  (`eventages-lite` / `evenlite` → `eventages-qr` / `eqr`) and workspace
  directory override (`EVENTAGES_LITE_DIR` → `EVENTAGES_QR_DIR` — the
  legacy `EVENTAGES_LITE_DIR` and `QRS_STUDIO_DIR` remain honoured for
  compatibility) (`package.json`, `src-tauri/Cargo.toml`,
  `tauri.conf.json`, `cli/`, `src-tauri/src/cli.rs`, `cli/workspace.ts`).
- **Project archive format renamed to `.qrd`** (Quick Response Document):
  the `manifest.json` now carries `format: "qrd"` and `app: "qrd"`, new
  saves default to the `.qrd` extension (desktop dialogs and CLI `pack`),
  and the backend enforces it — while existing `.qcp` archives stay fully
  readable and re-editable (both in the app and via CLI `import`) (`src/lib/qcp.ts`,
  `src-tauri/src/qcp.rs`, `cli/workspace.ts`).
- **Documentation and user-facing strings updated for the new name and
  commands**: both READMEs, the CLI settings section, dialog file filters
  (`QCP_FILTERS`, `.qrd` for writes, `.qcp` kept for reads) and the headless
  CLI docs (`README.md`, `README.fr.md`, `settings-dialog.tsx`,
  `use-project-save.ts`).
- Versions aligned to 0.10.0 (`package.json`, `tauri.conf.json`,
  `Cargo.toml`).

---

## [0.9.0] — 2026-10-21 · Home registry redesign and title-bar polish

### Changed

- **Home registry redesign**: project cards now grow in a `max-w-7xl` grid
  with 16 rem minimum columns, a full-bleed QR preview and floating panels —
  type, progress and status on top, name, last modification and progress bar
  at the bottom, duplicate/delete actions in the top-right corner. Hover
  elevation is deeper, cards use rounded corners and the header gradient line
  only renders when the HUD is enabled (`home-view.tsx`).
- **HUD skin extended to floating layers**: a new `.hud-layer` selector joins
  the card rule in `index.css`, so cut corners also apply to the card overlays
  and the "new project" tile.
- **Home footer credit**: a vertical separator closes the offline status line
  and adds a "Powered by Yannick GOBOU" credit (`home-view.tsx`).
- **Fullscreen title bar** (macOS): the reserved traffic-light padding is
  removed in fullscreen, letting the tab ribbon use the full width
  (`title-bar.tsx`).
- **Theme toggle icons**: the button now shows the theme it switches to — sun
  in dark mode, moon in light mode (`title-bar.tsx`).
- **Default color theme renamed** from "Or Studio" to "Lior" in the settings
  catalogue, with the CSS comments updated (`use-settings.tsx`,
  `index.css`).
- Versions aligned to 0.9.0 (`package.json`, `tauri.conf.json`,
  `Cargo.toml`).

---

## [0.8.0] — 2026-10-21 · CLI `eventages-lite`, image import and native menu

### Added

- **Image → project conversion (QR codes and barcodes)**: an existing image,
  SVG or PDF containing a QR code or a barcode becomes a real editing project.
  Decoding is fully local — `rqrr` first for QR, with `rxing` as fallback for
  1D symbologies (EAN, UPC, Code 128/39/93, ITF, Codabar…) and the other 2D
  matrices (Data Matrix, Aztec, PDF417…), including inverted or dark-mode
  codes. The decoded payload is analysed to pre-fill the right project type
  (URL, Wi-Fi, email, SMS, barcode…) with "Texte" as the last resort.
  During the conversion a transient tab hosts a progress panel
  (`import-view.tsx`, new shadcn `progress.tsx` component): stage-by-stage
  statuses (file opening, decoding, content, project creation), a percentage
  driven by a Tauri channel, and Cancel / Retry actions — a cancelled import
  never touches the registry or the draft. On success the tab becomes the new
  project's tab (`src-tauri/src/import.rs`, `src/lib/qr-import.ts`,
  `src/lib/workspace-store.tsx`).
- **Reconstruction of decoded design**: the visual settings are deduced from
  the pixels alone — module and background colours, gradient, corner and eye
  styles, dot styles, centred logo, frame — so a code produced by any
  generator comes back editable as seen (`src-tauri/src/import_design.rs`).
- **Native application menubar**: the system menu bar now carries the app
  menus. Fichier covers the project lifecycle — new project (new ⌘N
  shortcut), open a `.qcp` file, import an existing QR image, save, save
  as, export — with draft actions disabled on the Home tab; Édition and
  Fenêtre provide the native predefined roles (clipboard, window
  management), keeping ⌘C/⌘V working in text fields on macOS; Affichage
  gathers the light/dark mode, the color themes (submenu), the HUD
  ornaments and animations toggles, kept in sync with the settings
  dialog; Aide opens an "About" dialog showing the app version. Built
  with the Tauri menu API and wired to the front-end stores
  (`native-menu.tsx`); save logic is shared with the title-bar button
  through the `useProjectSave` hook (`use-project-save.ts`), whose ⌘S
  shortcuts now only apply in the browser shell, and the native
  file-picker filters moved to `lib/qcp.ts` and `lib/qr-import.ts`.
- **Undo/redo of draft edits**: the active draft carries a bounded
  past/future history of complete states — ⌘Z/⌘⇧Z undo and redo. Edits of
  the same kind made in quick succession (key-by-key typing, slider drags)
  are coalesced into a single entry, so one ⌘Z removes a whole sequence.
  Metadata actions (saving, active module, linked path) stay out of the
  history, and switching projects starts a fresh one
  (`src/lib/builder-store.tsx`).
- **"Eventages" color theme**: a new palette joins the light/dark color
  themes, selectable from the settings and the Affichage menu
  (`src/themes.css`, `src/hooks/use-settings.tsx`).
- **CLI availability from the app settings**: a new "CLI" section
  (Settings → MOD.05) shows the state of the headless commands and exposes a
  switch that makes them available in the terminal — the native backend creates
  `eventages-lite` and `evenlite` symlinks in the PATH (`/usr/local/bin` on
  macOS, `~/.local/bin` elsewhere on Unix) pointing at the CLI entry script,
  and turning the switch off removes them. A real file already in place is
  refused, never overwritten (`src-tauri/src/cli.rs`, `src/lib/cli-desktop.ts`,
  `settings-dialog.tsx`); covered by a symlink roundtrip test (`cargo test`).

### Changed

- **CLI renamed to `eventages-lite` (alias `evenlite`)**: the headless entry
  script `cli/qrs.ts` becomes `cli/eventages-lite.ts` and all command names,
  help texts, usage strings and `--version` output use the new name. `bun run
  cli` remains the development entry point, and the `bin` field
  (`eventages-lite` / `evenlite`) supports `bun link`.
- **Reworked tab ribbon**: the Home tab and a "new project" button are pinned
  outside of the scroll area, the open-project tabs scroll on their own, and
  the transient import tab lives inside the ribbon (`stage.tsx`,
  `module-dock.tsx`).
- **Component architecture documented and reorganized**: shell parts move out
  of `builder/` (`app-header`, `hud`, `mobile-nav`, `settings-dialog` →
  `src/components/shell/`), shared composites move to
  `src/components/ui/controls.tsx`, and the app views live under
  `src/components/builder/views/`. The single allowed dependency direction
  `ui ← builder ← shell` is written down in the new `src/components/README.md`.
- **Bilingual README**: the main `README.md` is now written in English, with
  the original French version kept as `README.fr.md`.
- Workspace directory override renamed to `EVENTAGES_LITE_DIR`; the legacy
  `QRS_STUDIO_DIR` is still honoured for compatibility.
- Project files keep the internal `.qcp`/JSON format identifier unchanged, so
  existing projects and archives stay readable by both the app and the CLI.
- Bundle identifier aligned with the product name:
  `com.protorians.eventages-lite`.
- Versions aligned to 0.8.0 (`package.json`, `tauri.conf.json`, `Cargo.toml`).

---

## [0.7.1] — 2026-10-20 · English-language project artifacts

### Changed

- **CHANGELOG translated to English**: all entries are now written in
  English, following the new documentation convention
  (`CHANGELOG.md`).
- `AGENTS.md`: new convention "Language: English for git artifacts" —
  commit messages, merge request titles/descriptions and `CHANGELOG.md`
  entries are written in English; code identifiers and comments keep
  their existing conventions.
- Versions aligned to 0.7.1 (`package.json`, `tauri.conf.json`,
  `Cargo.toml`).

---

## [0.7.0] — 2026-10-20 · Eventages Lite identity: technical naming and icons

### Changed
- **Technical naming aligned with "Eventages Lite"**: npm package name
  (`eventages-lite`) and Rust crate name (`Eventages-Lite`), `app` field of
  `.qcp` projects — created by both the UI and the CLI
  (`package.json`, `src-tauri/Cargo.toml`, `cli/workspace.ts`,
  `src-tauri/src/qcp.rs`). The bundle identifier remains
  `com.protorians.eventages-lite`.
- **New app icon set**: light, dark, black and white icons served from
  `public/assets/images/` (favicon and brand mark), plus a fully regenerated
  Tauri icon set — desktop (`.icns`, `.ico`, PNG), Android (mipmaps +
  adaptive icon) and iOS (AppIcon) (`src-tauri/icons/`).
- **Brand logo in the title bar** (`title-bar.tsx`): the icon shows next to
  the name and follows the light/dark theme.
- Versions aligned to 0.7.0 (`package.json`, `tauri.conf.json`,
  `Cargo.toml`).

---

## [0.6.0] — 2026-10-20 · Tabbed workspace, 1D barcodes and native title bar

### Added

#### Figma-style tabbed workspace
- **Permanent "Home" tab**: the former "Project" modal becomes a
  full-fledged project manager, always open
  (`src/components/shell/home-view.tsx`) — search, per-project cards
  (thumbnail, dates), creation, duplication, deletion, opening a
  `.qcp` and importing a QR from an image, an SVG or a PDF;
  `project-dialog.tsx` is gone.
- **One tab per open project** above the workshop
  (`src/lib/workspace-store.tsx`): the editor holds a single draft at a
  time — switching tabs writes the draft to the registry then reloads
  the target project's, which keeps its editing state.
- **Persisted tabs** (`qrcode-studio:tabs:v1`): the active tab from the
  previous session is rehydrated at startup, without flashing the wrong
  content (`builder-store.tsx`).
- **Project actions in the title bar** (`project-actions.tsx`):
  save (⌘S), "Save As…" (⌘⇧S) and export, with status light,
  flash and error — they only apply to the active tab, never to others.

#### Native title bar
- **Figma-style bar** (`src/components/shell/title-bar.tsx`): brand,
  tab ribbon, theme, settings, save/export and window controls; the bar
  is a native drag region (`data-tauri-drag-region`), only interactive
  elements opt out. Outside the Tauri shell (browser dev), the controls
  are hidden.
- **Wider window** at 1280 × 768 (min. 720 × 500); on macOS, overlay
  title bar with hidden title (`src-tauri/tauri.macos.conf.json`);
  native permissions added (drag, minimize, maximize, close).
- **Integrations**: host OS detection and `data-os` flag on `<html>`
  (`src/lib/tauri.ts`), maximized/fullscreen state synced on native
  events (`src/hooks/use-window-state.ts`).

#### 1D barcodes
- **New "Barcode" type** (`src/lib/barcode.ts`, jsbarcode):
  symbologies from retail to logistics (Code 128, Code 39,
  EAN, UPC, ITF-14…) with helper and example per standard. It replaces
  "2D Barcode", whose existing projects are silently migrated
  (`builder-store.tsx`).
- **Normalized SVG vector rendering** in the square canvas: frame, mockups
  and the QR export pipeline are reused as-is, without duplication.
- **Dedicated Style panel**: bar color, background, geometry and text;
  "corners" and "logo" modules disabled (they would break scan reading);
  live preview that keeps the last valid render when a value is rejected,
  with an error message (`qr-artboard.tsx`, `module-style.tsx`).
- **.qcp archive**: the manifest embeds barcode styling (`barcode`);
  missing from earlier archives, the default is applied on import
  (`src/lib/qcp.ts`).

#### Native Event QR (iCalendar)
- **VEVENT encoding**: on scan, the phone offers to add to calendar —
  no more hosted page. Required start date, end date and time added
  (`src/lib/qr-payload.ts`, RFC 5545 escapes).
- **Import**: a VCALENDAR or VEVENT payload pre-fills the Event form
  (`src/lib/qr-import.ts`).

#### Native export under Tauri
- **System save dialog then disk write** for PNG, JPEG, WebP and SVG
  (new Rust command `save_export_file`, `src-tauri/src/export.rs`): the
  webview ignores `blob:` anchor downloads. Browser behavior is unchanged
  (`src/lib/qr-export.ts`).

#### Deepened HUD mode
- **"Anton" display typography** for titles under the HUD (`src/index.css`,
  inline latin-subset font `@fontsource/anton`): dialog, sheet, popover and
  card titles (`[data-slot="…-title"]`) as well as composite titles marked
  `.hud-heading` (header brand, scene mockup name).
- **Tactical texture in the preview area**: under the HUD, the transparency
  checkerboard (`surface-checker`) gives way to a grid texture with nodes
  and bright tags, saturated cells, rings and crosshairs — recreated with
  100% token CSS gradients (`background`, `foreground`, `primary`), so
  colors automatically follow the selected theme, and the checkerboard
  returns as soon as the HUD is off.
- **Additional futuristic details** (still scoped `html:not([data-hud="off"])`):
  fixed corner brackets at the four window corners (`body::after`),
  text selection tinted with the accent, square "terminal" tooltips in
  mono, field outline warming up on hover, accent hairline at the top of
  each card.

### Changed
- **App renamed "Eventages Lite"**: product name, window and tab titles,
  file filters and messages — the bundle identifier remains
  `com.protorians.eventages-lite`.
- **"Standalone page" types on hold**: vCard Plus, Contact, Linktree,
  Social, Menu, etc. are marked "Soon" — disabled in the gallery
  (grouped at the end of the list, dedicated badge) with an explanatory
  callout in the form; no more fake `local://` payload is simulated
  (`src/lib/qr-catalog.ts`, `src/lib/qr-payload.ts`).
- **Reorganized settings**: wider window, section rail on the left
  (appearance, interface, project, data) and content on the right
  (`settings-dialog.tsx`).
- **Streamlined workshop toolbar**: draft telemetry and mobile access
  only — save, export, theme and settings now live in the title bar
  (`app-header.tsx`).
- **CLI `qrs`**: page type encoding label updated ("publication
  upcoming", no more `local://`).
- Versions aligned to 0.6.0 (`package.json`, `tauri.conf.json`,
  `Cargo.toml`).

---

## [0.5.0] — 2026-10-19 · Settings, HUD art direction and linked file

### Added

#### App settings panel
- **New "Settings" dialog** (button in the top bar and mobile navigation,
  `settings-dialog.tsx`): appearance, interface effects and saving, with a
  reminder of the 100% local behavior.
- **Color themes**: on top of the default "Studio Gold", four named themes
  — Crimson, Cramoisy, Shalk, Violate — set via the `data-theme` attribute
  (`src/themes.css`), with light/dark preview and persisted selection.
- **Dismissible HUD mode**: ornaments (cut corners, brackets, scanlines,
  readouts) turn off with a single setting — `data-hud="off"` gives
  priority back to the original Tailwind utilities, without manual
  neutralizations.
- **Dismissible animations**: `data-anim="off"` freezes transitions and
  keyframes on the CSS side.
- **Preferences persisted locally** (`qrcode-studio:settings:v1`); the old
  theme key is migrated on first launch and `use-theme.ts` is removed in
  favor of the `use-settings.tsx` provider (light/dark mode, theme, HUD,
  animations, auto-save).

#### HUD art direction applied to the whole UI
- **shadcn control skinning** in `src/index.css` (scoped under
  `html:not([data-hud="off"])`, targeted by `[data-slot="…"]`): buttons,
  inputs, textarea, switch, tabs, select, slider, badge, toggle and
  home-made composites (`SegmentedControl`) adopt cut corners, mono
  uppercase type and inset keyboard focus — `src/components/ui/*` stays
  unchanged.
- **Reusable HUD primitives** (`hud.tsx`): `HudCorners`, `HudLabel`,
  `HudReadout`, `HudCross`, `HudStatusDot`.
- **Top bar styled like a control console**: energy line, telemetry
  (`SYS:LOCAL`, notched `PRG` gauge) and export highlighted; library,
  projects, scene and dock take on labels, numbering and activity marks.

#### Linked and automatic .qcp file saving
- **Linked file**: after a "Save As…", the project remembers its path —
  "Save" (⌘S) rewrites the `.qcp` directly, without a dialog
  (`builder-store.tsx`: `filePath`, `dirty`, `saveProject`).
- **Auto-save**: once the file is linked, every settled change (1.6 s)
  rewrites the `.qcp`; can be disabled in settings. Unlinked projects
  remain local drafts.
- **Keyboard shortcuts**: ⌘S saves, ⌘⇧S opens "Save As…", with visual
  feedback (status light, flash, error) in the top bar.
- **Library**: the panel shows the linked file and its state (auto-saved,
  pending, unlinked).
- Backend: `save_project` now returns the actual written path (`.qcp`
  extension enforced), used to link the file to the project.

### Changed
- `AGENTS.md`: new convention "HUD art direction: control skinning in
  index.css".
- Versions aligned to 0.5.0 (`package.json`, `tauri.conf.json`,
  `Cargo.toml`) — `tauri.conf.json` and `Cargo.toml` were still at 0.3.0.

---

## [0.4.0] — 2026-10-19 · Headless CLI (`qrs`)

### Added

#### Create, manage and compose projects from the command line
- **New headless CLI `qrs`** (`bun run cli <command>`): a path without UI,
  without opening the desktop app — useful for scripts, automation and
  batch processing (`cli/qrs.ts`).
- **Project commands**: `init`, `create`, `list`, `show`, `set`, `rename`
  (via `--rename`), `duplicate`, `delete`, `payload` — projects stored as
  JSON files in a workspace (`./studio` by default, overridable with
  `QRS_STUDIO_DIR` or `--dir`), same model and same defaults as the UI
  store (`cli/workspace.ts`, `builder-store.tsx`).
- **Shared catalog**: types, forms and validation come from the same
  modules as the app (`src/lib/qr-catalog.ts`, `qr-payload.ts`,
  `qr-design.ts`) — `qrs types [type]` documents fields, options and
  encoding.
- **Headless composition**: `qrs render <project>` writes the QR as
  **SVG** (still DOM-free) or **PNG** (rasterized via `@resvg/resvg-js`),
  with the same drawing as the app — module styles, corner markers,
  gradients, logo and frame composed identically (`cli/render.ts`).
- **Interoperability with the desktop app**: `qrs pack <project>` produces
  a `.qcp` archive (same structure as the Rust backend) and
  `qrs import <file.qcp>` rebuilds a complete project, media included,
  into the workspace.

#### Shared export utilities
- **`src/lib/qr-svg.ts`**: `wrapSvg`, `escapeXml` and `sanitizeFileName`
  move out of `qr-export.ts` into a 100% DOM-free module, reused by the
  CLI (identical frame composition and file names everywhere).

### Changed
- `package.json`: `cli` script, CLI dependencies (`qrcode`, `fflate`,
  `image-size`, `@resvg/resvg-js`, `@types/qrcode`); `tsconfig.json` now
  includes `cli/` in the typecheck.
- `.gitignore`: the default CLI workspace (`studio/`) is ignored.

---

## [0.3.0] — 2026-10-19 · .qcp export and web sharing

### Added

#### Export the project as .qcp from the Export tab
- **New export option**: the "Export project (.qcp)" button in the
  "Quick exports" section writes the full project archive — content,
  design, mockup, resolution and media files — through the same flow as
  the project manager, with a native dialog and enforced extension
  (`src/components/builder/module-export.tsx`).

### Changed

#### Sharing: Navigator.share on the web, option disabled otherwise
- **Web Share API**: on the web, the "Share" button goes through the
  browser share menu (`navigator.share`), after probing compatibility for
  file sharing (`navigator.canShare`) (`src/lib/qr-share.ts`).
- **Greyed-out button when unsupported**: in a browser without usable Web
  Share for files, the "Share" option is disabled with an explanatory
  message; under Tauri (desktop), the system native share remains
  unchanged and the `share_image` command is no longer invoked outside
  the shell.

---

## [0.2.0] — 2026-10-19 · Project files and import

### Added

#### .qcp project file format
- **New project format**: a zip archive generated by the Rust backend,
  containing a `manifest.json` (all settings: content per type, design,
  mockup, resolution) and an `assets/` folder with the project's media
  files (logo, visuals, PDF, audio…) (`src-tauri/src/qcp.rs`,
  `src/lib/qcp.ts`).
- **Saving** the active project as `.qcp` from the project manager
  (native dialog, enforced extension).
- **Opening** a `.qcp` file: the project is rebuilt and added to the
  local registry, media reloaded as data URLs — no model change.
- Native file dialogs via `tauri-plugin-dialog` (`dialog:default`
  permission), dedicated buttons in the project manager (side rail +
  mobile shortcuts).

#### Import an existing QR
- **Import of an existing QR**: offline native decoding of a QR from an
  image (PNG, JPEG, WebP, GIF, BMP, TIFF), an SVG vector file (rasterized
  by usvg/resvg) or a PDF (extraction of embedded images via lopdf, JPEG
  or raw samples, with DeviceGray/RGB/CMYK, Indexed, ICCBased handling and
  1-bit masks); payload and error correction level detection, with a
  negative retry for light QR codes on dark backgrounds
  (`src-tauri/src/import.rs`, `src/lib/qr-import.ts`).
- The imported content pre-fills the right project type: URL, Wi-Fi (with
  escapes), email (mailto), SMS (SMSTO/sms/tel), otherwise plain text;
  the detected correction level is carried over into the new project's
  design.

---

## [0.1.0] — 2026-10-19 · First release

Initial slice of the app: **100% local** custom QR creation, no account,
no server — Tauri desktop with native system sharing.

### Added

#### QR workshop
- **QR type catalog**: URL, Wi-Fi, vCard, SMS, email… with content forms
  validated field by field (`qr-catalog.ts`, spec 001).
- **Content**: direct encoding of static QR codes — the generated code
  encodes exactly the form, nothing else (`qr-payload.ts`, spec 002).
- **Visual customization**: colors, module styles, corner markers,
  patterns, logo/frame layers — non-destructive preview (`qr-design.ts`,
  `logo-presets.ts`, spec 004).
- **Preview & export**: continuous rendering (PNG/SVG via
  `qr-code-styling`), SVG / PNG / WebP export with margins, quality /
  readability margin control (`qr-analysis.ts`, `qr-export.ts`, spec 005).
- **Studio UI**: module dock (content · style · logo · frame · export),
  options panel, preview scene, "My QR codes" library, keyboard input,
  light/dark themes (`src/components/builder/`, spec 007).

#### Projects & library
- **Local project model** with a draft → published cycle, duplication and
  localStorage persistence (`builder-store.tsx`, spec 003).

#### Platform (Tauri)
- **Native sharing**: system share menu or revealing the exported file in
  the folder, depending on the platform (`share.rs` + `qr-share.ts`).
- Tauri 2 + React 19 + Vite + strict TypeScript scaffold.

### Documentation
- 10 product specs in SpecKit format (`docs/001-catalogue-types` →
  `docs/010-feedback-menu-rating`) + validation checklists.
- `AGENTS.md`: code conventions (lucide-react icons only, shadcn first,
  build commands).

### Planned (next slices)
- Bulk generation (spec 006), local statistics (spec 008), standalone HTML
  content pages (spec 009), feedback & menu rating (spec 010).

---

[0.1.1]: https://example.invalid/releases/v0.1.1
[0.11.0]: https://example.invalid/releases/v0.11.0
[0.10.0]: https://example.invalid/releases/v0.10.0
[0.9.0]: https://example.invalid/releases/v0.9.0
[0.8.0]: https://example.invalid/releases/v0.8.0
[0.7.0]: https://example.invalid/releases/v0.7.0
[0.6.0]: https://example.invalid/releases/v0.6.0
[0.5.0]: https://example.invalid/releases/v0.5.0
[0.4.0]: https://example.invalid/releases/v0.4.0
[0.3.0]: https://example.invalid/releases/v0.3.0
[0.2.0]: https://example.invalid/releases/v0.2.0
[0.1.0]: https://example.invalid/releases/v0.1.0
