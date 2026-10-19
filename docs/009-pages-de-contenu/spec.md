# Spécification de fonctionnalité : Pages de contenu autonomes (fichier HTML exporté)

**ID fonctionnalité** : `009-pages-de-contenu`
**Créée** : 2026-10-19
**Révisée** : 2026-10-19 — bascule 100 % local : le système n'héberge et ne sert plus de pages (aucun serveur d'API, aucune API distante). Les pages de contenu sont désormais **générées localement en fichiers HTML autonomes** (une page = un fichier), que l'utilisateur utilise ou héberge à sa discrétion — l'application ne contacte jamais rien.
**Statut**: DRAFT
**Specs liées** : `001-catalogue-types`, `002-qr-statiques`, `003-projets-cycle-de-vie`, `010-feedback-menu-rating`

## Scénarios utilisateurs & tests

### Histoire principale
**En tant que** créateur d'un QR de type contenu (Menu, PDF, Images, Vidéo, Landing page, Playlist, MP3, Social, Business, Coupon, Produit, Liste de liens, App, Événement, vCard Plus…),
**je veux** générer localement une **page HTML autonome** (un seul fichier, mobile-first, offline-proof) affichant exactement le contenu que j'ai conçu,
**afin de** présenter un contenu riche qu'un simple encodage de données ne permettrait pas, sans dépendre d'aucun service en ligne ni de l'application.

#### Scénario de validation
- **Étant donné** un projet de type Menu avec catégories/articles, au moment de la publication (spec 003)
  **quand** je publie et demande la page de contenu
  **alors** un fichier HTML **autonome** est généré en local : le menu s'y affiche avec navigation par catégories, images intégrées, prix ; les articles sont lisibles sans zoom, le fichier s'ouvre correctement hors ligne (aucune ressource externe).

- **Étant donné** un projet de type PDF / Images / Vidéo / MP3 / Playlist
  **quand** la page autonome est générée
  **alors** le contenu s'affiche intégralement dans le fichier : visionneuse PDF paginée, galerie d'images avec plein écran, lecteur vidéo, lecteur audio/playlist — médias embarqués dans le fichier ou fournis en dossier d'accompagnement (choix explicite de l'utilisateur).

- **Étant donné** un projet de type Landing Page
  **quand** la page autonome est générée
  **alors** la page conçue (blocs titre/texte/image/lien) s'affiche fidèle à l'aperçu de l'éditeur.

- **Étant donné** un projet de type Social / Liste de liens / App / Événement / vCard Plus / Business / Coupon / Produit
  **quand** la page autonome est générée
  **alors** le rendu dédié correspond au type (liste de liens, détection OS avec fallback, fiche événement, .vcf téléchargeable, fiche société, coupon, fiche produit).

- **Étant donné** une page autonome utilisée publiquement
  **quand** l'utilisateur place le fichier sur l'hébergement de SON choix (serveur web personnel, hébergeur tiers, transfert USB pour usage local…)
  **alors** il peut encoder l'URL de son choix dans un QR (ou distribuer le fichier en pièce jointe ou support local) ; l'application n'intervient pas et ne contacte rien.

### Flux secondaires
- La page autonome est figée au contenu du projet au moment de la publication : toute mise à jour passe par duplication → modification → nouvelle publication → nouveau fichier (cohérent avec la spec 003).
- Le fichier générée n'embarque aucun CDN, police tierce en ligne, script distant ou appel réseau : il est fonctionnel strictement hors ligne.
- L'aperçu de la page se fait dans l'application (dans le contexte du builder, cf. spec 005) avant export.

## Requirements

### Exigences fonctionnelles

