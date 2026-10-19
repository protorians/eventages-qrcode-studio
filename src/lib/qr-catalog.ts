import type { LucideIcon } from "lucide-react";
import {
  AppWindow,
  Briefcase,
  CalendarDays,
  Contact,
  FileText,
  Images,
  LayoutTemplate,
  Link,
  ListTree,
  ListMusic,
  Mail,
  Menu as MenuIcon,
  MessageCircle,
  MessageSquare,
  Music,
  Package,
  QrCode,
  Share2,
  ShieldCheck,
  Star,
  Ticket,
  Type,
  Video,
  Wifi,
} from "lucide-react";

/** Comment le contenu est porté par le QR (spec 001, FR-3). */
export type QrEncoding = "direct" | "page";

/** Familles de cas d'usage affichées comme filtres dans la galerie. */
export type QrFamily =
  | "essentials"
  | "contact"
  | "web"
  | "commerce"
  | "event"
  | "media"
  | "advanced";

export type QrFieldType =
  | "text"
  | "textarea"
  | "url"
  | "tel"
  | "email"
  | "password"
  | "date"
  | "time"
  | "number"
  | "select"
  | "switch"
  | "file";

export type QrField = {
  name: string;
  label: string;
  type: QrFieldType;
  placeholder?: string;
  help?: string;
  required?: boolean;
  /** Occupe les deux colonnes de la grille de formulaire. */
  wide?: boolean;
  options?: { value: string; label: string }[];
  accept?: string;
};

export type QrType = {
  id: string;
  label: string;
  tagline: string;
  family: QrFamily;
  encoding: QrEncoding;
  icon: LucideIcon;
  /** Teinte d'accent (degrés oklch) utilisée par la vignette. */
  hue: number;
  fields: QrField[];
};

export const QR_FAMILIES: { id: QrFamily; label: string }[] = [
  { id: "essentials", label: "Essentiels" },
  { id: "contact", label: "Contact" },
  { id: "web", label: "Web & réseaux" },
  { id: "commerce", label: "Commerce" },
  { id: "event", label: "Événements" },
  { id: "media", label: "Média" },
  { id: "advanced", label: "Avancé" },
];

const SECURITY_OPTIONS = [
  { value: "WPA", label: "WPA / WPA2" },
  { value: "WPA3", label: "WPA3" },
  { value: "WEP", label: "WEP" },
  { value: "nopass", label: "Aucune" },
];

/**
 * Catalogue des types de QR codes (spec 001, FR-1/FR-2/FR-4).
 * Chaque type décrit son formulaire de contenu ; le payload est construit
 * dans `qr-payload.ts`.
 */
