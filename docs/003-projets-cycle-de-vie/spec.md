# Spécification de fonctionnalité : Projets de QR & cycle de vie (brouillon, publication, duplication)

**ID fonctionnalité** : `003-projets-cycle-de-vie`
**Créée** : 2026-10-19
**Révisée** : 2026-10-19 — bascule 100 % local (aucun serveur, aucune API distante) ; le modèle « dynamique via redirection serveur » est remplacé par le modèle **projet** : brouillon éditable, publication immuable, duplication.
**Statut**: DRAFT
**Specs liées** : `001-catalogue-types`, `002-qr-statiques`, `007-gestion-qr-codes`, `009-pages-de-contenu`

## Scénarios utilisateurs & tests

### Histoire principale
**En tant que** créateur de QR codes,
**je veux** que chaque création s'effectue dans un **projet** : un brouillon que je peux modifier à tout moment, que je publie quand il est satisfaisant (état figé et immuable, prêt à imprimer), et que je peux dupliquer pour repartir de l'existant sans le détruire,
**afin de** itérer sereinement sur mes codes et conserver une trace figée de ce qui a été distribué, le tout sans aucune infrastructure en ligne.

#### Scénario de validation
- **Étant donné** un type de QR choisi dans la galerie (spec 001)
  **quand** je commence une création
  **alors** un nouveau **projet** (statut « brouillon ») est ouvert automatiquement : contenu, design et nom sont persistés localement et restent modifiables à tout moment, même après fermeture de l'application.

- **Étant donné** un brouillon complet et testé
  **quand** je clique sur « Publier »
  **alors** le contenu encodé et le design sont **figés définitivement** : le projet passe au statut « publié », l'état figé (empreinte du contenu encodé + design) est conservé en local, et les exports définitifs (spec 005) sont générés depuis cet état.

- **Étant donné** un projet publié
  **quand** je tente de modifier son contenu encodé ou son design
  **alors** la modification est refusée avec une explication claire (« un projet publié est immuable ») et le système me propose deux actions : **dupliquer** le projet (nouveau brouillon modifiable) ou conserver tel quel.

- **Étant donné** un projet brouillon ou publié
  **quand** j'exécute « Dupliquer »
  **alors** un **nouveau projet indépendant** est créé (statut brouillon, copie conforme du contenu et du design, nom suffixé « (copie) »), entièrement modifiable, sans lien réversible avec le projet source.

- **Étant donné** un projet supprimé (corbeille)
  **quand** je le restaure
  **alors** il réapparaît avec son statut, son design et son contenu intégraux (brouillon à nouveau modifiable ou publié figé, selon son état d'origine).

### Flux secondaires
- Le passage brouillon → publié est irréversible ; un projet publié peut être mis à la corbeille, mais jamais « dépublié ».
- La modification après publication passe toujours par la duplication (fork) : l'utilisateur modifie la copie, republie puis réimprime — c'est le pendant, 100 % local, de l'« édition après impression » des anciens QR dynamiques, assumé explicitement dans la spec.
- Pour les types à contenu riche (Menu, PDF, Landing Page…), la publication génère en plus le fichier de page autonome (spec 009) ; le contenu encodé du QR est fixé au moment de la publication.
- Conversion de statut impossible : un brouillon peut être publié, un publié ne redescend jamais en brouillon (la duplication est le seul chemin de retour à l'édition).
- Un brouillon peut rester indéfiniment à l'état de brouillon (aucune expiration, aucune auto-publication).

## Requirements

### Exigences fonctionnelles

- **FR-1**: Toute création de QR DOIT s'effectuer dans un **projet** persisté localement, regroupant type, contenu, design, nom et métadonnées d'organisation (spec 007).
- **FR-2**: Un projet DOIT exister dans l'un des statuts suivants : `brouillon`, `publié`, `corbeille` ; le statut brouillon DOIT être éditable à tout moment (contenu, design, nom), y compris après fermeture et relance de l'application.
- **FR-3**: La **publication** DOIT figer définitivement le contenu encodé et le design : un projet publié est **imuable** (aucune modification du contenu encodé, du design, du type). L'état figé DOIT être conservé localement afin de reproduire exactement les exports.
- **FR-4**: Toute tentative de modification d'un projet publié DOIT être refusée et remplacée par l'offre de **duplication** (nouveau brouillon) avec message explicatif.
- **FR-5**: La **duplication** DOIT créer un nouveau projet indépendant (statut brouillon), copie conforme du contenu et du design du projet source (brouillon ou publié), avec nom suffixé « (copie) » et sans lien réversible après coup (la source reste traçable, non modifiée).
- **FR-6**: Le projet DOIT être opérationnel en mode **déconnecté permanent** : aucune opération de cette spec (création, édition de brouillon, publication, duplication, corbeille) NE DOIT exiger une connexion réseau ni contacter un serveur, quel qu'il soit.
- **FR-7**: Chaque projet DOIT être supprimable en douce (corbeille + restauration) et définitivement uniquement sur confirmation explicite.
- **FR-8**: Le changement de type est possible tant que le projet est au statut brouillon ; une fois publié, le type est figé (cohérent avec la spec 001).
- **FR-9**: La publication DOIT consigner localement : date de publication, empreinte du contenu encodé, design figé — afin de garantir la reproductibilité des codes distribués.
- **FR-10**: Les opérations de cycle de vie DOIVENT être disponibles sur les lots (cf. spec 006) : publication de masse (multi-brouillons), duplication en lot, suppression douce/restore/dur en lot.

### Entités clés

- **Projet** : type + contenu + design + nom + statut (`draft | published | softDeleted`) + folder + tags + note + dates (création, modification, publication).
- **Snapshot publié** : empreinte du contenu encodé + design figé + date de publication (état immuable conservé localement, base des exports).

### Hypothèses

- L'« immuabilité » est celle de la donnée locale : l'état publié ne peut être altéré par aucun flux de l'application (ni même par une restauration de corbeille) ; une corruption disque est hors de portée de la spécification.
- La limite de « modifier après impression » est assumée : sans serveur, un QR imprimé ne peut être repointé ; le flux dupliquer → publier → réimprimer est le seul chemin de mise à jour, clairement annoncé à l'utilisateur.
- Les métadonnées et l'empreinte du Snapshot publié sont locales et ne sont jamais transmises.

## Critères de succès

- 100 % des projets restent intégralement éditables au statut brouillon, y compris après redémarrage de l'application (test : édition hors ligne, fermeture, réouverture, édition).
- 0 projet publié modifiable (tentatives de modification bloquées à 100 %, message de duplication proposé).
- Une duplication produit un brouillon indépendant et fonctionnel en 1 clic, strictement identique à la source (contenu + design) au moment de la duplication.
- Toutes les opérations de cette spec s'exécutent hors ligne (test avion/éther : 0 requête réseau émise).

## Hors périmètre

- Formulaires de contenu par type (spec 001) et encodage statique (spec 002).
- Organisation de la bibliothèque : dossiers, tags, favoris (spec 007).
- Fabrication des pages autonomes (spec 009) et statistiques locales (spec 008).
