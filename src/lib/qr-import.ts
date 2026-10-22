/**
 * Reconstruction du contenu depuis un QR ou un code-barres existant : le
 * payload décodé par le backend Rust est analysé pour pré-remplir le bon type
 * de projet (URL, Wi-Fi, email, SMS, code-barres…), avec repli sur « Texte ».
 * Ce module définit aussi le séquencement de la progression affichée pendant
 * la conversion image → projet.
 */

import type { ErrorCorrectionLevel } from "qr-code-styling";
import type { QrValues } from "@/lib/qr-catalog";
import {
  CORNER_SQUARE_STYLES,
  DEFAULT_DESIGN,
  DOT_STYLES,
  FRAMES,
  type QrDesign,
} from "@/lib/qr-design";
import { translate } from "@/lib/i18n";

export type ImportedContent = { typeId: string; values: QrValues };

/** Filtre de boîte de dialogue natif pour les images / SVG / PDF contenant un code. */
export const QR_SOURCE_FILTERS = [
  {
    name: translate("importLib.filtreSource"),
    extensions: ["png", "jpg", "jpeg", "webp", "gif", "bmp", "svg", "pdf"],
  },
];

// ---------------------------------------------------------------------------
// Progression de la conversion image → projet
// ---------------------------------------------------------------------------

/** Étapes de la conversion, affichées dans le panneau d'import. */
export type ImportStage = "open" | "decode" | "content" | "create";

/** Progression globale de la conversion (pourcentage 0-100). */
export type ImportProgressStep = { stage: ImportStage; percent: number };

/** Rappel de progression vers l'interface. */
export type ImportProgressCallback = (step: ImportProgressStep) => void;

/** Progression brute poussée par le backend Rust (étape locale, 0-100). */
export type BackendImportProgress = { stage: "read" | "decode"; percent: number };

/**
 * Convertit la progression locale du backend en progression globale :
 * lecture 0→8 %, décodage 8→84 %, puis l'interface complète 88/94/100.
 */
export function backendToOverall(raw: BackendImportProgress): ImportProgressStep {
  if (raw.stage === "read") {
    return { stage: "open", percent: Math.round(raw.percent * 0.08) };
  }
  return { stage: "decode", percent: Math.round(8 + raw.percent * 0.76) };
}

/** Échec d'import volontairement annulé (onglet fermé) : à ignorer en silence. */
export class ImportCancelled extends Error {
  constructor() {
    super(translate("importLib.annule"));
    this.name = "ImportCancelled";
  }
}

// ---------------------------------------------------------------------------
// Formats détectés par le lecteur Rust
// ---------------------------------------------------------------------------

/** Symbologies 1D connues du lecteur (nomenclature ZXing/rxing). */
const ONE_D_FORMATS = new Set([
  "EAN_13",
  "EAN_8",
  "UPC_A",
  "UPC_E",
  "CODE_39",
  "CODE_93",
  "CODE_128",
  "ITF",
  "CODABAR",
  "TELEPEN",
  "RSS_14",
  "RSS_EXPANDED",
]);

/** Format ZXing → identifiant de symbologie JsBarcode de l'application. */
const RXING_TO_SYMBOLOGY: Record<string, string> = {
  EAN_13: "EAN13",
  EAN_8: "EAN8",
  UPC_A: "UPC",
  UPC_E: "UPCE",
  CODE_128: "CODE128",
  CODE_39: "CODE39",
  CODE_93: "CODE93",
  ITF: "ITF",
  CODABAR: "codabar",
};

/** Vrai si le format détecté est un code-barres 1D (et non un code 2D). */
export function isBarcode1DFormat(codeFormat?: string | null): boolean {
  return !!codeFormat && ONE_D_FORMATS.has(codeFormat);
}

