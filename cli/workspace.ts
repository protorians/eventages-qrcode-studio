/**
 * Espace de travail headless : un dossier avec un fichier JSON par projet
 * (`<slug>.json`), même modèle que le store de l'application
 * (`builder-store.tsx`). Les fichiers média restent en data URLs, comme dans
 * le registre localStorage ; l'export/import `.qcp` passe par `src/lib/qcp.ts`
 * pour rester compatible avec l'app desktop.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { unzipSync } from "fflate";
import {
  DEFAULT_DESIGN,
  MOCKUPS_BY_ID,
  type QrDesign,
} from "@/lib/qr-design";
import {
  getQrType,
  QR_TYPES_BY_ID,
  type QrValues,
} from "@/lib/qr-catalog";
import { sanitizeFileName } from "@/lib/qr-svg";
import { applyQcpManifest, buildQcpManifest } from "@/lib/qcp";
import { CliError } from "./args";

const PROJECT_FORMAT = "qrs-project";

/** Limite identique au backend Rust (qcp.rs). */
const MAX_ASSETS = 64;

export type ProjectFile = {
  format: typeof PROJECT_FORMAT;
  version: 1;
  app: "Eventages Lite";
  id: string;
  name: string;
  typeId: string;
  valuesByType: Record<string, QrValues>;
  design: QrDesign;
  mockupId: string;
  saveSize: number;
  createdAt: number;
  updatedAt: number;
};

export function createProjectFile(input: {
  name: string;
  typeId: string;
  valuesByType: Record<string, QrValues>;
  design: QrDesign;
  mockupId: string;
  saveSize: number;
}): ProjectFile {
  const now = Date.now();
  return {
    format: PROJECT_FORMAT,
    version: 1,
    app: "Eventages Lite",
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    ...input,
  };
}

/** Dossier d'espace de travail : `--dir` > `QRS_STUDIO_DIR` > `./studio`. */
export function workspaceDir(explicit?: string | null): string {
  const dir = explicit ?? process.env.QRS_STUDIO_DIR ?? "./studio";
  return resolve(dir);
}

