# Spécification de fonctionnalité : Catalogue des types de QR & formulaires de contenu

**ID fonctionnalité** : `001-catalogue-types`
**Créée** : 2026-10-19
**Révisée** : 2026-10-19 — bascule 100 % local : la création s'effectue dans des **projets** (brouillon/publié, spec 003) ; tout se traite sur l'appareil, sans enregistrement distant ni appel réseau.
**Statut**: DRAFT

## Scénarios utilisateurs & tests

### Histoire principale
**En tant que** utilisateur (particulier ou business) voulant créer un QR code,
**je veux** choisir parmi une galerie de types de QR codes (URL, Wi-Fi, vCard, PDF, Menu, Vidéo…) et remplir un formulaire adapté à ce type,
**afin de** produire le code contenant exactement le contenu que j'ai à partager, sans devoir comprendre la technique sous-jacente.

#### Scénario de validation
- **Étant donné** la galerie des types de QR affichée au démarrage du builder
  **quand** je sélectionne « Wi-Fi »
  **alors** le formulaire de contenu passe en mode Wi-Fi (SSID, type de sécurité, mot de passe,.isHidden) et l'aperçu du QR se met à jour en direct.

- **Étant donné** que j'ai choisi le type « Email »
  **quand** je saisis un destinataire invalide
  **alors** l'étape « Design » reste inaccessible et un message de validation s'affiche sur le champ concerné.

- **Étant donné** un type pour lequel je n'ai rempli aucun champ obligatoire
  **quand** je tente de passer à l'étape suivante
  **alors** je suis bloqué avec un indicateur visuel sur le champ manquant (message générique d'erreur en cas d'échec).

