import type { LucideIcon } from "lucide-react";
import {
  AppWindow,
  Barcode,
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
  Share2,
  ShieldCheck,
  Star,
  Ticket,
  Type,
  Video,
  Wifi,
} from "lucide-react";
import { BARCODE_FORMATS } from "@/lib/barcode";
import { translate } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/dictionaries/en";

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
  label: TranslationKey;
  type: QrFieldType;
  /**
   * Placeholder neutre non traduit (URL, numéro, exemple technique) :
   * rendu tel quel, il ne porte pas de clé.
   */
  placeholder?: string;
  /** Placeholder localisé, rendu via t() ; prioritaire sur `placeholder`. */
  placeholderKey?: TranslationKey;
  /** Aide localisée, rendue via t() ; ignorée si `helpRaw` est présent. */
  help?: TranslationKey;
  /** Aide neutre non traduite (ex. : hint dynamique de symbologie barcode). */
  helpRaw?: string;
  required?: boolean;
  /** Occupe les deux colonnes de la grille de formulaire. */
  wide?: boolean;
  options?: { value: string; label: TranslationKey }[];
  accept?: string;
};

export type QrType = {
  id: string;
  label: TranslationKey;
  tagline: TranslationKey;
  family: QrFamily;
  encoding: QrEncoding;
  icon: LucideIcon;
  /** Teinte d'accent (degrés oklch) utilisée par la vignette. */
  hue: number;
  fields: QrField[];
  /**
   * Type en attente de la publication de pages (spec 009) : il produit une
   * page à héberger et les connecteurs (Netlify, FTP…) ne sont pas encore
   * intégrés. Le type reste visible dans la galerie, marqué « Bientôt », et
   * ne génère pas de QR scannable.
   */
  comingSoon?: boolean;
};

export const QR_FAMILIES: { id: QrFamily; label: TranslationKey }[] = [
  { id: "essentials", label: "catalog.family.essentials.label" },
  { id: "contact", label: "catalog.family.contact.label" },
  { id: "web", label: "catalog.family.web.label" },
  { id: "commerce", label: "catalog.family.commerce.label" },
  { id: "event", label: "catalog.family.event.label" },
  { id: "media", label: "catalog.family.media.label" },
  { id: "advanced", label: "catalog.family.advanced.label" },
];

/** Options du champ security : les `value` restent des identifiants techniques. */
const SECURITY_OPTIONS: { value: string; label: TranslationKey }[] = [
  { value: "WPA", label: "catalog.wifi.security.opt.WPA" },
  { value: "WPA3", label: "catalog.wifi.security.opt.WPA3" },
  { value: "WEP", label: "catalog.wifi.security.opt.WEP" },
  { value: "nopass", label: "catalog.wifi.security.opt.nopass" },
];

/**
 * Catalogue des types de QR codes (spec 001, FR-1/FR-2/FR-4).
 * Chaque type décrit son formulaire de contenu ; le payload est construit
 * dans `qr-payload.ts`.
 */
