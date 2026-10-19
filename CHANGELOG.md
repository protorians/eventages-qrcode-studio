# Changelog

Toutes les évolutions notables de **QR Code Studio** sont documentées ici.

Le format s'inspire de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et suit
le [versionnage sémantique](https://semver.org/lang/fr/) : à ce stade, l'application est
en `0.x` et le produit n'est pas encore promis stable.

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

[0.3.0]: https://example.invalid/releases/v0.3.0
[0.2.0]: https://example.invalid/releases/v0.2.0
[0.1.0]: https://example.invalid/releases/v0.1.0
