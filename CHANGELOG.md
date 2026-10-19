# Changelog

Toutes les évolutions notables de **QR Code Studio** sont documentées ici.

Le format s'inspire de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et suit
le [versionnage sémantique](https://semver.org/lang/fr/) : à ce stade, l'application est
en `0.x` et le produit n'est pas encore promis stable.

---

## [0.5.0] — 2026-10-19 · Paramètres, D.A. HUD et fichier lié

### Ajouté

#### Panneau de paramètres de l'application
- **Nouvelle boîte de dialogue « Paramètres »** (bouton dans le bandeau
  supérieur et la navigation mobile, `settings-dialog.tsx`) : apparence, effets
  d'interface et enregistrement, avec rappel du fonctionnement 100 % local.
- **Thèmes de couleurs** : en plus du défaut « Or Studio », quatre thèmes
  nommés — Crimson, Cramoisy, Shalk, Violate — posés par l'attribut
  `data-theme` (`src/themes.css`), avec aperçu clair/sombre et sélection
  persistée.
- **Mode HUD désactivable** : les ornements (coins coupés, brackets,
  scanlines, readouts) se coupent d'un seul réglage — `data-hud="off"` rend la
  priorité aux utilitaires Tailwind d'origine, sans neutralisations manuelles.
- **Animations désactivables** : `data-anim="off"` fige transitions et
  keyframes côté CSS.
- **Préférences persistées localement** (`qrcode-studio:settings:v1`) ;
  l'ancienne clé de thème est migrée au premier lancement et `use-theme.ts`
  disparaît au profit du provider `use-settings.tsx` (mode clair/sombre,
  thème, HUD, animations, enregistrement auto).

#### D.A. HUD appliquée à toute l'interface
- **Habillage des contrôles shadcn** dans `src/index.css` (scopé sous
  `html:not([data-hud="off"])`, ciblé par `[data-slot="…"]`) : boutons,
  inputs, textarea, switch, tabs, select, slider, badge, toggle et composites
  maison (`SegmentedControl`) adoptent coins coupés, typo mono capitales et
  focus clavier reposé en intérieur — `src/components/ui/*` reste inchangé.
- **Primitives HUD réutilisables** (`hud.tsx`) : `HudCorners`, `HudLabel`,
  `HudReadout`, `HudCross`, `HudStatusDot`.
- **Bandeau supérieur façon console de contrôle** : ligne d'énergie, télémétrie
  (`SYS:LOCAL`, jauge `PRG` à crans) et export en surbrillance ; bibliothèque,
  projets, scène et dock reprennent labels, numérotations et marques
  d'activité.

#### Enregistrement lié et automatique du fichier .qcp
- **Fichier lié** : après un « Enregistrer sous… », le projet retient son
  chemin — « Enregistrer » (⌘S) réécrit directement le `.qcp`, sans boîte de
  dialogue (`builder-store.tsx` : `filePath`, `dirty`, `saveProject`).
- **Enregistrement automatique** : une fois le fichier lié, chaque
  modification stabilisée (1,6 s) réécrit le `.qcp` ; désactivable dans les
  paramètres. Les projets non liés restent des brouillons locaux.
- **Raccourcis clavier** : ⌘S enregistre, ⌘⇧S ouvre « Enregistrer sous… », avec
  retour visuel (voyant d'état, flash, erreur) dans le bandeau.
- **Bibliothèque** : le panneau affiche le fichier lié et son état
  (auto-enregistré, en attente, non lié).
- Backend : `save_project` renvoie désormais le chemin réel écrit (extension
  `.qcp` imposée), utilisé pour lier le fichier au projet.

### Modifié
- `AGENTS.md` : nouvelle convention « D.A. HUD : habillage des contrôles dans
  index.css ».
- Versions alignées sur 0.5.0 (`package.json`, `tauri.conf.json`,
  `Cargo.toml`) — `tauri.conf.json` et `Cargo.toml` étaient restés à 0.3.0.

---

## [0.4.0] — 2026-10-19 · CLI headless (`qrs`)

### Ajouté

#### Créer, gérer et composer des projets en ligne de commande
- **Nouveau CLI headless `qrs`** (`bun run cli <commande>`) : un parcours sans
  interface, sans ouvrir l'app desktop — utile pour les scripts, l'automatisation
  et les traitements en masse (`cli/qrs.ts`).
- **Commandes de projet** : `init`, `create`, `list`, `show`, `set`, `rename`
  (via `--rename`), `duplicate`, `delete`, `payload` — projets stockés comme
  fichiers JSON dans un espace de travail (`./studio` par défaut, substituable
  par `QRS_STUDIO_DIR` ou `--dir`), même modèle et mêmes défauts que le store de
  l'interface (`cli/workspace.ts`, `builder-store.tsx`).
- **Catalogue partagé** : les types, formulaires et validation viennent des
  mêmes modules que l'app (`src/lib/qr-catalog.ts`, `qr-payload.ts`,
  `qr-design.ts`) — `qrs types [type]` documente champs, options et encodage.
- **Composition headless** : `qrs render <projet>` écrit le QR en **SVG**
  (toujours sans DOM) ou **PNG** (rasterisation via `@resvg/resvg-js`), avec le
  même tracé que l'application — styles de modules, marqueurs de coin,
  dégradés, logo et cadre composés à l'identique (`cli/render.ts`).
- **Interchange avec l'app desktop** : `qrs pack <projet>` produit une archive
  `.qcp` (même structure que le backend Rust) et `qrs import <fichier.qcp>`
  reconstruit un projet complet, médias inclus, dans l'espace de travail.

#### Utilitaires d'export partagés
- **`src/lib/qr-svg.ts`** : `wrapSvg`, `escapeXml` et `sanitizeFileName`
  quittent `qr-export.ts` pour un module 100 % DOM-free, réutilisé par le CLI
  (composition de cadre et noms de fichiers identiques partout).

### Modifié
- `package.json` : script `cli`, dépendances CLI (`qrcode`, `fflate`,
  `image-size`, `@resvg/resvg-js`, `@types/qrcode`) ; `tsconfig.json` inclut
  désormais `cli/` au typecheck.
- `.gitignore` : l'espace de travail CLI par défaut (`studio/`) est ignoré.

---

## [0.3.0] — 2026-10-19 · Export .qcp et partage web

### Ajouté

#### Exporter le projet en .qcp depuis l'onglet Export
- **Nouvelle option d'export** : le bouton « Exporter le projet (.qcp) » dans la
  section « Exports rapides » écrit l'archive projet complète — contenu, design,
  mockup, résolution et fichiers média — via le même flux que le gestionnaire de
  projets, avec boîte de dialogue native et extension imposée
  (`src/components/builder/module-export.tsx`).

### Modifié

#### Partage : Navigator.share sur le web, option désactivée sinon
- **Web Share API** : sur le web, le bouton « Partager » passe par le menu de
  partage du navigateur (`navigator.share`), après sondage de la compatibilité
  pour le partage de fichiers (`navigator.canShare`) (`src/lib/qr-share.ts`).
- **Bouton grisé si non compatible** : dans un navigateur sans Web Share
  exploitable pour les fichiers, l'option « Partager » est désactivée avec un
  message explicatif ; sous Tauri (desktop), le partage natif du système reste
  inchangé et la commande `share_image` n'est plus invoquée hors du shell.

---

## [0.2.0] — 2026-10-19 · Fichiers projet et import

### Ajouté

#### Format de fichier projet .qcp
- **Nouveau format de projet** : une archive zip générée par le backend Rust, contenant
  un `manifest.json` (tous les paramètres : contenu par type, design, mockup,
  résolution) et un dossier `assets/` avec les fichiers média du projet (logo,
  visuels, PDF, audio…) (`src-tauri/src/qcp.rs`, `src/lib/qcp.ts`).
- **Enregistrement** du projet actif en `.qcp` depuis le gestionnaire de projets
  (boîte de dialogue native, extension imposée).
- **Ouverture** d'un fichier `.qcp` : le projet est reconstruit et ajouté au registre
  local, médias rechargés sous forme de data URLs — aucun changement de modèle.
- Boîtes de dialogue fichiers natives via `tauri-plugin-dialog` (permission
  `dialog:default`), boutons dédiés dans le gestionnaire de projets
  (rail latéral + raccourcis mobiles).

#### Importer un QR existant
- **Import d'un QR existant** : décodage natif hors ligne d'un QR depuis une image
  (PNG, JPEG, WebP, GIF, BMP, TIFF), un fichier vectoriel SVG (rasterisé par
  usvg/resvg) ou un PDF (extraction des images embarquées via lopdf, JPEG ou
  échantillons bruts, avec gestion DeviceGray/RGB/CMYK, Indexed, ICCBased et
  masques 1 bit) ; détection du payload et du niveau de correction d'erreur,
  avec réessai en négatif pour les QR clairs sur fond sombre
  (`src-tauri/src/import.rs`, `src/lib/qr-import.ts`).
- Le contenu importé pré-remplit le bon type de projet : URL, Wi-Fi (avec
  échappements), e-mail (mailto), SMS (SMSTO/sms/tel), sinon texte brut ;
  le niveau de correction détecté est repris dans le design du nouveau projet.

---

## [0.1.0] — 2026-10-19 · Première version

Tranche initiale de l'application : création de QR personnalisés **100 % locale**, sans
compte ni serveur — desktop Tauri avec partage système natif.

### Ajouté

#### Atelier QR
- **Catalogue des types de QR** : URL, Wi-Fi, vCard, SMS, e-mail… avec formulaires de
  contenu validés champ par champ (`qr-catalog.ts`, spec 001).
- **Contenu** : encodage direct des QR statiques — le généré encode exactement le
  formulaire, rien d'autre (`qr-payload.ts`, spec 002).
- **Personnalisation visuelle** : couleurs, styles de modules, marqueurs de coin,
  motifs, calques logo/cadre — aperçu non destructif (`qr-design.ts`, `logo-presets.ts`,
  spec 004).
- **Aperçu & export** : rendu continu (PNG/SVG via `qr-code-styling`), export
  SVG / PNG / WebP avec marges, contrôle de marge de qualité / lisibilité
  (`qr-analysis.ts`, `qr-export.ts`, spec 005).
- **Interface du studio** : dock de modules (contenu · style · logo · cadre · export),
  panneau d'options, scène d'aperçu, bibliothèque « Mes QR codes », entrées clavier,
  thèmes clair/sombre (`src/components/builder/`, spec 007).

#### Projets & bibliothèque
- **Modèle de projets locales** avec cycle brouillon → publié, duplication et
  persistance localStorage (`builder-store.tsx`, spec 003).

#### Plateforme (Tauri)
- **Partage natif** : menu de partage système ou révélation du fichier exporté dans
  le dossier, selon la plateforme (`share.rs` + `qr-share.ts`).
- Scaffold Tauri 2 + React 19 + Vite + TypeScript strict.

### Documentation
- 10 specs produit au format SpecKit (`docs/001-catalogue-types` →
  `docs/010-feedback-menu-rating`) + checklists de validation.
- `AGENTS.md` : conventions de code (icônes lucide-react uniquement, shadcn first,
  commands de build).

### Prévu (tranches suivantes)
- Génération en masse (spec 006), statistiques locales (spec 008), pages de contenu
  HTML autonomes (spec 009), feedback & menu rating (spec 010).

---

[0.5.0]: https://example.invalid/releases/v0.5.0
[0.4.0]: https://example.invalid/releases/v0.4.0
[0.3.0]: https://example.invalid/releases/v0.3.0
[0.2.0]: https://example.invalid/releases/v0.2.0
[0.1.0]: https://example.invalid/releases/v0.1.0
