# Spécification de fonctionnalité : Aperçu, test et téléchargement

**ID fonctionnalité** : `005-apercu-telechargement`
**Créée** : 2026-10-19
**Révisée** : 2026-10-19 — bascule 100 % local (aucun serveur) : les tests s'effectuent en local (aperçu intégré, fichiers autonomes générés), sans lien public fourni par un service.
**Statut**: DRAFT
**Specs liées** : `002-qr-statiques`, `003-projets-cycle-de-vie`, `004-personnalisation-visuelle`, `009-pages-de-contenu`

## Scénarios utilisateurs & tests

### Histoire principale
**En tant que** créateur de QR code,
**je veux** tester le code avant de l'utiliser et le télécharger dans le format et la résolution adaptés à mon usage (web, impression, sérigraphie),
**afin de** éviter de distribuer un code non fonctionnel et obtenir un fichier directement exploitable.

#### Scénario de validation
- **Étant donné** le contenu et le style de mon QR finalisés
  **quand** je clique sur « Aperçu / tester » dans le builder
  **alors** le code s'affiche en aperçu fidèle au rendu final, avec une invite de test explicite me rappelant de scanner ou d'exécuter le lien en test avant l'impression.

- **Étant donné** un projet de type contenu (Menu, PDF, Landing…) publié ou en test de brouillon
  **quand** je teste la page de contenu
  **alors** l'aperçu local de la page autonome (fichier HTML, cf. spec 009) s'ouvre et se comporte exactement comme le fichier qui sera exporté — hors ligne.

- **Étant donné** un design et un usage d'impression pro
  **quand** je choisis le format de téléchargement
  **alors** je peux obtenir : PNG, JPEG, WEBP, SVG (vectoriel), PDF, EPS, **CMYK** (pour l'impression offset), et, pour un lot, un ZIP.

- **Étant donné** une demande d'image haute résolution
  **quand** je télécharge en PNG/JPEG/WEBP
  **alors** je peux choisir une taille en pixels adaptée (génération en multiple, carré) ; l'image reste nette à la taille choisie.

- **Étant donné** un QR déjà créé
  **quand** je relance un téléchargement depuis la gestion des QR codes
  **alors** j'obtiens le même rendu que la création (style persisté), avec export CSV d'inventaire possible depuis la liste (voir spec 007).

### Flux secondaires
- Erreurs de téléversement / formats non pris en charge → message express (« Le format du fichier n'est pas pris en charge »).
- Le téléchargement depuis le builder propose aussi bien l'image du QR que l'export de contenu pour certains types (vCard `.vcf` pour un contact, etc.).
- Des mockups servent de contexte visuel secondaire, pas de fichier final.

## Requirements

### Exigences fonctionnelles

- **FR-1**: Le builder DOIT proposer un aperçu en temps réel du rendu final (identique, au pixel près, au fichier téléchargé).
- **FR-2**: Un **test du QR DOIT être encouragé avant utilisation** : test par scan avec caméra sur un aperçu affiché localement (ou exécution du destinataire dans la vue aperçu) — bannières/rappels explicites dans le builder ; ce test s'effectue hors ligne.
- **FR-3**: Les formats de téléchargement image DOIVENT inclure : **PNG, JPEG (JPG), WEBP, SVG**, et option **EPS** (vectoriel).
- **FR-4**: Un export **PDF** DOIT être possible (montage du QR dans un document PDF), et un export **CMYK** DOIT exister pour l'impression professionnelle.
- **FR-5**: Pour les lots de QR générés en masse, le téléchargement DOIT être regroupé en **ZIP**.
- **FR-6**: Les formats matriciels (PNG, JPEG, WEBP) DOIVENT permettre de choisir la taille (carré de N pixels) et produire une image nette à la taille demandée.
- **FR-7**: Les formats vectoriels (SVG, EPS, PDF) DOIVENT produire un fichier net à toute échelle (impression grande taille).
- **FR-8**: Le nom de fichier DOIT être explicite (type + nom choisi par l'utilisateur, pas d'UUID opaque).
- **FR-9**: Un projet à contenu riche DOIT être testé avant impression via l'aperçu local de sa page autonome (fichier HTML généré en mémoire/on-disk temporaire, cf. spec 009) ; l'utilisateur peut partager ce fichier de test lui-même s'il le souhaite (l'application ne publie rien).
- **FR-10**: Les échecs de génération (contenu trop dense, style inconsistant) DOIVENT empêcher le téléchargement et proposer un correctif.
- **FR-11**: La ré-ouverture d'un projet (brouillon ou publié) DOIT permettre de retélécharger sans avoir à repasser par les étapes de création ; pour un projet publié, l'export est reproductible à l'identique depuis l'état figé (snapshot, spec 003).
- **FR-12**: Le téléchargement d'un contenu de type « contact » (vCard) DOIT comprendre l'export `.vcf` du contact.

### Entités clés

- **QrDownload** : référence du projet (état publié, spec 003) + format (`png|jpeg|webp|svg|pdf|eps|cmyk|zip`) + taille en pixels (pour formats matriciels) + date de téléchargement.
- **PreviewSession** : aperçu local d'un projet (QR et/ou page autonome) généré hors ligne pour test avant publication.

### Hypothèses

- La génération CMYK est une conversion de couleur ; si elle n'est pas assurée par le moteur de rendu local, cette export peut être dégradée en avertissement (« couleur RVB convertie localement »).
- EPS est considéré comme dérivable du rendu vectoriel (SVG) ; si le moteur choisi ne le supporte pas nativement, l'export EPS peut être marqué ultérieur sans invalider la liste des formats.
- La taille de téléchargement en PNG reste dans une fourchette raisonnable (jusqu'à plusieurs milliers de px par côté) sans limiter arbitrairement la résolution.

## Critères de succès

- Un utilisateur peut tester son QR (scan ou lien) **avant téléchargement** dans 100 % des cas où la fonctionnalité est disponible.
- 0 re-téléchargement nécessaire dû à un fichier flou/inadapté : le fichier reçu est exploitable tel quel dans le contexte demandé (web ou print).
- Le téléchargement d'un QR en PNG 1000 px prend sensiblement moins de 2 secondes.
- Tous les formats listés produisent des codes décodables par les scanners courants (contrôle par lot d'échantillons).

## Hors périmètre

- Fabrication/modification du contenu des pages autonomes (spec 009).
- Gestion de l'inventaire (spec 007 ; y figure l'export CSV).