- **FR-1**: Le système DOIT générer localement, au format de fichier unique `index.html` (par défaut), une page web **autonome** par projet de type contenu publié : responsive, sans compte, mobile d'abord, fonctionnelle hors ligne.
- **FR-2**: La page autonome NE DOIT PAS dépendre d'une ressource externe (aucun CDN, aucun script distant, aucune police en ligne, aucun appel réseau) ; médias et librairies sont embarqués dans le fichier (ex. data-URI, SVG inline) ou placés à côté avec un chemin relatif sur explicitation de l'utilisateur.
- **FR-3**: Selon le type, la page DOIT rendre le contenu correspondant :
  - **Menu** : catégories + articles (nom, description, prix, image), navigation fluide, recherche optionnelle.
  - **PDF** : visionneuse PDF intégrée (paginée), avec téléchargement possible si activé.
  - **Images** : galerie (grille + plein écran), animée ou non, ordre personnalisable.
  - **Vidéo** : lecteur vidéo intégré (média embarqué), miniature ou affichage direct.
  - **Playlist / MP3** : lecteur audio (liste de lecture, lecture continue, titre, pochettes).
  - **Landing Page** : éditeur de blocs côté propriétaire, rendu fidèle côté public.
  - **Social / Liste de liens** : liste de liens (icônes, ordre, titre), ouverture dans de nouveaux onglets.
  - **Business** : fiche (logo, description, horaires, images, localisation, coordonnées).
  - **Coupon** : image + code promotionnel + bouton d'utilisation (compteur local optionnel).
  - **Produit** : fiche produit structurée (image, données, certifications, allergènes…).
  - **Événement** : titre, liste de dates/heures, lieu (lien carte), description, ajout au calendrier optionnel.
  - **vCard Plus** : fiche contact complète + bouton « sauver le contact » (`.vcf`, cf. spec 005).
  - **Feedback / Menu-rating** : formulaire d'avis (voir spec 010).
- **FR-4**: La page correspond à l'état **publié** du contenu (imuable, spec 003) : une mise à jour passe obligatoirement par duplication → publication → regénération du fichier ; aucune mise à jour à distance n'existe.
- **FR-5**: La page autonome NE DOIT PAS embarquer d'outils d'édition ni de données privées du propriétaire (pas de données de session, pas de contenu non publié).
- **FR-6**: Les fichiers générés DOIVENT être exploitables tels quels par des moyens usuels (double clic, pièce jointe, copie vers un hébergeur) — exactement comme tout export de fichier (cf. spec 005) ; l'application n'ouvre pas de connexion à un hébergeur.
- **FR-7**: La page DOIT être testable localement depuis l'application avant export (aperçu dans un rendu web intégré, cf. spec 005).
- **FR-8**: Les pages DOIVENT respecter l'accessibilité de base (hiérarchie de titres, alt d'images, navigation clavier).
- **FR-9**: Les pages DOIVENT porter les métadonnées de partage social (Open Graph) reflétant le contenu.
- **FR-10**: Les limites de contenu (taille des médias embarqués, nombre d'articles) DOIVENT être annoncées avant la génération ; un contenu trop volumineux propose le mode « média en dossier d'accompagnement » au lieu d'un échec.

### Entités clés

- **PageBundle** : fichier HTML autonome (contenu structuré par type + réglages d'affichage + médias embarqués/relatifs + métadonnées sociales) + date de génération + empreinte du projet publié dont il dérive.
- **Assets d'accompagnement** : médias laissés en dossier d'accompagnement (option utilisateur) avec chemin relatif.

### Hypothèses

- Le fichier HTML autonome est un livrable au même titre qu'une image du QR : sa diffusion (hébergeur tiers, serveur personnel, partage direct) relève de l'utilisateur ; l'application n'interagit jamais avec ces canaux.
- Les limites de taille médias suivent les règles communes de validation (cf. spec 001) ; le mode « dossier d'accompagnement » contourne la limite d'embarquement pour les médias lourds.
- La lecture de la page n'exige ni application ni compte côté destinataire.

## Critères de succès

- 100 % des pages générées fonctionnent hors ligne, toutes ressources confondues (test : ouverture avion/réseau déconnecté pour chaque type).
- Le fichier généré s'affiche fidèlement à l'aperçu du builder (vérification type par type).
- 0 donnée privée du propriétaire (contenu non publié, préférences, chemins locaux) absorbée dans le fichier exporté.
- La génération d'une page type Menu (50 articles, 20 images) s'achève en local en moins de 10 secondes.

## Hors périmètre

- Éditeur de design du QR (spec 004) — la page ici est le contenu cible, pas l'image du code.
- Cycle de vie du projet (brouillon/publication/duplication, spec 003).
- Analytics de page (ex. suivi des visites : uniquement sur l'hébergement de l'utilisateur, cf. spec 008).
