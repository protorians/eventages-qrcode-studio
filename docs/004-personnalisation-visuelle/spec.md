# Spécification de fonctionnalité : Personnalisation visuelle du QR

**ID fonctionnalité** : `004-personnalisation-visuelle`
**Créée** : 2026-10-19
**Révisée** : 2026-10-19 — bascule 100 % local : le design est éditable tant que le projet est au statut brouillon ; l'état publié est immuable (modifications via duplication, spec 003). Tout le rendu s'effectue sur l'appareil.
**Statut**: DRAFT
**Specs liées** : `001-catalogue-types`, `003-projets-cycle-de-vie`, `005-apercu-telechargement`

## Scénarios utilisateurs & tests

### Histoire principale
**En tant que** utilisateur voulant un code à son image,
**je veux** choisir la forme des modules, les couleurs, la forme des coins, ajouter un logo et un cadre textuel,
**afin de** obtenir un code reconnaissable à ma marque, prêt pour une utilisation print ou digitale.

#### Scénario de validation
- **Étant donné** un contenu de QR complet à l'étape de contenu
  **quand** j'ouvre l'étape Design
  **alors** je vois côté gauche la liste des groupes : **Frame**, **QR code style**, **Ajouter un logo**, **Corners**, et à droite l'aperçu live qui reflète chaque changement instantanément.

- **Étant donné** le groupe « QR code style »
  **quand** je choisis la forme `dots` avec dégradé de couleurs
  **alors** les modules du code se dessinent en points avec le dégradé choisi, et l'aperçu se met à jour immédiatement.

- **Étant donné** le groupe « Ajouter un logo »
  **quand** je téléverse un JPG/PNG (> taille max refusée avec message)
  **alors** le logo s'insère au centre avec un contour de sécurité ajusté, et le niveau de correction d'erreur est recommandé à « High » pour préserver la lisibilité.

- **Étant donné** le groupe « Frame »
  **quand** je choisis une frame numérotée + un texte de bas de frame (« Scan me »)
  **alors** le code est dessiné avec l'habillage choisi, le texte visible, et le texte reste éditable/mobiles depuis la même interface.

- **Étant donné** le groupe « Corners »
  **quand** je personnalise la forme et la couleur des coins (extérieurs « edge » et centraux)
  **alors** les marqueurs de position se redessinent sans casser la détection du code.

- **Étant donné** un design finalisé
  **quand** je le sauvegarde comme modèle
  **alors** il apparaît dans la bibliothèque de modèles (onglets « personnaliser » / « templates ») et peut être réappliqué à un autre QR.

### Flux secondaires
- Un preset de design (« templates ») s'applique en un clic après sélection.
- Le design est modifiable à tout moment tant que le projet est au statut **brouillon** ; un projet publié étant immuable (spec 003), tout changement de design d'un projet publié passe par duplication → modification → nouvelle publication → réimpression/réexport.
- Rappel : pour un QR avec logo très expressif, l'utilisateur est guidé vers un niveau de correction d'erreur `H` (voir spec 002, FR-6).
- Illustrations d'aide par « mockups » (`/mockup/:type`) pour visualiser le résultat dans un contexte réel (affiche, carte…).

## Requirements

### Exigences fonctionnelles

- **FR-1**: Le panneau de design DOIT exposer 4 groupes dans cet ordre : **Frame** (cadre), **QR code style** (formes/couleurs du corps), **Ajouter un logo**, **Corners** (bords et centre).
- **FR-2**: Le groupe Frame DOIT proposer une galerie de cadres prédéfinis (~30 frames numérotées : 0, 13, 18, 21, 22, 30 et autres), un état « sans frame », une couleur de cadre, un texte de cadre éditable avec taille de police par défaut, et une couleur de fond de frame optionnelle.
- **FR-3**: Le groupe QR code style DOIT offrir au minimum les formes de modules suivantes : `square`, `square2`, `square3`, `rounded`, `extra-rounded`, `dots`, `circle`, `star`, `heart`, `diamond`, `diamond-special`, `classy`, `classy-rounded`, `squareMask`.
- **FR-4**: Les couleurs du corps DOIVENT être configurables en couleur unie ou dégradé (départ/arrivée), avec choix de couleur via sélecteur (hex).
- **FR-5**: Le groupe Corners DOIT permettre la personnalisation distincte des marqueurs : coins extérieurs (« edge ») et coins centraux, chacun avec forme et couleur séparées (famille `square`, `rounded`, `dots`, `classy`, …).
- **FR-6**: Le groupe Logo DOIT permettre (a) le téléversement d'un fichier image (JPG, JPEG, PNG – plafond de taille communiqué à l'utilisateur), (b) le choix d'un logo dans une bibliothèque de presets, avec marges de protection et fond optionnel autour du logo.
- **FR-7**: Tout changement d'option de design DOIT refléter l'aperçu en quelques centaines de millisecondes perçues.
- **FR-8**: Le design DOIT être statisable comme **modèle réutilisable** (onglets `custom` / `templates`), listé, appliquable à un autre QR, et supprimable.
- **FR-9**: En cas de design susceptible de nuire à la lisibilité (contraste trop faible, logo très couvrant), le système DOIT avertir l'utilisateur et proposer une correction (montée du niveau de correction d'erreur, ajustement du contraste).
- **FR-10**: Les couleurs DOIVENT rester conformes à un contraste minimal garantissant la détection (le moteur de rendu maintient les quiet zones et une couleur de fond claire par défaut).
- **FR-11**: L'utilisateur DOIT pouvoir réinitialiser le design au style par défaut en un clic.

### Entités clés

- **QrDesign** : référence du projet + frame (id, couleur, texte, taille de police, couleur de fond) + qrStyle (forme des modules, couleurs, dégradés) + corners (formes et couleurs edge/center) + logo (fichier ou preset, marges).
- **DesignTemplate** : design nommé réutilisable, stocké dans la bibliothèque locale, partageable/exportable librement en fichier (sans serveur).

### Hypothèses

- Le rendu s'appuie sur la bibliothèque open source `qr-code-styling` ; les noms de formes listés servent de cible minimale.
- La bibliothèque de frames numérotées est une ressource statique ; on ne spécifie pas ici chaque visuel de frame, seulement la capacité de choix/couverture.
- Les limites de taille de fichier logo sont de l'ordre de quelques Mo ; la valeur exacte sera figée au plan technique.

## Critères de succès

- Un utilisateur peut produire un design complet (formes + couleurs + logo + frame) en moins de 2 minutes.
- 100 % des designs appliqués restent scannables avant téléchargement (test de scan intégré, spec 005).
- L'aperçu suit chaque changement instantanément (latence perçue < 300 ms).
- Les modèles sauvegardés peuvent être appliqués à un autre QR sans décalage visuel de rendu (identité pixel près du rendu téléchargé).

## Hors périmètre

- Choix de contenu (spec 001) et formats de téléchargement (spec 005).
- Génération en masse (une spec 006 applique un design à un lot — le design lui-même relève de cette spec).
