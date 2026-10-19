# Specs Produit · QR Code Studio

Spécifications des fonctionnalités de création de QR codes, générées selon la
structure **SpecKit** (`spec.md` + `checklists/requirements.md` par fonctionnalité).

> Note : la skill `speckit-specify` crée en principe une seule fonctionnalité par
> invocation. Le présent lot traite l'ensemble des fonctionnalités de création en
> une passe, en suivant intégralement la structure du template SpecKit
> (User Scenarios, Functional Requirements, Success Criteria, Key Entities,
> Assumptions). Aucun marqueur `[NEEDS CLARIFICATION]` n'a été laissé : les choix
> ambigus sont documentés dans la section « Hypothèses » de chaque spec.

---

## Positionnement produit

**QR Code Studio** est une application **desktop et mobile, open source et
gratuite**, fonctionnant **entièrement en local** et **sans compte utilisateur** :

| Principe | Conséquence produit |
| --- | --- |
| 100 % local | **Aucun serveur d'API n'est contacté** : toutes les générations (QR, pages, exports) et tous les traitements s'exécutent sur l'appareil. L'application fonctionne intégralement hors ligne. |
| Données locales | Toutes les données (projets, brouillons, designs, contenus, médias, statistiques, réponses importées) sont **conservées en local** sur l'appareil ; aucune synchronisation cloud, aucune télémétrie. |
| Sans compte | Aucune inscription, aucune authentification, aucun profil utilisateur ; la bibliothèque de projets est stockée localement sur l'appareil. |
| Gratuit | Aucun paywall, aucun plafond lié à une offre, aucune période d'essai, aucun upgrade. |
| Open source | Développement transparent, déploiement local ; rien à héberger, rien à configurer côté serveur. |
| Vie privée | Les données des QR ne quittent jamais l'appareil, sauf choix explicite de l'utilisateur (diffusion de ses propres fichiers). |

## Modèle par projets

Toute création de code s'effectue dans un **projet** (spec 003) :

- **Brouillon** — modifiable à tout moment (contenu, design, nom), persisté en local, jamais expiré ;
- **Publié** — état **imuable** : le contenu encodé et le design sont figés définitivement ; les exports sont produits depuis cet état ;
- **Duplication** — création d'un nouveau projet à partir d'un brouillon ou d'un projet publié (copie indépendante qui redevient modifiable) ; c'est le seul chemin de modification d'un projet publié.

Conséquence assumée : sans serveur, un QR imprimé ne peut être repointé après publication — la mise à jour passe par dupliquer → publier → réimprimer.

Les pages de contenu riches (Menu, PDF, Landing…) et les formulaires d'avis sont
générés en **fichiers HTML autonomes** (spec 009/010) que l'utilisateur diffuse ou
héberge à sa discrétion ; l'application n'interagit jamais avec ces canaux. Les
statistiques couvrent l'usage local de l'atelier (spec 008) : les scans des QR
imprimés sont, par définition, invisibles hors ligne.

---

## Liste des specs

| # | Dossier | Spec |
| --- | --- | --- |
| 001 | `001-catalogue-types` | Catalogue des types de QR & formulaires de contenu |
| 002 | `002-qr-statiques` | QR codes à encodage direct (statiques) |
| 003 | `003-projets-cycle-de-vie` | Projets de QR : brouillon → publié, duplication |
| 004 | `004-personnalisation-visuelle` | Personnalisation visuelle du QR |
| 005 | `005-apercu-telechargement` | Aperçu, test et téléchargement |
| 006 | `006-generation-en-masse` | Génération en masse (bulk) |
| 007 | `007-gestion-qr-codes` | Page de gestion « Mes QR codes » |
| 008 | `008-statistiques-locales` | Statistiques locales de l'application |
| 009 | `009-pages-de-contenu` | Pages de contenu autonomes (fichier HTML exporté) |
| 010 | `010-feedback-menu-rating` | Feedback & menu rating (collecte locale) |

Chaque dossier contient `spec.md` et `checklists/requirements.md`.

**Ordre de lecture suggéré** : 001 → 002/003 → 004 → 005 → 006/007 → 008/009/010.

État : tous les specs ont été révisés le 2026-10-19 pour la bascule **100 % local**
(aucun serveur, données locales, modèle par projets) et auto-validés contre leur
checklist qualité. Prochaine étape recommandée : `/speckit-clarify` (si disponible)
pour arbitrer les hypothèses résiduelles, puis `/speckit-plan`.
