/**
 * Format de fichier projet « .qcp » : une archive zip créée par le backend
 * Rust contenant un `manifest.json` (tous les paramètres du projet) et un
 * dossier `assets/` avec les fichiers média associés (logo, visuels…).
 *
 * Côté interface, le manifeste est construit depuis l'état du builder : les
 * valeurs média (data URLs) sont extraites dans l'archive et remplacées par
 * des références `assets/*.ext`. À l'ouverture, l'opération inverse recolle
 * les fichiers média sous forme de data URLs, sans changer le modèle du store.
 */

import { getQrType, QR_TYPE_DEFAULT, resolveTypeId, type QrValues } from "@/lib/qr-catalog";
import { DEFAULT_DESIGN, MOCKUPS_BY_ID, type QrDesign } from "@/lib/qr-design";
import { normalizeBarcodeDesign, type BarcodeDesign } from "@/lib/barcode";

/** Échec de lecture d'une archive projet, avec un message prêt à afficher. */
export class QcpError extends Error {}

/** Filtre de boîte de dialogue natif pour les fichiers projet .qcp. */
export const QCP_FILTERS = [{ name: "Projet Eventages Lite", extensions: ["qcp"] }];

/** Référence d'un fichier média embarqué dans l'archive. */
export type QcpAssetRef =
  | { slot: "logo"; path: string; mime: string }
  | { slot: "value"; typeId: string; field: string; path: string; mime: string };

/** Manifeste stocké dans `manifest.json`. */
export type QcpManifest = {
  format: "qcp";
  version: 1;
  app: "qrcode-studio";
  savedAt: number;
  /**
   * Identifiant stable du projet (UUID), inscrit à l'enregistrement. Rouvrir
   * la même archive — même copiée ou déplacée — retrouve ainsi le projet déjà
   * connu et réactive son onglet au lieu d'en créer un doublon. Absent des
   * archives antérieures.
   */
  projectId?: string;
  project: {
    name: string;
    typeId: string;
    valuesByType: Record<string, QrValues>;
    design: QrDesign;
    /** Habillage du code-barres 1D ; absent des archives antérieures. */
    barcode?: BarcodeDesign;
    mockupId: string;
    saveSize: number;
  };
  assets: QcpAssetRef[];
};

/** Fichier média transmis au backend Rust (contenu en base64). */
export type QcpAssetPayload = { path: string; dataBase64: string };

/** Réponse de la commande Rust `open_project_qcp`. */
export type QcpFilePayload = {
  manifest: string;
  assets: { path: string; dataBase64: string }[];
};

/** Données de projet reconstruites depuis un manifeste. */
export type QcpProjectData = {
  /** Identifiant inscrit dans l'archive, ou null si absente (archives anciennes). */
  projectId: string | null;
  name: string;
  typeId: string;
  valuesByType: Record<string, QrValues>;
  design: QrDesign;
  barcode: BarcodeDesign;
  mockupId: string;
  saveSize: number;
};

const DATA_URL_RE = /^data:([^;,]*)((?:;[^;,]*)*),([\s\S]*)$/;

const MIME_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/gif": "gif",
  "image/bmp": "bmp",
  "image/tiff": "tiff",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
  "application/pdf": "pdf",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/ogg": "ogg",
};

function extensionFor(mime: string): string {
  return MIME_EXTENSIONS[mime.toLowerCase()] ?? "bin";
}

function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

/** Décode une data URL en couple mime / base64 (réencode les SVG préréglés). */
export function parseDataUrl(value: string): { mime: string; base64: string } | null {
  const match = DATA_URL_RE.exec(value);
  if (!match) return null;
  const mime = match[1] || "application/octet-stream";
  const isBase64 = match[2].split(";").slice(1).includes("base64");
  if (isBase64) return { mime, base64: match[3] };
  try {
    return { mime, base64: utf8ToBase64(decodeURIComponent(match[3])) };
  } catch {
    return null;
  }
}

/** Reconstitue une data URL depuis un fichier média de l'archive. */
export function base64ToDataUrl(mime: string, base64: string): string {
  return `data:${mime || "application/octet-stream"};base64,${base64}`;
}

