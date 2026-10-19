# Spécification de fonctionnalité : Statistiques locales de l'application

**ID fonctionnalité** : `008-statistiques-locales`
**Créée** : 2026-10-19
**Révisée** : 2026-10-19 — bascule 100 % local : le suivi de scans ne peut s'effectuer sans service en ligne (un scan de QR imprimé est par définition invisible hors ligne) ; la spec couvre désormais les statistiques locales d'utilisation de l'application. Le suivi de scans est déclaré hors périmètre.
**Statut**: DRAFT
**Specs liées** : `003-projets-cycle-de-vie`, `007-gestion-qr-codes`, `009-pages-de-contenu`, `010-feedback-menu-rating`

## Scénarios utilisateurs & tests

### Histoire principale
**En tant que** utilisateur régulier de QR Code Studio,
**je veux** voir l'activité de mon atelier : projets créés, brouillons en cours, publications, duplications, exports de fichiers, lots de création en masse, réponses d'avis importées,
**afin de** suivre mon usage, retrouver mes périodes d'activité, mesurer le volume de codes produits et de repartir là où j'en étais — sans que la moindre donnée ne quitte l'appareil.

#### Scénario de validation
- **Étant donné** plusieurs semaines d'utilisation (créations, publications, duplications, exports)
  **quand** j'ouvre la page « Statistiques »
  **alors** je vois un résumé : nombre de projets (brouillons/publicés), publications, duplications, exports de fichiers, lots bulk — avec la possibilité de filtrer par période.

- **Étant donné** un besoin de comparaison temporelle
  **quand** je consulte la vue analyse
  **alors** une série temporelle de l'activité (par jour/semaine/mois) s'affiche ; je peux filtrer par période, type de QR, dossier, tag.

- **Étant donné** un besoin de reporting
  **quand** j'exporte les statistiques
  **alors** j'obtiens les données du périmètre filtré aux formats xls, xlsx, csv et json, générés et enregistrés en local.

- **Étant donné** des réponses d'avis importées (spec 010)
  **quand** je consulte la vue analyse
  **alors** le volume de réponses importées par page/projet figure dans le résumé global.

### Flux secondaires
- Les statistiques agrègent des événements locaux de l'application (création, publication, duplication, export, import, suppression) ; elles ne portent jamais sur les scans des QR imprimés.
- Toutes les données statistiques sont calculées, stockées et exportées en local ; aucune donnée ne quitte l'appareil, aucune télémétrie n'existe.
- L'utilisateur peut désactiver la collecte des statistiques locales dans les préférences ; l'application fonctionne alors sans journal d'usage.

## Requirements

### Exigences fonctionnelles

- **FR-1**: Le système DOIT enregistrer localement des événements d'utilisation : création de projet, publication, duplication, suppression/restore, export de fichier, job bulk, import de réponses d'avis — chacun avec horodatage et référence du projet concerné.
- **FR-2**: La vue statistiques DOIT présenter : résumé global (projets par statut, publications, duplications, exports), série temporelle filtrable par période (jour/semaine/mois), répartition par type et par dossier.
- **FR-3**: Une vue d'inventaire DOIT permettre la comparaison des projets entre eux (créés, publiés, dupliqués, exportés) avec filtres : période, type, dossier, tag.
- **FR-4**: Les données statistiques DOIVENT être exportables en xls, xlsx, csv et json sur le périmètre filtré, l'export étant produit localement et écrit dans le dossier choisi par l'utilisateur.
- **FR-5**: La collecte statistique DOIT pouvoir être désactivée (préférences globales, sans effet sur les autres fonctionnalités).
- **FR-6**: Aucune donnée statistique NE DOIT être transmise : 0 télémétrie, 0 appel réseau, 0 métrique distante ; le volume de données conservé est plafonné localement (paramétrable) avec purge automatique au-delà du plafond.
- **FR-7**: Les statistiques NE DOIVENT PAS contenir de données personnelles du contenu des QR (aucune capture des contenus, adresses ou mots de passe saisis ; seules des références d'événements anonymes et datés).
- **FR-8**: La page stats DOIT rester lisible à haute volumétrie (agrégations par jour/semaine/mois au-delà d'un seuil).
- **FR-9**: Il DOIT être explicitement indiqué dans l'interface que les scans des QR imprimés ne sont pas observables depuis l'app (impossible sans service en ligne) — le suivi de scans est hors périmètre produit.

### Entités clés

- **UsageEvent** : type d'événement (create | publish | duplicate | delete | restore | export | bulkJob | feedbackImport) + horodatage + référence projet/lot.
- **UsageAggregate** : agrégats par période / type / dossier.
- **UsageSettings** : activation, plafond de rétention, purge.

### Hypothèses

- Les statistiques documentent l'usage de l'atelier (l'application), pas l'audience des QR imprimés : cette frontière est assumée et expliquée à l'utilisateur.
- Pour un suivi d'audience réel, l'utilisateur peut ajouter l'outil d'analytics de son choix **sur son propre hébergement** des pages autonomes (spec 009) ; l'application n'y contribue pas et ne s'y connecte pas.
- Le plafond de rétention par défaut est de l'ordre de quelques mois d'événements ; la valeur exacte sera figée au plan technique.

## Critères de succès

- Un événement (publication, export…) apparaît dans la vue statistiques en moins de 2 secondes.
- 100 % de l'application reste fonctionnelle avec la collecte statistique désactivée (0 régression).
- 0 octet transmis vers l'extérieur par le module statistiques (0 requête réseau émise, vérifiable hors ligne).
- Un export stats de 30 jours s'achève en moins de 30 secondes.

## Hors périmètre

- Suivi des scans des QR imprimés, audience, géolocalisation des scans (impossible 100 % local ; nécessiterait un service en ligne — exclu du périmètre produit).
- Données des formulaires d'avis (import et agrégation : spec 010 ; les volumes importés apparaissent ici à titre d'inventaire).
- Gestion de l'inventaire des projets (spec 007).