export const QR_TYPES: QrType[] = [
  {
    id: "url",
    label: "URL",
    tagline: "Ouvrir une page web",
    family: "essentials",
    encoding: "direct",
    icon: Link,
    hue: 250,
    fields: [
      {
        name: "url",
        label: "Adresse de destination",
        type: "url",
        placeholder: "https://exemple.com",
        required: true,
        wide: true,
        help: "Toujours inclure https:// pour éviter les avertissements de sécurité.",
      },
    ],
  },
  {
    id: "text",
    label: "Texte",
    tagline: "Afficher un texte libre",
    family: "essentials",
    encoding: "direct",
    icon: Type,
    hue: 275,
    fields: [
      { name: "title", label: "Titre", type: "text", placeholder: "Note rapide" },
      {
        name: "content",
        label: "Contenu",
        type: "textarea",
        placeholder: "Le message à scanner…",
        required: true,
        wide: true,
      },
    ],
  },
  {
    id: "email",
    label: "Email",
    tagline: "Écrire un message pré-rempli",
    family: "contact",
    encoding: "direct",
    icon: Mail,
    hue: 220,
    fields: [
      {
        name: "to",
        label: "Destinataire",
        type: "email",
        placeholder: "bonjour@exemple.com",
        required: true,
      },
      { name: "subject", label: "Objet", type: "text", placeholder: "Demande d'information" },
      { name: "body", label: "Message", type: "textarea", wide: true },
    ],
  },
  {
    id: "sms",
    label: "SMS",
    tagline: "Envoyer un texto pré-rempli",
    family: "contact",
    encoding: "direct",
    icon: MessageSquare,
    hue: 200,
    fields: [
      {
        name: "number",
        label: "Numéro",
        type: "tel",
        placeholder: "+33 6 12 34 56 78",
        required: true,
      },
      { name: "message", label: "Message", type: "textarea", wide: true },
    ],
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    tagline: "Démarrer une conversation",
    family: "contact",
    encoding: "direct",
    icon: MessageCircle,
    hue: 150,
    fields: [
      {
        name: "number",
        label: "Numéro international",
        type: "tel",
        placeholder: "+33612345678",
        required: true,
        help: "Indicatif pays obligatoire, sans espaces ni tirets.",
      },
      { name: "message", label: "Message pré-rédigé", type: "textarea", wide: true },
    ],
  },
  {
    id: "wifi",
    label: "Wi-Fi",
    tagline: "Rejoindre un réseau",
    family: "essentials",
    encoding: "direct",
    icon: Wifi,
    hue: 190,
    fields: [
      { name: "ssid", label: "Nom du réseau (SSID)", type: "text", required: true },
      { name: "security", label: "Sécurité", type: "select", options: SECURITY_OPTIONS },
      { name: "password", label: "Mot de passe", type: "password" },
      { name: "hidden", label: "Réseau masqué", type: "switch" },
    ],
  },
  {
    id: "vcard",
    label: "vCard",
    tagline: "Partager une fiche contact",
    family: "contact",
    encoding: "direct",
    icon: Contact,
    hue: 235,
    fields: [
      { name: "firstName", label: "Prénom", type: "text", required: true },
      { name: "lastName", label: "Nom", type: "text", required: true },
      { name: "company", label: "Société", type: "text" },
      { name: "jobTitle", label: "Fonction", type: "text" },
      { name: "phone", label: "Téléphone", type: "tel", placeholder: "+33 6 12 34 56 78" },
      { name: "email", label: "Email", type: "email" },
      { name: "website", label: "Site web", type: "url" },
      { name: "address", label: "Adresse", type: "text" },
      { name: "note", label: "Note", type: "textarea", wide: true },
    ],
  },
  {
    id: "vcard-plus",
    label: "vCard Plus",
    tagline: "Page contact autonome",
    family: "contact",
    encoding: "page",
    icon: ShieldCheck,
    hue: 245,
    fields: [
      { name: "firstName", label: "Prénom", type: "text", required: true },
      { name: "lastName", label: "Nom", type: "text", required: true },
      { name: "company", label: "Société", type: "text" },
      { name: "jobTitle", label: "Fonction", type: "text" },
      { name: "phone", label: "Téléphone", type: "tel" },
      { name: "email", label: "Email", type: "email" },
      { name: "bio", label: "Présentation", type: "textarea", wide: true },
      { name: "avatar", label: "Photo", type: "file", accept: "image/*", wide: true },
    ],
  },
  {
    id: "link-list",
    label: "Liste de liens",
    tagline: "Regrouper plusieurs liens",
    family: "web",
    encoding: "page",
    icon: ListTree,
    hue: 265,
    fields: [
      { name: "title", label: "Titre de la page", type: "text", required: true },
      { name: "subtitle", label: "Sous-titre", type: "text" },
      {
        name: "links",
        label: "Liens",
        type: "textarea",
        placeholder: "Boutique | https://…\nNewsletter | https://…",
        help: "Un lien par ligne, au format « Titre | URL ».",
        wide: true,
      },
    ],
  },
  {
    id: "social",
    label: "Réseaux sociaux",
    tagline: "Tous vos profils sur une page",
    family: "web",
    encoding: "page",
    icon: Share2,
    hue: 320,
    fields: [
      { name: "title", label: "Titre", type: "text", placeholder: "@votrecompte" },
      { name: "instagram", label: "Instagram", type: "url" },
      { name: "facebook", label: "Facebook", type: "url" },
      { name: "x", label: "X / Twitter", type: "url" },
      { name: "linkedin", label: "LinkedIn", type: "url" },
      { name: "tiktok", label: "TikTok", type: "url" },
    ],
  },
  {
    id: "landing",
    label: "Landing Page",
    tagline: "Page d'accueil autonome",
    family: "web",
    encoding: "page",
    icon: LayoutTemplate,
    hue: 285,
    fields: [
      { name: "title", label: "Titre", type: "text", required: true },
      { name: "subtitle", label: "Accroche", type: "text" },
      { name: "body", label: "Contenu", type: "textarea", wide: true },
      { name: "ctaLabel", label: "Texte du bouton", type: "text", placeholder: "Nous contacter" },
      { name: "ctaUrl", label: "Lien du bouton", type: "url" },
    ],
  },
  {
    id: "menu",
    label: "Menu",
    tagline: "Carte de restaurant en ligne",
    family: "commerce",
    encoding: "page",
    icon: MenuIcon,
    hue: 30,
    fields: [
      { name: "title", label: "Nom de l'établissement", type: "text", required: true },
      { name: "subtitle", label: "Sous-titre", type: "text" },
      {
        name: "items",
        label: "Articles",
        type: "textarea",
        placeholder: "Entrées | Burrata, tomates | 9 €",
        help: "Un article par ligne : Catégorie | Nom | Prix.",
        wide: true,
      },
    ],
  },
  {
    id: "business",
    label: "Business",
    tagline: "Fiche entreprise complète",
    family: "commerce",
    encoding: "page",
    icon: Briefcase,
    hue: 210,
    fields: [
      { name: "name", label: "Nom", type: "text", required: true },
      { name: "category", label: "Catégorie", type: "text" },
      { name: "address", label: "Adresse", type: "text", wide: true },
      { name: "phone", label: "Téléphone", type: "tel" },
      { name: "hours", label: "Horaires", type: "text", placeholder: "Lun–Ven 9h–18h" },
      { name: "description", label: "Description", type: "textarea", wide: true },
    ],
  },
  {
    id: "product",
    label: "Produit",
    tagline: "Fiche produit détaillée",
    family: "commerce",
    encoding: "page",
    icon: Package,
    hue: 45,
    fields: [
      { name: "name", label: "Produit", type: "text", required: true },
      { name: "price", label: "Prix", type: "text", placeholder: "12,90 €" },
      { name: "description", label: "Description", type: "textarea", wide: true },
      { name: "allergens", label: "Allergènes", type: "text" },
      { name: "certifications", label: "Certifications", type: "text" },
      { name: "image", label: "Visuel", type: "file", accept: "image/*", wide: true },
    ],
  },
  {
    id: "coupon",
    label: "Coupon",
    tagline: "Code promo à présenter en caisse",
    family: "commerce",
    encoding: "page",
    icon: Ticket,
    hue: 15,
    fields: [
      { name: "title", label: "Titre", type: "text", placeholder: "−20 % sur votre prochaine visite", required: true },
      { name: "code", label: "Code promo", type: "text", placeholder: "STUDIO20" },
      { name: "terms", label: "Conditions", type: "textarea", wide: true },
    ],
  },
  {
    id: "event",
    label: "Événement",
    tagline: "Inviter à un événement",
    family: "event",
    encoding: "page",
    icon: CalendarDays,
    hue: 340,
    fields: [
      { name: "title", label: "Titre", type: "text", required: true },
      { name: "location", label: "Lieu", type: "text", wide: true },
      { name: "startDate", label: "Date de début", type: "date" },
      { name: "startTime", label: "Heure de début", type: "time" },
      { name: "description", label: "Description", type: "textarea", wide: true },
    ],
  },
  {
    id: "feedback",
    label: "Feedback",
    tagline: "Collecter un avis client",
    family: "event",
    encoding: "page",
    icon: Star,
    hue: 90,
    fields: [
      { name: "title", label: "Titre", type: "text", placeholder: "Votre avis nous intéresse" },
      { name: "question", label: "Question", type: "text", wide: true },
      {
        name: "scale",
        label: "Échelle",
        type: "select",
        options: [
          { value: "stars", label: "Étoiles (1–5)" },
          { value: "nps", label: "NPS (0–10)" },
          { value: "emoji", label: "Émojis" },
        ],
      },
    ],
  },
  {
    id: "pdf",
    label: "PDF",
    tagline: "Diffuser un document",
    family: "media",
    encoding: "page",
    icon: FileText,
    hue: 5,
    fields: [
      { name: "title", label: "Titre du document", type: "text", required: true },
      { name: "file", label: "Fichier PDF", type: "file", accept: "application/pdf", wide: true },
      { name: "actionLabel", label: "Texte du bouton", type: "text", placeholder: "Télécharger" },
    ],
  },
  {
    id: "video",
    label: "Vidéo",
    tagline: "Lire une vidéo",
    family: "media",
    encoding: "page",
    icon: Video,
    hue: 355,
    fields: [
      { name: "title", label: "Titre", type: "text", required: true },
      { name: "url", label: "Lien de la vidéo", type: "url", wide: true },
      { name: "caption", label: "Légende", type: "text" },
    ],
  },
  {
    id: "images",
    label: "Images",
    tagline: "Partager une galerie",
    family: "media",
    encoding: "page",
    icon: Images,
    hue: 300,
    fields: [
      { name: "title", label: "Titre de la galerie", type: "text", required: true },
      { name: "caption", label: "Légende", type: "text" },
      { name: "files", label: "Images", type: "file", accept: "image/*", wide: true },
    ],
  },
  {
    id: "mp3",
    label: "MP3",
    tagline: "Diffuser un fichier audio",
    family: "media",
    encoding: "page",
    icon: Music,
    hue: 170,
    fields: [
      { name: "title", label: "Titre", type: "text", required: true },
      { name: "artist", label: "Artiste", type: "text" },
      { name: "file", label: "Fichier audio", type: "file", accept: "audio/*", wide: true },
    ],
  },
  {
    id: "playlist",
    label: "Playlist",
    tagline: "Partager une playlist musicale",
    family: "media",
    encoding: "page",
    icon: ListMusic,
    hue: 130,
    fields: [
      { name: "title", label: "Titre", type: "text", required: true },
      { name: "url", label: "Lien de la playlist", type: "url", wide: true },
    ],
  },
  {
    id: "app",
    label: "App",
    tagline: "Installer votre application",
    family: "advanced",
    encoding: "page",
    icon: AppWindow,
    hue: 260,
    fields: [
      { name: "title", label: "Nom de l'application", type: "text", required: true },
      { name: "iosUrl", label: "App Store", type: "url" },
      { name: "androidUrl", label: "Google Play", type: "url" },
      { name: "fallbackUrl", label: "Lien de secours", type: "url", wide: true },
    ],
  },
  {
    id: "barcode2d",
    label: "Code-barres 2D",
    tagline: "Encoder des données brutes",
    family: "advanced",
    encoding: "direct",
    icon: QrCode,
    hue: 0,
    fields: [
      {
        name: "format",
        label: "Format",
        type: "select",
        options: [
          { value: "text", label: "Texte brut" },
          { value: "json", label: "JSON" },
          { value: "hex", label: "Hexadécimal" },
        ],
      },
      {
        name: "data",
        label: "Données",
        type: "textarea",
        placeholder: '{"id":"A-1029"}',
        required: true,
        wide: true,
        help: "Les données sont encodées telles quelles, sans transformation.",
      },
    ],
  },
];

