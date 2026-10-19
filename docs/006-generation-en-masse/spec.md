# Spécification de fonctionnalité : Génération en masse (bulk)

**ID fonctionnalité** : `006-generation-en-masse`
**Créée** : 2026-10-19
**Révisée** : 2026-10-19 — bascule 100 % local (aucun serveur) ; les opérations par lot s'appliquent désormais aux **projets** (publication, duplication, suppression, cf. spec 003) et non plus aux cycles stop/resume des QR dynamiques.
**Statut**: DRAFT
**Specs liées** : `003-projets-cycle-de-vie`, `004-personnalisation-visuelle`, `007-gestion-qr-codes`

## Scénarios utilisateurs & tests

### Histoire principale
**En tant que** entreprise / agence devant produire beaucoup de codes à la fois,
**je veux** téléverser un CSV décrivant une liste de QR codes (une ligne = un QR) et lancer leur création en une seule opération,
**afin de** éviter la saisie manuelle répétée et récupérer toutes les images, prêtes à imprimer.

#### Scénario de validation
- **Étant donné** un fichier CSV valide (une ligne par QR, colonnes correspondant au type choisi : nom, contenu, choix de design…)
  **quand** je le téléverse dans la page « Génération en masse »
  **alors** le système vérifie le fichier, liste les QR à créer, et permet de lancer la création en un clic.

- **Étant donné** un CSV contenant des lignes invalides (URL non conforme, champ obligatoire manquant)
  **quand** la pré-vérification s'exécute
  **alors** les lignes en erreur sont signalées ligne par ligne, les lignes valides restent créables (rejet de la création totale seulement si l'utilisateur valide ; sinon création partielle des lignes correctes).

- **Étant donné** une création bulk réussie
  **quand** le traitement s'achève
  **alors** les projets apparaissent dans la page « Mes QR codes » (groupe) et le téléchargement groupé (ZIP) est disponible.

- **Étant donné** un lot de projets
  **quand** j'applique une opération de cycle de vie à la sélection du lot
  **alors** l'opération s'applique à tous les projets choisis en une action : batch-publish (publication de plusieurs brouillons), batch-duplicate, batch-soft-delete, batch-restore, batch-hard-delete.

### Flux secondaires
- Un modèle (template) de CSV peut être téléchargé pour préparer les données correctement.
- Un export CSV de l'inventaire des QR créés en masse est possible.

## Requirements

### Exigences fonctionnelles

- **FR-1**: Le système DOIT offrir une page dédiée « Bulk QR Code Generator » (route dédiée au dashboard).
- **FR-2**: L'utilisateur DOIT pouvoir téléverser un CSV ; le système DOIT accepter/détecter les colonnes par type et fournir un modèle téléchargeable.
- **FR-3**: Un CSV doit produire une création **unitaire de N projets** avec le même type de QR, chacun avec nom, contenu et design (optionnels) définis par ligne.
- **FR-4**: Le prétraitement DOIT valider chaque ligne et lister les erreurs ligne par ligne (numéro de ligne + raison), sans impacter les lignes valides.
- **FR-5**: La création en masse DOIT être traçable : un historique de lot ( fichier, nombre de lignes, résultat ) doit être visible, avec état d'avancement pendant le traitement.
- **FR-6**: Les opérations par lot DOIVENT inclure les actions du cycle de vie des projets (spec 003) : publication de masse, duplication en lot, suppression douce, restauration, suppression définitive (batch-publish, batch-duplicate, batch-soft-delete, batch-restore, batch-hard-delete).
- **FR-7**: Le téléchargement du lot DOIT être en ZIP contenant tous les fichiers (formats de la spec 005), avec noms explicites.
- **FR-8**: Un export CSV de l'inventaire de QR créés DOIT être possible (lignes = QR, avec métadonnées).
- **FR-9**: Les limitations techniques (plafond du nombre de lignes par lot, réglable dans les préférences de l'app) DOIVENT être affichées avant l'upload, avec contrôle au moment de la validation.
- **FR-10**: Une opération par lot partiellement échouée DOIT signaler ce qui a réussi/échoué sans renommer les projets déjà créés (idempotence sur relance).

### Entités clés

- **BulkJob** : fichier source (nom, nombre de lignes), type de QR, options de design, date, résultat (projets créés / échecs), statut d'avancement.
- **Projet (QrProject, spec 003)** : chaque ligne créée donne un projet (statut brouillon par défaut, publication possible en lot) ; ensemble de projets issus d'un lot, opérations groupées possibles.

### Hypothèses

- Le CSV est le format d'échange standard du bulk ; les autres formats (xlsx éventuel) restent secondaires, pas critiques.
- La création en masse s'exécute **entièrement en local** (aucun appel réseau, chaque ligne validée puis persistée localement) ; le nombre maximal de lignes par lot est un réglage de l'application avec valeur par défaut raisonnable (par ex. 1000) — limité par l'appareil, jamais par une offre.

## Critères de succès

- Un lot de 500 lignes valides est créé en moins de 2 minutes, avec un avancement visible en continu — hors ligne (0 requête réseau).
- Le taux de faux positifs de validation CSV (ligne valide signalée erreur) est inférieur à 1 %.
- 100 % des projets d'un lot sont gérés depuis l'écran bulk (retour, retéléchargement ZIP, opérations groupées).
- Les opérations groupées (publish/duplicate/suppression douce/restore/hard delete) s'appliquent à 100 % des éléments sélectionnés, orphelins impossibles.

## Hors périmètre

- La saisie unitaire (spec 001) et la gestion d'inventaire à long terme (spec 007).
- Analytics des QR bulk (spec 008).