export function ensureWorkspace(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

export function projectFilePath(dir: string, name: string): string {
  return join(dir, `${sanitizeFileName(name)}.json`);
}

/** Écrit le projet sur disque et renvoie le chemin utilisé. */
export function saveProject(dir: string, project: ProjectFile): string {
  ensureWorkspace(dir);
  const path = projectFilePath(dir, project.name);
  writeFileSync(path, `${JSON.stringify(project, null, 2)}\n`);
  return path;
}

export function deleteProjectFile(dir: string, project: ProjectFile): string {
  const path = projectFilePath(dir, project.name);
  rmSync(path, { force: true });
  return path;
}

/** Projets valides du dossier, du plus récemment modifié au plus ancien. */
export function listProjects(dir: string): ProjectFile[] {
  if (!existsSync(dir)) return [];
  const projects: ProjectFile[] = [];
  for (const entry of readdirSync(dir)) {
    if (!entry.endsWith(".json")) continue;
    try {
      const parsed = JSON.parse(readFileSync(join(dir, entry), "utf8")) as Partial<ProjectFile>;
      if (parsed?.format === PROJECT_FORMAT && parsed?.id) {
        projects.push({ ...parsed, design: { ...DEFAULT_DESIGN, ...parsed.design } } as ProjectFile);
      }
    } catch {
      // Un fichier étranger au registre est ignoré, jamais renommé.
    }
  }
  return projects.sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Résout un projet par nom exact, nom de fichier (slug) ou id (préfixe
 * accepté) — pratique dans les scripts.
 */
export function resolveProject(dir: string, ref: string): ProjectFile {
  const projects = listProjects(dir);
  const byName = projects.find((project) => project.name === ref);
  if (byName) return byName;
  const slug = `${sanitizeFileName(ref)}.json`;
  const bySlug = projects.find((project) => basename(projectFilePath(dir, project.name)) === slug);
  if (bySlug) return bySlug;
  const byId = projects.find(
    (project) => project.id === ref || (ref.length >= 4 && project.id.startsWith(ref)),
  );
  if (byId) return byId;
  const names = projects.map((project) => project.name).join(", ") || "aucun";
  throw new CliError(`Projet introuvable : « ${ref} ».\nProjets existants : ${names}.`);
}

/** Un nom de projet = un fichier : refuse un slug déjà pris. */
export function assertNameFree(dir: string, name: string): void {
  if (existsSync(projectFilePath(dir, name))) {
    throw new CliError(
      `Un projet occupe déjà le fichier « ${sanitizeFileName(name)}.json » ; choisissez un autre nom.`,
    );
  }
}

const MIME_BY_EXTENSION: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
  gif: "image/gif",
  bmp: "image/bmp",
  tiff: "image/tiff",
  ico: "image/x-icon",
  pdf: "application/pdf",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  ogg: "audio/ogg",
};

/** Lit un fichier média local et le renvoie en data URL. */
export function fileToDataUrl(path: string): string {
  let bytes: Buffer;
  try {
    bytes = readFileSync(path);
  } catch {
    throw new CliError(`Fichier média illisible : ${path}`);
  }
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  const mime = MIME_BY_EXTENSION[extension];
  if (!mime) {
    throw new CliError(
      `Extension non prise en charge pour « ${path} » (autorisées : ${Object.keys(
        MIME_BY_EXTENSION,
      ).join(", ")}).`,
    );
  }
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

/**
 * Exporte un projet vers l'archive `.qcp` de l'application desktop
 * (`manifest.json` + actifs, même structure que le backend Rust).
 */
export function readProjectAsQcp(project: ProjectFile): {
  manifest: string;
  assets: { path: string; dataBase64: string }[];
} {
  return buildQcpManifest({
    name: project.name,
    typeId: project.typeId,
    valuesByType: project.valuesByType,
    design: project.design,
    mockupId: project.mockupId,
    saveSize: project.saveSize,
  });
}

/** Chemin d'actif accepté par le backend Rust : `assets/<nom>` à plat. */
function isSafeAssetPath(path: string): boolean {
  const name = path.slice("assets/".length);
  return (
    path.startsWith("assets/") &&
    name.length > 0 &&
    !name.includes("/") &&
    !name.includes("\\") &&
    !name.includes("..") &&
    !name.startsWith(".")
  );
}

/** Lit une archive `.qcp` et reconstruit un projet complet avec ses médias. */
export function writeQcpAsProject(path: string, nameOverride?: string): ProjectFile {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(new Uint8Array(readFileSync(path)));
  } catch {
    throw new CliError("Ce fichier n'est pas une archive projet (.qcp) lisible.");
  }

  const manifestBytes = files["manifest.json"];
  if (!manifestBytes) {
    throw new CliError("Archive projet invalide : manifest.json est manquant.");
  }

  const assets = Object.entries(files)
    .filter(([entryPath]) => isSafeAssetPath(entryPath))
    .map(([entryPath, data]) => ({ path: entryPath, dataBase64: Buffer.from(data).toString("base64") }));

  if (assets.length > MAX_ASSETS) {
    throw new CliError(`Trop de fichiers média (${assets.length}) : la limite est de ${MAX_ASSETS}.`);
  }

  const data = applyQcpManifest({ manifest: Buffer.from(manifestBytes).toString("utf8"), assets });
  return createProjectFile({
    name: nameOverride?.trim() ? nameOverride : data.name,
    typeId: data.typeId,
    valuesByType: data.valuesByType,
    design: data.design,
    mockupId: data.mockupId,
    saveSize: data.saveSize,
  });
}

/** Remplit un champ média du contenu depuis un fichier local (data URL). */
export function assignFileValue(values: QrValues, field: string, path: string): QrValues {
  return { ...values, [field]: fileToDataUrl(path) };
}

/** Actifs `.qcp` décodés en bytes, prêts à être écrits dans une archive zip. */
export function qcpAssetBytes(
  assets: { path: string; dataBase64: string }[],
): Record<string, Uint8Array> {
  const entries: Record<string, Uint8Array> = {};
  for (const asset of assets) {
    const bytes = Buffer.from(asset.dataBase64, "base64");
    if (bytes.length === 0) continue;
    entries[asset.path] = new Uint8Array(bytes);
  }
  return entries;
}

/** Routage de secours d'un type inconnu (même garde-fou que l'interface). */
export function knownType(typeId: string | undefined): string {
  if (typeId && !QR_TYPES_BY_ID[typeId]) {
    throw new CliError(
      `Type de QR inconnu : « ${typeId} ».\nTypes valides : ${Object.keys(QR_TYPES_BY_ID).join(", ")}.`,
    );
  }
  return typeId && QR_TYPES_BY_ID[typeId] ? typeId : getQrType("").id;
}

export function knownMockup(mockupId: string | undefined): string {
  if (mockupId === undefined) return "plain";
  if (!MOCKUPS_BY_ID[mockupId]) {
    throw new CliError(
      `Mockup inconnu : « ${mockupId} ».\nMockups valides : ${Object.keys(MOCKUPS_BY_ID).join(", ")}.`,
    );
  }
  return mockupId;
}

export function knownSaveSize(size: number | undefined): number {
  const value = size ?? 1024;
  if (!Number.isInteger(value) || value < 64 || value > 16384) {
    throw new CliError(`--size attend un entier entre 64 et 16384 px, reçu : ${value}.`);
  }
  return value;
}