export const QR_TYPES_BY_ID: Record<string, QrType> = Object.fromEntries(
  QR_TYPES.map((type) => [type.id, type]),
);

export function getQrType(id: string): QrType {
  return QR_TYPES_BY_ID[id] ?? QR_TYPES[0];
}

export type QrValues = Record<string, string>;

/** Valeurs initiales d'un type (switch = "false", select = première option). */
export function defaultValuesFor(type: QrType): QrValues {
  const values: QrValues = {};
  for (const field of type.fields) {
    if (field.type === "switch") values[field.name] = "false";
    else if (field.type === "select") values[field.name] = field.options?.[0]?.value ?? "";
    else values[field.name] = "";
  }
  return values;
}

/** Premier champ manquant obligatoire, ou `null` si le formulaire est complet. */
export function firstMissingField(type: QrType, values: QrValues): QrField | null {
  for (const field of type.fields) {
    if (!field.required) continue;
    if (!values[field.name]?.trim()) return field;
  }
  return null;
}

/** Complétion du formulaire, en pourcentage (0–100). */
export function formProgress(type: QrType, values: QrValues): number {
  const required = type.fields.filter((field) => field.required);
  if (required.length === 0) return 100;
  const filled = required.filter((field) => values[field.name]?.trim()).length;
  return Math.round((filled / required.length) * 100);
}