/** Message d'erreur affichable pour un échec d'invocation Tauri. */
export function describeError(error: unknown, fallback: string): string {
  if (typeof error === "string") return error;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

type QcpBuildInput = {
  /** Identifiant stable du projet, inscrit dans le manifeste (dédoublonnage). */
  projectId?: string;
  name: string;
  typeId: string;
  valuesByType: Record<string, QrValues>;
  design: QrDesign;
  barcode?: BarcodeDesign;
  mockupId: string;
  saveSize: number;
};

/**
 * Construit le manifeste du projet : les fichiers média (logo et champs
 * fichier) partent dans l'archive et sont remplacés par des références.
 */
export function buildQcpManifest(input: QcpBuildInput): {
  manifest: string;
  assets: QcpAssetPayload[];
} {
  const assets: QcpAssetPayload[] = [];
  const refs: QcpAssetRef[] = [];

  // Design : le logo, s'il s'agit d'un média local, part dans l'archive.
  const design: QrDesign = { ...input.design, logo: null };
  if (input.design.logo?.startsWith("data:")) {
    const parsed = parseDataUrl(input.design.logo);
    if (parsed) {
      const path = `assets/logo.${extensionFor(parsed.mime)}`;
      refs.push({ slot: "logo", path, mime: parsed.mime });
      assets.push({ path, dataBase64: parsed.base64 });
    }
  } else if (input.design.logo) {
    design.logo = input.design.logo;
  }

  // Contenu : chaque champ fichier de chaque type connu part dans l'archive.
  const valuesByType: Record<string, QrValues> = {};
  for (const [typeId, rawValues] of Object.entries(input.valuesByType)) {
    const type = getQrType(typeId);
    const values: QrValues = { ...rawValues };
    for (const field of type.fields) {
      if (field.type !== "file") continue;
      const value = values[field.name] ?? "";
      if (!value.startsWith("data:")) continue;
      const parsed = parseDataUrl(value);
      if (!parsed) {
        values[field.name] = "";
        continue;
      }
      const path = `assets/${typeId}-${field.name}.${extensionFor(parsed.mime)}`;
      refs.push({ slot: "value", typeId, field: field.name, path, mime: parsed.mime });
      assets.push({ path, dataBase64: parsed.base64 });
      values[field.name] = "";
    }
    valuesByType[typeId] = values;
  }

  const manifest: QcpManifest = {
    format: "qcp",
    version: 1,
    app: "qrcode-studio",
    savedAt: Date.now(),
    projectId: input.projectId,
    project: {
      name: input.name,
      typeId: input.typeId,
      valuesByType,
      design,
      barcode: input.barcode,
      mockupId: input.mockupId,
      saveSize: input.saveSize,
    },
    assets: refs,
  };
  return { manifest: JSON.stringify(manifest, null, 2), assets };
}

/**
 * Recolle un manifeste et ses fichiers média en données de projet prêtes à
 * hydrater le store. Lève une `QcpError` si l'archive est invalide.
 */
export function applyQcpManifest({ manifest, assets }: QcpFilePayload): QcpProjectData {
  let parsed: QcpManifest;
  try {
    parsed = JSON.parse(manifest) as QcpManifest;
  } catch {
    throw new QcpError("Fichier projet illisible : manifest.json est corrompu.");
  }
  if (!parsed || parsed.format !== "qcp" || !parsed.project) {
    throw new QcpError("Ce fichier n'est pas un projet Eventages Lite (.qcp).");
  }

  const mediaByPath = new Map(assets.map((asset) => [asset.path, asset.dataBase64]));
  const dataUrlFor = (ref: QcpAssetRef): string | null => {
    const base64 = mediaByPath.get(ref.path);
    return base64 ? base64ToDataUrl(ref.mime, base64) : null;
  };

  const raw = parsed.project;
  const design: QrDesign = { ...DEFAULT_DESIGN, ...raw.design };
  const logoRef = (parsed.assets ?? []).find(
    (ref): ref is Extract<QcpAssetRef, { slot: "logo" }> => ref.slot === "logo",
  );
  if (logoRef) {
    design.logo = dataUrlFor(logoRef);
  } else if (typeof design.logo === "string" && design.logo.startsWith("data:")) {
    // Ancien manifeste : logo déjà en data URL, conservé tel quel.
  } else {
    design.logo = null;
  }

  const valuesByType: Record<string, QrValues> = {};
  for (const [typeId, values] of Object.entries(raw.valuesByType ?? {})) {
    valuesByType[typeId] = { ...values };
  }
  for (const ref of parsed.assets ?? []) {
    if (ref.slot !== "value") continue;
    const values = valuesByType[ref.typeId] ?? {};
    valuesByType[ref.typeId] = {
      ...values,
      [ref.field]: dataUrlFor(ref) ?? "",
    };
  }

  return {
    projectId:
      typeof parsed.projectId === "string" && parsed.projectId.trim()
        ? parsed.projectId
        : null,
    name:
      typeof raw.name === "string" && raw.name.trim() ? raw.name : "Projet importé",
    typeId: resolveTypeId(raw.typeId ?? "") ?? QR_TYPE_DEFAULT,
    valuesByType,
    design,
    barcode: normalizeBarcodeDesign(raw.barcode),
    mockupId: MOCKUPS_BY_ID[raw.mockupId] ? raw.mockupId : "plain",
    saveSize:
      typeof raw.saveSize === "number" && Number.isFinite(raw.saveSize) && raw.saveSize > 0
        ? raw.saveSize
        : 1024,
  };
}
