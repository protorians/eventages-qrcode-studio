# Spécification de fonctionnalité : QR codes statiques

**ID fonctionnalité** : `002-qr-statiques`
**Créée** : 2026-10-19
**Révisée** : 2026-10-19 — bascule 100 % local : tous les QR encodent directement leur contenu (aucune redirection via service en ligne) ; le cycle de vie de l'édition est assuré par les projets (spec 003), pas par un serveur.
**Statut**: DRAFT
**Spec parent** : `001-catalogue-types` (types supportés)

## Scénarios utilisateurs & tests

### Histoire principale
**En tant que** utilisateur qui a un contenu fixe (lien, contact, réseau Wi-Fi, message),
**je veux** générer gratuitement un QR code dont les données sont encodées directement dans l'image,
**afin de** l'imprimer et le distribuer sans limite de temps, sans compte, sans abonnement et sans aucun service en ligne.

#### Scénario de validation
- **Étant donné** un type compatible à encodage direct (ex. URL, Wi-Fi, SMS, Email, Texte, vCard, WhatsApp, Code-barres 2D) et un contenu valide
  **quand** je finalise la création (brouillon complet → publication, spec 003)
  **alors** le QR est généré localement, encodé en mode statique, et restera scannable indéfiniment (jamais expiré).

- **Étant donné** un QR déjà généré et publié
  **quand** je scanne l'image obtenue
  **alors** le contenu décodé correspond exactement à la saisie source (aucune URL de redirection n'est encodée).

- **Étant donné** un volume de données trop important pour une version lisible du code
  **quand** le contenu excède la capacité maximale de la version choisie
  **alors** le builder m'avertit et me propose de réduire le contenu (ou active automatiquement une densité plus élevée si le résultat reste lisible).

### Flux secondaires
- Le contenu encodé est figé à la publication (imuable, spec 003) : pas de suivi des scans, pas de changement de cible après impression ; la mise à jour passe par duplication → nouvelle publication → réimpression.
- Un contenu encodé direct peut être réutilisé pour générer plusieurs variantes visuelles (voir spec 004) depuis des projets dupliqués.
- Les types à contenu riche (Menu, PDF, Images, Landing Page, Playlist, MP3…) peuvent : soit être encodés directement si le contenu est court, soit ouvrir une page autonome générée localement (spec 009) dont l'URL est fournie par l'utilisateur — dans tous les cas, l'encodage du QR reste direct.

## Requirements

### Exigences fonctionnelles

- **FR-1**: Le système DOIT générer, localement, un QR à encodage direct pour tout type où le contenu peut être intégralement encodable dans la donnée du QR : URL, Wi-Fi, SMS, Email, Texte, vCard (données brutes), WhatsApp, Code-barres 2D ; le contenu ne DOIT inclure aucune URL de redirection opérée par l'application.
- **FR-2**: Un QR statique DOIT être gratuit, sans plafond de quantité et **sans expiration**.
- **FR-3**: La génération DOIT être possible **sans compte utilisateur** et **sans connexion réseau** (0 contact de serveur, vérifiable hors ligne).
- **FR-4**: Le système DOIT configurer l'encodage selon les standards ISO/IEC 18004 : mode d'encodage approprié (byte/alphanumeric/numeric/kanji), taille de version adaptée avec correction automatique.
- **FR-5**: Pour un contenu identique, le système DOIT pouvoir produire plusieurs variantes (40 combinaisons possibles à terme : 4 niveaux de correction d'erreur × 8 niveaux de masquage) et sélectionner automatiquement la version la plus lisible.
- **FR-6**: Le niveau de correction d'erreur DOIT être configurable entre L, M, Q, H, avec une valeur par défaut adaptée (M par défaut, H recommandé avec logo).
- **FR-7**: Le contenu encodé DOIT être testable avant téléchargement (aperçu scannable/testable dans le builder — voir spec 005).
- **FR-8**: Le contenu encodé DOIT être figé à la publication (imuable, cf. spec 003) ; aucune « conversion » de contenu après publication n'existe — la modification passe obligatoirement par duplication du projet, et le builder doit instruire clairement l'utilisateur de cette règle avant publication.
- **FR-9**: Les données du QR statique DOIVENT rester 100 % locales : aucun service tiers n'est nécessaire pour scanner le code.
- **FR-10**: Lorsque l'utilisateur exige une densité trop forte (contenu trop volumineux), le système DOIT bloquer la création avec un message explicite.

### Entités clés

- **StaticQr** : type + contenu brut encodable + options d'encodage (niveau de correction d'erreur, masque), association au style/appearance.
- **QrEncodingOptions** : errorCorrectionLevel (`L|M|Q|H`), version automatique ou forcée.

### Hypothèses

- La génération s'appuie sur la même bibliothèque de rendu que l'aperçu live ; aucun service réseau n'est exigé pour produire l'image finale (l'application est fonctionnelle en mode avion).
- La « conversion » de contenu étant impossible après publication (immutabilité, spec 003), on exclut tout chemin de modification directe d'un projet publié — la duplication est le seul canal de mise à jour.
- Pour les types à contenu riche, l'URL encodée (si l'utilisateur choisit le mode page autonome) pointe vers un espace que l'utilisateur maîtrise ; l'application ne vérifie ni n'atteint cette URL.

## Critères de succès

- 100 % des QR générés restent scannables après impression papier standard (test sur impression A4 à tailles courantes : 2 cm → 10 cm).
- Le temps de génération d'un QR depuis un contenu complet est perçu comme instantané (< 1 seconde), hors ligne.
- 0 expédition de données du contenu vers l'extérieur : la génération locale est vérifiable hors-ligne (0 requête réseau émise lors de la publication).
- Le taux de QR invalides (non décodables par un scanner standard) est inférieur à 0,1 %.

## Hors périmètre

- Cycle de vie des projets : brouillon, publication, duplication (spec 003).
- Styles de design détaillés (spec 004) et formats de téléchargement (spec 005).
- Pages de contenu autonomes (spec 009).