export const QR_TYPE_DEFAULT = "url";

const SAMPLE_BY_NAME: Record<string, string> = {
  url: "https://studio-qr.local/carte",
  title: "Studio Créatif",
  subtitle: "Design & digital",
  content: "Merci d'avoir scanné ce code — retrouvez-nous en boutique.",
  to: "bonjour@studio-qr.local",
  subject: "Demande d'information",
  body: "Bonjour, je souhaite un devis pour 500 cartes.",
  number: "+33612345678",
  message: "Bonjour, je suis intéressé par votre offre.",
  ssid: "Studio-Guest",
  password: "bienvenue2026",
  firstName: "Camille",
  lastName: "Rivière",
  company: "Studio Créatif",
  jobTitle: "Directrice artistique",
  phone: "+33240123456",
  email: "camille@studio-qr.local",
  website: "https://studio-qr.local",
  address: "12 rue des Artisans, 44000 Nantes",
  note: "Disponible du lundi au vendredi.",
  bio: "Studio de design spécialisé en identité visuelle et supports imprimés.",
  ctaLabel: "Nous contacter",
  ctaUrl: "https://studio-qr.local/contact",
  items: "Entrées | Burrata & tomates | 9 €\nPlats | Risotto aux champignons | 16 €\nDesserts | Tarte citron meringuée | 7 €",
  name: "Studio Créatif",
  category: "Design graphique",
  hours: "Lun–Ven · 9h–18h",
  description: "Atelier ouvert sur rendez-vous, impression et signalétique sur mesure.",
  allergens: "Gluten, lactose, fruits à coque",
  certifications: "Bio, Écocert",
  code: "STUDIO20",
  terms: "Valable une fois par personne, jusqu'au 31/12.",
  location: "Le Lieu Unique, Nantes",
  startDate: "2026-11-14",
  startTime: "19:30",
  question: "Recommanderiez-vous notre atelier ?",
  links: "Boutique | https://studio-qr.local/boutique\nNewsletter | https://studio-qr.local/newsletter",
  instagram: "https://instagram.com/studio",
  facebook: "https://facebook.com/studio",
  x: "https://x.com/studio",
  linkedin: "https://linkedin.com/company/studio",
  tiktok: "https://tiktok.com/@studio",
  caption: "Nouvelle collection — automne 2026",
  price: "24,90 €",
  artist: "Studio Sessions",
  actionLabel: "Télécharger le catalogue",
  scale: "stars",
  format: "json",
  data: '{"atelier":"A-1029","lot":"2026-04"}',
  iosUrl: "https://apps.apple.com/app/id123456789",
  androidUrl: "https://play.google.com/store/apps/details?id=local.studio",
  fallbackUrl: "https://studio-qr.local/app",
};

/** Remplit le formulaire avec un jeu d'exemple réaliste (démonstration rapide). */
export function sampleValuesFor(type: QrType): QrValues {
  const values = defaultValuesFor(type);
  for (const field of type.fields) {
    if (field.type === "switch") continue;
    const sample = SAMPLE_BY_NAME[field.name];
    if (sample) values[field.name] = sample;
    else if (field.type === "date") values[field.name] = "2026-11-14";
    else if (field.type === "time") values[field.name] = "19:30";
    else if (field.type === "select") values[field.name] = field.options?.[0]?.value ?? "";
    else if (field.type === "file") values[field.name] = "";
    else values[field.name] = `${type.label} — exemple`;
  }
  return values;
}