/** Déduit le type de projet et les valeurs initiales d'un payload décodé. */
export function contentFromPayload(
  payload: string,
  codeFormat?: string | null,
): ImportedContent {
  const value = payload.trim();
  if (!value) return { typeId: "text", values: { content: "" } };

  // Code-barres 1D : la valeur brute est la donnée de la symbologie — pas un
  // payload typé à analyser. ITF de 14 chiffres est un ITF-14.
  if (isBarcode1DFormat(codeFormat)) {
    const symbology = codeFormat ? RXING_TO_SYMBOLOGY[codeFormat] : undefined;
    if (symbology === "ITF" && /^\d{14}$/.test(value)) {
      return { typeId: "barcode", values: { symbology: "ITF14", data: value } };
    }
    if (symbology) return { typeId: "barcode", values: { symbology, data: value } };
    // 1D sans équivalent JsBarcode (RSS, Telepen…) : analyse texte classique.
  }

  if (/^https?:\/\//i.test(value)) {
    return { typeId: "url", values: { url: value } };
  }
  if (/^wifi:/i.test(value)) {
    return parseWifi(value) ?? textFallback(value);
  }
  if (/^mailto:/i.test(value)) {
    return parseMailto(value) ?? textFallback(value);
  }
  if (/^(smsto|sms):/i.test(value)) {
    return parseSms(value) ?? textFallback(value);
  }
  if (/^tel:/i.test(value)) {
    const number = value.slice(value.indexOf(":") + 1).trim();
    if (number) return { typeId: "sms", values: { number } };
    return textFallback(value);
  }
  if (/^BEGIN:(VCALENDAR|VEVENT)\b/i.test(value)) {
    return parseVEvent(value) ?? textFallback(value);
  }
  return textFallback(value);
}

function textFallback(value: string): ImportedContent {
  return { typeId: "text", values: { content: value } };
}

