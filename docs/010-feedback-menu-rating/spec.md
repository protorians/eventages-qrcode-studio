# Spécification de fonctionnalité : Feedback & évaluation de menu (menu rating) — 100 % local

**ID fonctionnalité** : `010-feedback-menu-rating`
**Créée** : 2026-10-19
**Révisée** : 2026-10-19 — bascule 100 % local : les formulaires d'avis ne sont plus hébergés (aucun serveur d'API, aucune API distante). Le formulaire est **généré localement en fichier HTML autonome** ; la collecte des réponses repose sur un canal local (e-mail via `mailto:` à l'adresse du propriétaire) et l'agrégation se fait par **import local de fichier de réponses** dans l'application.
**Statut**: DRAFT
**Specs liées** : `009-pages-de-contenu`, `008-statistiques-locales`, `003-projets-cycle-de-vie`

## Scénarios utilisateurs & tests

### Histoire principale
**En tant que** restaurateur / entreprise collectant des avis,
**je veux** générer un formulaire de satisfaction (évaluations de menu et d'articles) sous forme de page autonome que je diffuse avec un QR, recevoir les réponses par un canal simple (mail prérempli) et les importer dans l'application pour agréger les notes localement,
**afin de** suivre la satisfaction et identifier les points faibles, sans intermédiaire ni service en ligne.

#### Scénario de validation
- **Étant donné** un projet de type Feedback, au moment de la publication (spec 003)
  **quand** j'édite le formulaire (notes 1–5 étoiles, appréciations, commentaires) et publie
  **alors** un fichier HTML autonome est généré (cf. spec 009) : le client qui le scanne (ou l'ouvre) voit le formulaire mobile-first, sans compte, hors ligne.

- **Étant donné** un client qui a rempli le formulaire (note + commentaire)
  **quand** il valide
  **alors** un e-mail récapitulatif est prérempli (destinataire = adresse de contact du propriétaire, corps = réponses structurées) et s'envoie via l'app mail du téléphone ; aucun serveur de collecte n'intervient.

- **Étant donné** des réponses reçues par e-mail (ou exportées par un canal de l'utilisateur)
  **quand** j'importe le fichier de réponses (CSV ou JSON) dans l'application
  **alors** les réponses sont stockées en local, rattachées au bon projet Feedback, et visibles dans les résultats.

- **Étant donné** un QR de type Menu
  **quand** le client note un article précis du menu
  **alors** la note de l'article s'agrège aux statistiques du menu côté propriétaire après import.

- **Étant donné** un propriétaire
  **quand** je consulte les résultats du menu-rating
  **alors** je vois : moyenne globale du menu, tendance, répartition des notes, répartition des commentaires, classement des articles (mieux/moins bien notés) — données 100 % locales.

- **Étant donné** un article retiré du marché
  **quand** le propriétaire réinitialise la note d'un produit ou de l'ensemble du menu
  **alors** les notes correspondantes sont effacées ou repartent de zéro, l'historique importé n'est plus comptabilisé.

### Flux secondaires
- Le feedback est **anonyme par défaut** : le client n'indique jamais son identité ; seul l'expédition du mail est visible (adresse d'expéditeur libre).
- Le formulaire est fortement adapté au mobile (étoiles en un tap, commentaire optionnel) et fonctionne hors ligne : si l'envoi de l'e-mail échoue, le client peut copier le résumé de ses réponses.
- Le fichier de page (spec 009) est généré à la publication du projet ; sa mise à jour passe par duplication → nouvelle publication → nouvelle génération.
- Le filtrage anti-spam s'applique **à l'import** (filtrage léger des soumissions manifestement abusives).

## Requirements

### Exigences fonctionnelles

- **FR-1**: Le type Feedback DOIT permettre de construire localement un formulaire de retour (questions de satisfaction, notes de 1 à 5, texte libre) et de le générer en page autonome (cf. spec 009) à la publication.
- **FR-2**: La soumission du formulaire DOIT se faire par **e-mail prérempli** (lien `mailto:` avec destinataire configuré par le propriétaire et corps structuré de la réponse) ; aucun serveur de collecte n'intervient dans la soumission.
- **FR-3**: Le système DOIT importer localement des fichiers de réponses (CSV ou JSON, modèle d'export téléchargeable depuis l'app) et les rattacher automatiquement au projet Feedback correspondant.
- **FR-4**: Chaque réponse importée DOIT être conservée localement avec horodatage et méta-données de formulaire ; aucune identité du client n'est collectée.
- **FR-5**: Pour les Menus, le système DOIT permettre l'évaluation item par item (note par article) en plus de la note globale du menu.
- **FR-6**: Le tableau de bord du propriétaire DOIT présenter : moyenne globale, répartition des notes, évolution dans le temps, commentaires récents, classement des articles (données locales uniquement).
- **FR-7**: Le propriétaire DOIT pouvoir réinitialiser les évaluations d'un article précis ou de tout le menu, avec confirmation et sans impacter les autres projets.
- **FR-8**: Le formulaire autonome DOIT être utilisable en moins de 20 secondes (note + envoi) : état d'envoi explicite, remerciement à la fin, et copie de secours des réponses si l'e-mail ne s'ouvre pas.
- **FR-9**: L'import DOIT filtrer localement les soumissions manifestement abusives (doublons successifs, contenu hors charte) : filtrage léger configurable, sans bloquer les avis légitimes.
- **FR-10**: Les réponses importées DOIVENT être exportables (CSV/JSON — aligné avec l'export des statistiques locales, spec 008).
- **FR-11**: La page publique (formulaire autonome) NE DOIT PAS afficher les données de réponses ; la publication de moyennes (étoiles publiques) est optionnelle et se fait uniquement via regénération de la page (duplication + publication, spec 003).
- **FR-12**: Aucune opération de cette spec NE DOIT contacter un serveur : la collecte ne s'appuie que sur le client mail de l'utilisateur final et sur les fichiers importés par le propriétaire.

### Entités clés

- **FeedbackForm** : configuration des questions du formulaire (étoiles, choix, texte) + adresse de contact du propriétaire, liée au projet Feedback.
- **FeedbackResponse** : réponses importées (notes, commentaire, horodatage, méta du formulaire) stockées en local.
- **MenuRating** : agrégats par article et par menu, tendances, statut « reset » par article/menu.

### Hypothèses

- Le canal `mailto:` est le canal de collecte minimal assumé, avec transparence : une collecte centralisée en temps réel exigerait un serveur, exclu du périmètre ; pour un volume important, l'utilisateur peut fournir son propre canal (ex. e-mail dédié) — l'application n'est jamais connectée à ces canaux.
- La modération se limite à un filtrage léger à l'import (doublons, mots interdits / spam manifeste) ; la curation humaine relève d'un processus manuel côté propriétaire.
- Le modèle CSV/JSON d'import est stable et documenté dans le modèle téléchargeable.

## Critères de succès

- Le formulaire autonome est généré à la publication et utilisable hors ligne pour 100 % des projets Feedback.
- Un client peut remplir et envoyer la réponse (note + commentaire) en moins de 20 secondes sur mobile.
- 100 % des réponses importées sont rattachées au bon projet (0 perte, 0 doublon créé par un import répété du même fichier, idempotence).
- Le reset d'un article/menu n'impacte pas les données d'autres projets (0 effet de bord).
- Aucune opération ne génère de requête réseau (vérification hors ligne complète).

## Hors périmètre

- Collecte centralisée en ligne des réponses (nécessiterait un serveur — exclu).
- Notifications push / e-mails automatiques de nouveaux avis (feature séparée, côté utilisateur).
- Campagnes d'e-mails de relance et enquêtes multi-questions longues.
- Modération humaine avancée.