export const QR_TYPES: QrType[] = [
  {
    id: "url",
    label: "catalog.url.label",
    tagline: "catalog.url.tagline",
    family: "essentials",
    encoding: "direct",
    icon: Link,
    hue: 250,
    fields: [
      {
        name: "url",
        label: "catalog.url.url.label",
        type: "url",
        placeholder: "https://exemple.com",
        required: true,
        wide: true,
        help: "catalog.url.url.help",
      },
    ],
  },
  {
    id: "text",
    label: "catalog.text.label",
    tagline: "catalog.text.tagline",
    family: "essentials",
    encoding: "direct",
    icon: Type,
    hue: 275,
    fields: [
      { name: "title", label: "catalog.text.title.label", type: "text", placeholderKey: "catalog.text.title.placeholder" },
      {
        name: "content",
        label: "catalog.text.content.label",
        type: "textarea",
        placeholderKey: "catalog.text.content.placeholder",
        required: true,
        wide: true,
      },
    ],
  },
  {
    id: "email",
    label: "catalog.email.label",
    tagline: "catalog.email.tagline",
    family: "contact",
    encoding: "direct",
    icon: Mail,
    hue: 220,
    fields: [
      {
        name: "to",
        label: "catalog.email.to.label",
        type: "email",
        placeholder: "bonjour@exemple.com",
        required: true,
      },
      { name: "subject", label: "catalog.email.subject.label", type: "text", placeholderKey: "catalog.email.subject.placeholder" },
      { name: "body", label: "catalog.email.body.label", type: "textarea", wide: true },
    ],
  },
  {
    id: "sms",
    label: "catalog.sms.label",
    tagline: "catalog.sms.tagline",
    family: "contact",
    encoding: "direct",
    icon: MessageSquare,
    hue: 200,
    fields: [
      {
        name: "number",
        label: "catalog.sms.number.label",
        type: "tel",
        placeholder: "+33 6 12 34 56 78",
        required: true,
      },
      { name: "message", label: "catalog.sms.message.label", type: "textarea", wide: true },
    ],
  },
  {
    id: "whatsapp",
    label: "catalog.whatsapp.label",
    tagline: "catalog.whatsapp.tagline",
    family: "contact",
    encoding: "direct",
    icon: MessageCircle,
    hue: 150,
    fields: [
      {
        name: "number",
        label: "catalog.whatsapp.number.label",
        type: "tel",
        placeholder: "+33612345678",
        required: true,
        help: "catalog.whatsapp.number.help",
      },
      { name: "message", label: "catalog.whatsapp.message.label", type: "textarea", wide: true },
    ],
  },
  {
    id: "wifi",
    label: "catalog.wifi.label",
    tagline: "catalog.wifi.tagline",
    family: "essentials",
    encoding: "direct",
    icon: Wifi,
    hue: 190,
    fields: [
      { name: "ssid", label: "catalog.wifi.ssid.label", type: "text", required: true },
      { name: "security", label: "catalog.wifi.security.label", type: "select", options: SECURITY_OPTIONS },
      { name: "password", label: "catalog.wifi.password.label", type: "password" },
      { name: "hidden", label: "catalog.wifi.hidden.label", type: "switch" },
    ],
  },
  {
    id: "vcard",
    label: "catalog.vcard.label",
    tagline: "catalog.vcard.tagline",
    family: "contact",
    encoding: "direct",
    icon: Contact,
    hue: 235,
    fields: [
      { name: "firstName", label: "catalog.vcard.firstName.label", type: "text", required: true },
      { name: "lastName", label: "catalog.vcard.lastName.label", type: "text", required: true },
      { name: "company", label: "catalog.vcard.company.label", type: "text" },
      { name: "jobTitle", label: "catalog.vcard.jobTitle.label", type: "text" },
      { name: "phone", label: "catalog.vcard.phone.label", type: "tel", placeholder: "+33 6 12 34 56 78" },
      { name: "email", label: "catalog.vcard.email.label", type: "email" },
      { name: "website", label: "catalog.vcard.website.label", type: "url" },
      { name: "address", label: "catalog.vcard.address.label", type: "text" },
      { name: "note", label: "catalog.vcard.note.label", type: "textarea", wide: true },
    ],
  },
  {
    id: "vcard-plus",
    label: "catalog.vcard-plus.label",
    tagline: "catalog.vcard-plus.tagline",
    family: "contact",
    encoding: "page",
    comingSoon: true,
    icon: ShieldCheck,
    hue: 245,
    fields: [
      { name: "firstName", label: "catalog.vcard-plus.firstName.label", type: "text", required: true },
      { name: "lastName", label: "catalog.vcard-plus.lastName.label", type: "text", required: true },
      { name: "company", label: "catalog.vcard-plus.company.label", type: "text" },
      { name: "jobTitle", label: "catalog.vcard-plus.jobTitle.label", type: "text" },
      { name: "phone", label: "catalog.vcard-plus.phone.label", type: "tel" },
      { name: "email", label: "catalog.vcard-plus.email.label", type: "email" },
      { name: "bio", label: "catalog.vcard-plus.bio.label", type: "textarea", wide: true },
      { name: "avatar", label: "catalog.vcard-plus.avatar.label", type: "file", accept: "image/*", wide: true },
    ],
  },
  {
    id: "link-list",
    label: "catalog.link-list.label",
    tagline: "catalog.link-list.tagline",
    family: "web",
    encoding: "page",
    comingSoon: true,
    icon: ListTree,
    hue: 265,
    fields: [
      { name: "title", label: "catalog.link-list.title.label", type: "text", required: true },
      { name: "subtitle", label: "catalog.link-list.subtitle.label", type: "text" },
      {
        name: "links",
        label: "catalog.link-list.links.label",
        type: "textarea",
        placeholderKey: "catalog.link-list.links.placeholder",
        help: "catalog.link-list.links.help",
        wide: true,
      },
    ],
  },
  {
    id: "social",
    label: "catalog.social.label",
    tagline: "catalog.social.tagline",
    family: "web",
    encoding: "page",
    comingSoon: true,
    icon: Share2,
    hue: 320,
    fields: [
      { name: "title", label: "catalog.social.title.label", type: "text", placeholderKey: "catalog.social.title.placeholder" },
      { name: "instagram", label: "catalog.social.instagram.label", type: "url" },
      { name: "facebook", label: "catalog.social.facebook.label", type: "url" },
      { name: "x", label: "catalog.social.x.label", type: "url" },
      { name: "linkedin", label: "catalog.social.linkedin.label", type: "url" },
      { name: "tiktok", label: "catalog.social.tiktok.label", type: "url" },
    ],
  },
  {
    id: "landing",
    label: "catalog.landing.label",
    tagline: "catalog.landing.tagline",
    family: "web",
    encoding: "page",
    comingSoon: true,
    icon: LayoutTemplate,
    hue: 285,
    fields: [
      { name: "title", label: "catalog.landing.title.label", type: "text", required: true },
      { name: "subtitle", label: "catalog.landing.subtitle.label", type: "text" },
      { name: "body", label: "catalog.landing.body.label", type: "textarea", wide: true },
      { name: "ctaLabel", label: "catalog.landing.ctaLabel.label", type: "text", placeholderKey: "catalog.landing.ctaLabel.placeholder" },
      { name: "ctaUrl", label: "catalog.landing.ctaUrl.label", type: "url" },
    ],
  },
  {
    id: "menu",
    label: "catalog.menu.label",
    tagline: "catalog.menu.tagline",
    family: "commerce",
    encoding: "page",
    comingSoon: true,
    icon: MenuIcon,
    hue: 30,
    fields: [
      { name: "title", label: "catalog.menu.title.label", type: "text", required: true },
      { name: "subtitle", label: "catalog.menu.subtitle.label", type: "text" },
      {
        name: "items",
        label: "catalog.menu.items.label",
        type: "textarea",
        placeholderKey: "catalog.menu.items.placeholder",
        help: "catalog.menu.items.help",
        wide: true,
      },
    ],
  },
  {
    id: "business",
    label: "catalog.business.label",
    tagline: "catalog.business.tagline",
    family: "commerce",
    encoding: "page",
    comingSoon: true,
    icon: Briefcase,
    hue: 210,
    fields: [
      { name: "name", label: "catalog.business.name.label", type: "text", required: true },
      { name: "category", label: "catalog.business.category.label", type: "text" },
      { name: "address", label: "catalog.business.address.label", type: "text", wide: true },
      { name: "phone", label: "catalog.business.phone.label", type: "tel" },
      { name: "hours", label: "catalog.business.hours.label", type: "text", placeholderKey: "catalog.business.hours.placeholder" },
      { name: "description", label: "catalog.business.description.label", type: "textarea", wide: true },
    ],
  },
  {
    id: "product",
    label: "catalog.product.label",
    tagline: "catalog.product.tagline",
    family: "commerce",
    encoding: "page",
    comingSoon: true,
    icon: Package,
    hue: 45,
    fields: [
      { name: "name", label: "catalog.product.name.label", type: "text", required: true },
      { name: "price", label: "catalog.product.price.label", type: "text", placeholderKey: "catalog.product.price.placeholder" },
      { name: "description", label: "catalog.product.description.label", type: "textarea", wide: true },
      { name: "allergens", label: "catalog.product.allergens.label", type: "text" },
      { name: "certifications", label: "catalog.product.certifications.label", type: "text" },
      { name: "image", label: "catalog.product.image.label", type: "file", accept: "image/*", wide: true },
    ],
  },
  {
    id: "coupon",
    label: "catalog.coupon.label",
    tagline: "catalog.coupon.tagline",
    family: "commerce",
    encoding: "page",
    comingSoon: true,
    icon: Ticket,
    hue: 15,
    fields: [
      { name: "title", label: "catalog.coupon.title.label", type: "text", placeholderKey: "catalog.coupon.title.placeholder", required: true },
      { name: "code", label: "catalog.coupon.code.label", type: "text", placeholder: "STUDIO20" },
      { name: "terms", label: "catalog.coupon.terms.label", type: "textarea", wide: true },
    ],
  },
  {
    id: "event",
    label: "catalog.event.label",
    tagline: "catalog.event.tagline",
    family: "event",
    encoding: "direct",
    icon: CalendarDays,
    hue: 340,
    fields: [
      { name: "title", label: "catalog.event.title.label", type: "text", required: true },
      { name: "location", label: "catalog.event.location.label", type: "text", wide: true },
      {
        name: "startDate",
        label: "catalog.event.startDate.label",
        type: "date",
        required: true,
        help: "catalog.event.startDate.help",
      },
      { name: "startTime", label: "catalog.event.startTime.label", type: "time" },
      {
        name: "endDate",
        label: "catalog.event.endDate.label",
        type: "date",
        help: "catalog.event.endDate.help",
      },
      { name: "endTime", label: "catalog.event.endTime.label", type: "time" },
      { name: "description", label: "catalog.event.description.label", type: "textarea", wide: true },
    ],
  },
  {
    id: "feedback",
    label: "catalog.feedback.label",
    tagline: "catalog.feedback.tagline",
    family: "event",
    encoding: "page",
    comingSoon: true,
    icon: Star,
    hue: 90,
    fields: [
      { name: "title", label: "catalog.feedback.title.label", type: "text", placeholderKey: "catalog.feedback.title.placeholder" },
      { name: "question", label: "catalog.feedback.question.label", type: "text", wide: true },
      {
        name: "scale",
        label: "catalog.feedback.scale.label",
        type: "select",
        options: [
          { value: "stars", label: "catalog.feedback.scale.opt.stars" },
          { value: "nps", label: "catalog.feedback.scale.opt.nps" },
          { value: "emoji", label: "catalog.feedback.scale.opt.emoji" },
        ],
      },
    ],
  },
  {
    id: "pdf",
    label: "catalog.pdf.label",
    tagline: "catalog.pdf.tagline",
    family: "media",
    encoding: "page",
    comingSoon: true,
    icon: FileText,
    hue: 5,
    fields: [
      { name: "title", label: "catalog.pdf.title.label", type: "text", required: true },
      { name: "file", label: "catalog.pdf.file.label", type: "file", accept: "application/pdf", wide: true },
      { name: "actionLabel", label: "catalog.pdf.actionLabel.label", type: "text", placeholderKey: "catalog.pdf.actionLabel.placeholder" },
    ],
  },
  {
    id: "video",
    label: "catalog.video.label",
    tagline: "catalog.video.tagline",
    family: "media",
    encoding: "page",
    comingSoon: true,
    icon: Video,
    hue: 355,
    fields: [
      { name: "title", label: "catalog.video.title.label", type: "text", required: true },
      { name: "url", label: "catalog.video.url.label", type: "url", wide: true },
      { name: "caption", label: "catalog.video.caption.label", type: "text" },
    ],
  },
  {
    id: "images",
    label: "catalog.images.label",
    tagline: "catalog.images.tagline",
    family: "media",
    encoding: "page",
    comingSoon: true,
    icon: Images,
    hue: 300,
    fields: [
      { name: "title", label: "catalog.images.title.label", type: "text", required: true },
      { name: "caption", label: "catalog.images.caption.label", type: "text" },
      { name: "files", label: "catalog.images.files.label", type: "file", accept: "image/*", wide: true },
    ],
  },
  {
    id: "mp3",
    label: "catalog.mp3.label",
    tagline: "catalog.mp3.tagline",
    family: "media",
    encoding: "page",
    comingSoon: true,
    icon: Music,
    hue: 170,
    fields: [
      { name: "title", label: "catalog.mp3.title.label", type: "text", required: true },
      { name: "artist", label: "catalog.mp3.artist.label", type: "text" },
      { name: "file", label: "catalog.mp3.file.label", type: "file", accept: "audio/*", wide: true },
    ],
  },
  {
    id: "playlist",
    label: "catalog.playlist.label",
    tagline: "catalog.playlist.tagline",
    family: "media",
    encoding: "page",
    comingSoon: true,
    icon: ListMusic,
    hue: 130,
    fields: [
      { name: "title", label: "catalog.playlist.title.label", type: "text", required: true },
      { name: "url", label: "catalog.playlist.url.label", type: "url", wide: true },
    ],
  },
  {
    id: "app",
    label: "catalog.app.label",
    tagline: "catalog.app.tagline",
    family: "advanced",
    encoding: "page",
    comingSoon: true,
    icon: AppWindow,
    hue: 260,
    fields: [
      { name: "title", label: "catalog.app.title.label", type: "text", required: true },
      { name: "iosUrl", label: "catalog.app.iosUrl.label", type: "url" },
      { name: "androidUrl", label: "catalog.app.androidUrl.label", type: "url" },
      { name: "fallbackUrl", label: "catalog.app.fallbackUrl.label", type: "url", wide: true },
    ],
  },
  {
    id: "barcode",
    label: "catalog.barcode.label",
    tagline: "catalog.barcode.tagline",
    family: "advanced",
    encoding: "direct",
    icon: Barcode,
    hue: 0,
    fields: [
      {
        name: "symbology",
        label: "catalog.barcode.symbology.label",
        type: "select",
        options: BARCODE_FORMATS.map((format) => ({
          value: format.id,
          // Étiquette technique (nom de norme, identique en fr et en) :
          // le traducteur retombe sur la chaîne brute via son repli.
          label: format.label as TranslationKey,
        })),
        help: "catalog.barcode.symbology.help",
      },
      {
        name: "data",
        label: "catalog.barcode.data.label",
        type: "text",
        placeholder: "400638133393",
        required: true,
        wide: true,
        help: "catalog.barcode.data.help",
      },
    ],
  },
];

export const QR_TYPES_BY_ID: Record<string, QrType> = Object.fromEntries(
  QR_TYPES.map((type) => [type.id, type]),
);

/** Identifiants d'anciens types, migrés silencieusement au chargement. */
const LEGACY_TYPE_IDS: Record<string, string> = {
  // « barcode2d » encodait des données brutes en QR ; remplacé par le
  // code-barres 1D dédié (les valeurs saisies sont conservées).
  barcode2d: "barcode",
};

/** Résout un identifiant de type, alias legacy inclus ; `null` si inconnu. */
export function resolveTypeId(id: string): string | null {
  if (QR_TYPES_BY_ID[id]) return id;
  return LEGACY_TYPE_IDS[id] ?? null;
}

export function getQrType(id: string): QrType {
  return QR_TYPES_BY_ID[resolveTypeId(id) ?? ""] ?? QR_TYPES[0];
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
  endDate: "2026-11-14",
  endTime: "22:00",
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
  symbology: "EAN13",
  data: "400638133393",
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
    else values[field.name] = translate("catalog.sampleValue", { label: translate(type.label) });
  }
  return values;
}