/** Découpe en respectant les échappements « \; » du format Wi-Fi. */
function splitEscaped(value: string, separator: string): string[] {
  const parts: string[] = [];
  let current = "";
  let escaped = false;
  for (const char of value) {
    if (escaped) {
      current += char;
      escaped = false;
    } else if (char === "\\") {
      current += char;
      escaped = true;
    } else if (char === separator) {
      parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts;
}

function unescapeWifi(value: string): string {
  return value.replace(/\\([;,:\\])/g, "$1");
}

/** « WIFI:T:WPA;S:Mon réseau;P:secret;H:true;; » → type Wi-Fi. */
function parseWifi(value: string): ImportedContent | null {
  const body = value.slice(value.indexOf(":") + 1);
  const values: QrValues = { security: "WPA", hidden: "false" };
  for (const part of splitEscaped(body, ";")) {
    const separator = part.indexOf(":");
    if (separator < 1) continue;
    const key = part.slice(0, separator).trim().toUpperCase();
    const raw = unescapeWifi(part.slice(separator + 1));
    if (key === "S") values.ssid = raw;
    else if (key === "P") values.password = raw;
    else if (key === "T") values.security = normalizeWifiSecurity(raw);
    else if (key === "H") values.hidden = /^(true|1|yes)$/i.test(raw) ? "true" : "false";
  }
  if (!values.ssid?.trim()) return null;
  return { typeId: "wifi", values };
}

function normalizeWifiSecurity(raw: string): string {
  const value = raw.trim().toUpperCase();
  if (value === "WEP") return "WEP";
  if (value === "WPA2" || value === "WPA" || value === "WPA3") return value;
  if (value === "NOPASS" || value === "NONE") return "nopass";
  return "WPA";
}

/** « mailto:contact@exemple.com?subject=Bonjour&body=Salut » → type Email. */
function parseMailto(value: string): ImportedContent | null {
  const rest = value.slice(/^mailto:/i.exec(value)![0].length);
  const [to, query = ""] = rest.split("?");
  if (!to.trim()) return null;
  const values: QrValues = { to: to.trim() };
  if (query) {
    const params = new URLSearchParams(query);
    const subject = params.get("subject");
    const body = params.get("body");
    if (subject) values.subject = subject;
    if (body) values.body = body;
  }
  return { typeId: "email", values };
}

/** « SMSTO:+33612345678:Bonjour » ou « sms:…?body=… » → type SMS. */
function parseSms(value: string): ImportedContent | null {
  const rest = value.slice(value.indexOf(":") + 1);
  const [number, messagePart] = rest.split(/[:?]/);
  const message = value.includes("?")
    ? new URLSearchParams(rest.split("?")[1] ?? "").get("body") ?? ""
    : messagePart ?? "";
  if (!number?.trim()) return null;
  const values: QrValues = { number: number.trim() };
  if (message) values.message = message;
  return { typeId: "sms", values };
}

/** Dé-échappe une valeur TEXT iCalendar (RFC 5545). */
function icalUnescape(value: string): string {
  return value.replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1");
}

/** « 20261114T193000 » → [« 2026-11-14 », « 19:30 »]. */
function splitIcalDateTime(raw: string): [string, string] {
  const match = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?/i.exec(raw.trim());
  if (!match) return ["", ""];
  const date = `${match[1]}-${match[2]}-${match[3]}`;
  const time = match[4] ? `${match[4]}:${match[5]}` : "";
  return [date, time];
}

/** Événement iCalendar (VCALENDAR ou VEVENT seul) → type Événement. */
function parseVEvent(payload: string): ImportedContent | null {
  const values: QrValues = {};
  let inside = false;
  for (const rawLine of payload.split(/\r?\n/)) {
    const row = rawLine.trim();
    if (/^BEGIN:VEVENT$/i.test(row)) {
      inside = true;
      continue;
    }
    if (/^END:VEVENT$/i.test(row)) break;
    if (!inside) continue;
    const separator = row.indexOf(":");
    if (separator < 1) continue;
    const key = row.slice(0, separator).split(";")[0].toUpperCase();
    const raw = row.slice(separator + 1);
    if (key === "SUMMARY") values.title = icalUnescape(raw);
    else if (key === "LOCATION") values.location = icalUnescape(raw);
    else if (key === "DESCRIPTION") values.description = icalUnescape(raw);
    else if (key === "DTSTART") [values.startDate, values.startTime] = splitIcalDateTime(raw);
    else if (key === "DTEND") [values.endDate, values.endTime] = splitIcalDateTime(raw);
  }
  if (!inside || !values.startDate) return null;
  return { typeId: "event", values };
}

// ---------------------------------------------------------------------------
// Conversion du design : de l'image analysée vers les réglages du projet
// ---------------------------------------------------------------------------

/**
 * Indices visuels reconstruits par le backend Rust (voir `import_design.rs`)
 * pendant le décodage : couleurs, formes des angles, logo centré, cadre.
 * Chaque champ est un indice — `null` signifie « non détecté avec assez de
 * confiance ».
 */
export type ImportedDesignHints = {
  dotColor: string | null;
  gradientFrom: string | null;
  gradientTo: string | null;
  gradientRotation: number | null;
  background: string | null;
  transparentBackground: boolean | null;
  cornerSquareColor: string | null;
  cornerDotColor: string | null;
  cornerSquareType: string | null;
  cornerDotType: string | null;
  dotsType: string | null;
  logoPngBase64: string | null;
  logoSize: number | null;
  frameColor: string | null;
  frameId: string | null;
};

/** Sous cette distance canal par canal, deux couleurs sont jugées identiques. */
const COLOR_MERGE_DISTANCE = 30;

/** Écart minimal entre les bornes pour parler de dégradé plutôt d'unie. */
const GRADIENT_MIN_SPREAD = 25;

/** Jeu d'identifiants que le moteur de rendu accepte pour l'œil central. */
const CORNER_DOT_TYPE_IDS = new Set(["square", "dot"]);

/** Hex « #RRGGBB » depuis un indice brut, ou `null` si invalide. */
export function hexFromImport(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed && /^#[0-9a-fA-F]{6}$/.test(trimmed)
    ? trimmed.toUpperCase()
    : null;
}

function channelSpread(a: string, b: string): number {
  const left = parseInt(a.slice(1), 16);
  const right = parseInt(b.slice(1), 16);
  return Math.max(
    Math.abs((left >> 16) - (right >> 16)),
    Math.abs(((left >> 8) & 255) - ((right >> 8) & 255)),
    Math.abs((left & 255) - (right & 255)),
  );
}

/**
 * Fusionne les indices détectés avec le design par défaut : seuls les
 * aspects reconnus avec assez de confiance sont appliqués, les autres
 * conservent les valeurs de l'application. L'ordre de correction d'erreur
 * détecté par le lecteur reste la référence (sauf logo, voir ci-dessous).
 */
export function designFromHints(
  hints: ImportedDesignHints | null | undefined,
  errorCorrection: ErrorCorrectionLevel,
): QrDesign {
  const design: QrDesign = { ...DEFAULT_DESIGN, errorCorrection };
  if (!hints) return design;

  // Corps : couleur unie ou dégradé (bornes + angle détectés).
  const dotColor = hexFromImport(hints.dotColor);
  const gradientFrom = hexFromImport(hints.gradientFrom);
  const gradientTo = hexFromImport(hints.gradientTo);
  if (dotColor) {
    if (
      gradientFrom &&
      gradientTo &&
      channelSpread(gradientFrom, gradientTo) >= GRADIENT_MIN_SPREAD
    ) {
      design.dotsColorMode = "gradient";
      design.dotsGradientFrom = gradientFrom;
      design.dotsGradientTo = gradientTo;
      if (hints.gradientRotation != null && Number.isFinite(hints.gradientRotation)) {
        design.dotsGradientRotation =
          ((Math.round(hints.gradientRotation) % 360) + 360) % 360;
      }
    } else {
      design.dotsColorMode = "solid";
      design.dotsColor = dotColor;
    }
  }

  // Fond : couleur composite détectée, transparence si l'image en porte.
  const background = hexFromImport(hints.background);
  if (background) design.background = background;
  if (hints.transparentBackground) design.transparentBackground = true;

  // Styles : seuls les identifiants du catalogue sont acceptés.
  if (DOT_STYLES.some((style) => style.id === hints.dotsType)) {
    design.dotsType = hints.dotsType as QrDesign["dotsType"];
  }
  if (CORNER_SQUARE_STYLES.some((style) => style.id === hints.cornerSquareType)) {
    design.cornerSquareType = hints.cornerSquareType as QrDesign["cornerSquareType"];
  }
  if (CORNER_DOT_TYPE_IDS.has(hints.cornerDotType ?? "")) {
    design.cornerDotType = hints.cornerDotType as QrDesign["cornerDotType"];
  }

  // Angles indépendants si une couleur d'œil tranche avec le corps.
  const cornerSquareColor = hexFromImport(hints.cornerSquareColor);
  const cornerDotColor = hexFromImport(hints.cornerDotColor);
  if (dotColor) {
    const squareDiffers =
      cornerSquareColor !== null &&
      channelSpread(cornerSquareColor, dotColor) > COLOR_MERGE_DISTANCE;
    const dotDiffers =
      cornerDotColor !== null &&
      channelSpread(cornerDotColor, dotColor) > COLOR_MERGE_DISTANCE;
    if (squareDiffers || dotDiffers) {
      design.cornersMatchBody = false;
      design.cornerSquareColor = squareDiffers ? cornerSquareColor : dotColor;
      design.cornerDotColor = dotDiffers ? cornerDotColor : design.cornerSquareColor;
    }
  }

  // Logo détecté : image recadrée depuis l'import, taille relative bornée.
  if (hints.logoPngBase64) {
    design.logo = `data:image/png;base64,${hints.logoPngBase64}`;
    if (hints.logoSize != null && Number.isFinite(hints.logoSize)) {
      design.logoSize = Math.min(0.42, Math.max(0.2, hints.logoSize));
    }
    design.hideBackgroundDots = true;
    // Un logo masque des modules : au moins « Élevé » (Q) pour compenser.
    const order: ErrorCorrectionLevel[] = ["L", "M", "Q", "H"];
    if (order.indexOf(design.errorCorrection) < order.indexOf("Q")) {
      design.errorCorrection = "Q";
    }
  }

  // Cadre détecté : préréglage le plus proche, sans texte inventé (l'origine
  // du code peut arborer un libellé que l'analyse ne sait pas lire).
  if (FRAMES.some((frame) => frame.id === hints.frameId)) {
    design.frameId = hints.frameId as QrDesign["frameId"];
    design.frameText = "";
    const frameColor = hexFromImport(hints.frameColor);
    if (frameColor) {
      design.frameColor = frameColor;
      design.frameBackground = background ?? "#ffffff";
    }
  }

  return design;
}
