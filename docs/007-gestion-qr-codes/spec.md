# Spécification de fonctionnalité : Page de gestion « Mes QR codes »

**ID fonctionnalité** : `007-gestion-qr-codes`
**Créée** : 2026-10-19
**Révisée** : 2026-10-19 — bascule 100 % local (aucun serveur, données stockées exclusivement sur l'appareil) ; la bibliothèque gère désormais des **projets** (brouillon/publié, cf. spec 003).
**Statut**: DRAFT
**Specs liées** : `003-projets-cycle-de-vie`, `005-apercu-telechargement`, `006-generation-en-masse`, `008-statistiques-locales`

## Scénarios utilisateurs & tests

### Histoire principale
**En tant que** utilisateur accumulant des QR codes,
**je veux** retrouver, organiser, retélécharger et administrer **mes projets** depuis une liste centralisée (dossiers, tags, notes, favoris, corbeille),
**afin de** gérer une flotte de codes sans perdre la trace des designs ni repartir de zéro lors de la modification — le tout avec des données conservées exclusivement en local.

#### Scénario de validation
- **Étant donné** ma bibliothèque locale contenant N projets
  **quand** j'ouvre « Mes QR codes »
  **alors** je vois une liste paginée/scrollable affichant aperçu image, nom, type, statut (brouillon/publié/corbeille), tags et date.

- **Étant donné** un lot de projets à regrouper
  **quand** je crée un dossier et y déplace des projets
  **alors** la vue dossiers reflète l'appartenance et le même projet n'appartient qu'à un seul dossier à la fois.

- **Étant donné** un projet que je veux retrouver rapidement
  **quand** je le marque comme favori ou lui ajoute un tag/note
  **alors** le filtre par favoris/tags met en avant l'élément recherché ; la note est modifiable à tout moment.

- **Étant donné** un projet publié (immuable, cf. spec 003)
  **quand** je sélectionne « Dupliquer »
  **alors** un nouveau projet est créé à partir du source (contenu + design identiques, nom suffixé « (copie) »), au statut brouillon, ouvert/modifiable indépendamment.

- **Étant donné** un projet supprimé (corbeille douce)
  **quand** je le restaure depuis la corbeille
  **alors** il revient fonctionnel avec design, contenu et statut d'origine conservés (batch-restore idem, cf. spec 006).

- **Étant donné** un besoin d'inventaire ou de sauvegarde
  **quand** j'exporte la liste ou la bibliothèque
  **alors** j'obtiens un CSV des projets de la sélection/vue courante, et la sauvegarde complète de la bibliothèque en archive locale.

### Flux secondaires
- Édition : seul un projet au statut brouillon est éditable (contenu + design) ; un projet publié est immuable et se modifie uniquement par duplication (cf. spec 003).
- Détail : une page de détail regroupe aperçu, contenu, design, statut, métriques locales résumées (cf. spec 008), actions (publier, télécharger les exports, dupliquer, supprimer).
- Recherche/filtres : recherche par nom, filtre par type, statut (brouillon/publié/corbeille), dossier, favori, tag.

## Requirements

### Exigences fonctionnelles

- **FR-1**: La liste « Mes QR codes » DOIT être paginée/scrollable et permettre la recherche par nom ainsi que le filtrage par type, statut (brouillon/publié/corbeille), dossier, favori et tag.
- **FR-2**: Chaque entrée DOIT afficher un aperçu miniature du code, son nom, son type, son statut (brouillon/publié) et sa date de création, et ouvrir la page de détail au clic.
- **FR-3**: La page de détail DOIT regrouper : aperçu image, contenu courant, design, statut du cycle de vie, métriques locales résumées (création, publications, duplications, exports → renvoi vers spec 008), et les actions principales.
- **FR-4**: Il DOIT être possible d'organiser les projets en **dossiers** (création, renommage, suppression de dossier, déplacement des projets dans/des dossiers).
- **FR-5**: Il DOIT être possible d'ajouter des **tags** et une **note interne** par projet, modifiables et exploitables en filtrage.
- **FR-6**: Un projet DOIT être marquable comme **favori**, avec un filtre rapide « favoris ».
- **FR-7**: Les actions par projet DOIVENT inclure : ouvrir, modifier si brouillon (contenu/design), publier (brouillon → publication, spec 003), retélécharger les exports, dupliquer (n'importe quel statut), supprimer (corbeille), restaurer, supprimer définitivement.
- **FR-8**: La suppression DOIT être **douce par défaut** (corbeille + restauration) et définitive uniquement sur confirmation explicite.
- **FR-9**: La duplication DOIT créer un **nouveau projet indépendant** (contenu et design identiques, nom suffixé « (copie) »), au statut brouillon, modifiable sans effet sur le source.
- **FR-10**: Un export CSV de la liste courante DOIT être possible (colonnes : nom, type, contenu encodé, statut, dates, tags).
- **FR-11**: Les mêmes actions DOIVENT être disponibles en sélection multiple (mini-batch intégré à la liste : voir spec 006 pour la mécanique).
- **FR-12**: L'historique de modification d'un projet DOIT être visible depuis le détail (contenu, design, changements de statut).
- **FR-13**: La bibliothèque DOIT être sauvegardable localement sous forme d'archive (export de tous les projets, designs et médias) et restaurable depuis cette archive ; aucune synchronisation distante n'existe.

### Entités clés

- **Projet (QrProject)** : QR (contenu encodé direct) + nom + type + statut de cycle de vie (brouillon/publié/corbeille, spec 003) + design + folder + tags + note + favorite + dates.
- **Folder** : conteneur nommé de projets, hiérarchie simple (1 niveau).
- **AuditTrail** : entrées datées de modifications (contenu, design, statut).

### Hypothèses

- La bibliothèque est **stockée localement sur l'appareil** (persistance de l'application, accessible hors-ligne) ; aucune authentification n'est requise pour y accéder, et rien n'est synchronisé.
- La synchronisation multi-appareils, quand elle existera, se fera par fichier de sauvegarde local (archive importée par l'utilisateur), sans serveur — elle relève d'une fonctionnalité distincte future.
- Sous-organisations/équipes : hors périmètre de cette spec (collaboration = feature distincte si besoin plus tard).

## Critères de succès

- Un utilisateur retrouve un projet parmi 1 000 en moins de 10 secondes (recherche/filtre).
- 100 % des projets supprimés par erreur sont récupérables depuis la corbeille (avant suppression définitive).
- La duplication d'un projet publié produit un brouillon indépendant fonctionnel en 1 clic.
- L'export CSV reflète exactement la vue courante (0 projet manquant, 0 projet en trop).
- 0 connexion réseau est émise par la gestion de bibliothèque ; la sauvegarde/restauration locale s'effectue hors ligne.

## Hors périmètre

- Comptes, rôles, facturation (hors périmètre produit : application open source, gratuite, sans compte et sans serveur).
- Cycle de vie des projets (spec 003) et statistiques détaillées (spec 008).
- Opérations bulk initiales (spec 006).
