# Changelog

Toutes les évolutions notables de **QR Code Studio** sont documentées ici.

Le format s'inspire de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et suit
le [versionnage sémantique](https://semver.org/lang/fr/) : à ce stade, l'application est
en `0.x` et le produit n'est pas encore promis stable.

---

## [Non publié]

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

[0.1.0]: https://example.invalid/releases/v0.1.0