### Flux secondaires
- Recherche/parcours par cas d'usage : la galerie propose des familles (« QR Codes pour » : événements, mariages, ONGs, photographes…), le type reste sélectionnable directement.
- Chaque type expose : nom, description courte ( « Send a WhatsApp message » ), nature du contenu (encodable directement, ou page autonome générée — cf. specs 002/009), illustration.
- Le type peut être changé tant que le projet est au statut brouillon ; une fois le projet publié (figé, spec 003), changer de type équivaut à dupliquer puis modifier la copie (le contenu d'un projet publié est immuable, mais pas son type).

## Requirements

### Exigences fonctionnelles

- **FR-1**: Le système DOIT proposer une galerie de sélection de types de QR codes contenant au minimum les 23 types suivants : URL (statique), vCard, vCard Plus, Wi-Fi, WhatsApp, SMS, Email, Texte, PDF, Menu, Vidéo, Événement, Feedback, Images, Landing Page, Playlist, MP3, Réseaux sociaux, Business, Coupon, Produit, Liste de liens (« Link List »), Code-barres 2D.
- **FR-2**: Chaque type DOIT afficher : un nom lisible, une description courte orientée bénéfice (« Connect to a Wi-Fi network », « Send a WhatsApp message »…), et une vignette illustrative.
- **FR-3**: Chaque type DOIT indiquer la nature de son encodage : contenu encodable directement dans le QR (cf. spec 002), ou contenu riche rendu via page autonome générée localement (cf. spec 009).
- **FR-4**: Chaque type DOIT fournir un formulaire de contenu avec les champs propres audit type :
  - URL statique : URL de destination.
  - Wi-Fi : SSID, type de sécurité (WPA/WPA2/WPA3, WEP, none), mot de passe, option réseau caché.
  - vCard / vCard Plus : nom, prénom, société, fonction, téléphones, email, adresse, site web, note, photo ; vCard Plus permet une page de contact autonome générée localement (cf. spec 009).
  - WhatsApp : numéro de téléphone au format international, message pré-rédigé.
  - SMS : numéro et texte du message.
  - Email : destinataire, objet, corps du message.
  - Texte : texte libre (titre + contenu).
  - PDF : fichier PDF téléversé et conservé en local (ou URL fournie par l'utilisateur) + pagination + bouton d'action optionnel.
  - Menu : catégories et articles (nom, description, prix, image).
  - Vidéo : média vidéo conservé en local (téléversé) OU URL vers un service tiers, miniature.
  - Événement : titre, lieu (recherche par nom/adresse ou coordonnées), dates/heures, description.
  - Feedback : questions de satisfaction (étoiles, NPS…).
  - Images : galerie de fichiers images téléversés.
  - Landing Page : éditeur de page libre (blocs : titre, texte, image, lien…).
  - Playlist : lien(s) de playlist musicale.
  - MP3 : fichiers audio téléversés.
  - Réseaux sociaux : ensemble de champs « plateforme → identifiant/URL », page de liens sociale.
  - Business : fiche entreprise (adresse, horaires, description, images).
  - Coupon : image + code promo + bouton « utiliser ».
  - Produit : fiche produit (données nutritionnelles, certifications, allergènes…).
  - Liste de liens : liste ordonnée de liens (titre + URL + icône).
  - App : liens vers App Store / Google Play selon l'OS détecté.
  - Code-barres 2D : données brutes encodées.
- **FR-5**: Chaque champ DOIT appliquer une validation aux frontières (format URL, numéro de téléphone au format international, taille de fichier, champs obligatoires) avant l'accès à l'étape de design.
- **FR-6**: La saisie DOIT mettre à jour l'aperçu du QR en continu (après debounce), sans bouton de « régénération » explicite.
- **FR-7**: Une validation échouée (champ invalide, informations incomplètes) DOIT produire un message d'erreur compréhensible, sans perdre les données saisies.
- **FR-8**: Le brouillon de la création (le projet en cours, spec 003) DOIT être persisté en local automatiquement et rester modifiable à tout moment, même après fermeture de l'application (aucune expiration, aucune durée de session implicite).
- **FR-9**: La galerie DOIT être navigable aussi bien au clavier qu'à la tactile, et accessible (labels, focus visible, contraste).
- **FR-10**: Le système DOIT permettre à tout moment de revenir aux étapes précédentes sans perte de données.

### Entités clés *(extrait de données)*

- **QrType** : id (`url`, `wifi`, `vcard`, `menu`…), nom, description, nature d'encodage (direct / page autonome), schéma de formulaire (champs, validation, types).
- **Projet (QrProject, spec 003)** : type choisi + valeurs du formulaire + design association + statut (brouillon/publié) ; le brouillon est persisté en local et modifiable à tout moment.

### Hypothèses

- La liste des types ci-dessus constitue une cible minimale, pas nécessairement l'exhaustivité future.
- Le ré-ordonnancement des types et la mise en avant de cas d'usage est une question de merchandising, non de fonctionnel bloquant.
- Tous les types sont disponibles sans restriction (application gratuite, pas de typologie « réservée à une offre ») et 100 % traités en local.

## Critères de succès

- 100 % des 23 types listés sont créables de bout en bout (contenu → design → publication → téléchargement), via brouillon, en local.
- La saisie de contenu d'un type simple (URL, SMS, Email, Wi-Fi) se fait en moins de 30 secondes pour un utilisateur non expert.
- Aucun QR ne peut être généré avec un contenu corrompu ou invalide (0 échec de scan attribuable à un contenu mal formé).
- Le changement de type post-création est explicitement borné (message clair si l'utilisateur tente de changer le type), sans corruption du QR existant.
- La mise à jour de l'aperçu après une modification de champ s'opère en quelques centaines de millisecondes perçues (à peine perceptible pour l'utilisateur).

## Hors périmètre

- Comptes utilisateurs, création de compte, facturation et offres payantes (hors périmètre : application open source, gratuite et sans compte).
- Finitions de design (spec 004) et téléchargements (spec 005).
- Statistiques locales (spec 008) et pages de contenu autonomes en profondeur (spec 009).
