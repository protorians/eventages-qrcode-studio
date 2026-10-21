#!/usr/bin/env bun
/**
 * `eventages-lite` (alias `evenlite`) — CLI headless d'Eventages Lite.
 *
 * Créer, gérer et composer des projets QR sans interface : projets stockés
 * comme fichiers JSON dans un espace de travail (défaut `./studio`), payloads
 * calculés par les mêmes modules que l'app desktop, composition SVG/PNG
 * headless (`render.ts`) et interchange `.qcp` avec l'app desktop.
 *
 * Usage : `eventages-lite <commande> [args] [--options]` — `eventages-lite help`.
 * En développement, `bun run cli` est équivalent ; les deux noms (`eventages-lite`
 * et `evenlite`) sont installables dans le PATH depuis les paramètres de l'app.
 */

import { existsSync, writeFileSync } from "node:fs";
import pkgJson from "../package.json";
import {
  DEFAULT_DESIGN,
  DESIGN_TEMPLATES,
  FRAMES_BY_ID,
  DOT_STYLES,
  CORNER_SQUARE_STYLES,
  CORNER_DOT_STYLES,
  type QrDesign,
} from "@/lib/qr-design";
import {
  defaultValuesFor,
  firstMissingField,
  formProgress,
  getQrType,
  QR_TYPES,
  QR_TYPES_BY_ID,
  QR_TYPE_DEFAULT,
  type QrField,
  type QrType,
  type QrValues,
} from "@/lib/qr-catalog";
import { buildPayload } from "@/lib/qr-payload";
import { sanitizeFileName } from "@/lib/qr-svg";
import { zipSync } from "fflate";
import {
  CliError,
  flagBool,
  flagList,
  flagNumber,
  flagString,
  parseArgs,
  type ParsedArgs,
} from "./args";
import {
  assertNameFree,
  assignFileValue,
  createProjectFile,
  deleteProjectFile,
  ensureWorkspace,
  fileToDataUrl,
  knownMockup,
  knownSaveSize,
  knownType,
  listProjects,
  projectFilePath,
  qcpAssetBytes,
  readProjectAsQcp,
  resolveProject,
  saveProject,
  workspaceDir,
  writeQcpAsProject,
  type ProjectFile,
} from "./workspace";
import { renderQrPngFile, renderQrSvgFile } from "./render";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function typeById(typeId: string | undefined): QrType {
  const type = QR_TYPES_BY_ID[knownType(typeId)];
  if (!type) {
    throw new CliError(`Type de QR inconnu : « ${typeId} ».`);
  }
  return type;
}

function valuesOf(project: ProjectFile): { type: QrType; values: QrValues } {
  const type = getQrType(project.typeId);
  return { type, values: project.valuesByType[project.typeId] ?? defaultValuesFor(type) };
}

function projectId(): string {
  return crypto.randomUUID();
}

const DESIGN_NUMERIC = new Set([
  "dotsGradientRotation",
  "logoSize",
  "logoMargin",
  "frameTextSize",
  "margin",
]);
const DESIGN_BOOLEAN = new Set(["cornersMatchBody", "transparentBackground", "hideBackgroundDots"]);
const DESIGN_ENUMS: Record<string, () => string[]> = {
  dotsType: () => DOT_STYLES.map((style) => style.id),
  cornerSquareType: () => CORNER_SQUARE_STYLES.map((style) => style.id),
  cornerDotType: () => CORNER_DOT_STYLES.map((style) => style.id),
  frameId: () => Object.keys(FRAMES_BY_ID),
  errorCorrection: () => ["L", "M", "Q", "H"],
  dotsColorMode: () => ["solid", "gradient"],
};

/** Valeur du logo : `null` pour effacer, `data:` tel quel, sinon un fichier. */
function designLogoValue(value: string): string | null {
  if (value === "null" || value === "") return null;
  return value;
}

function applyDesignPatch(design: QrDesign, raw: string): QrDesign {
  const equals = raw.indexOf("=");
  if (equals <= 0) {
    throw new CliError(`--design attend « clé=valeur », reçu : « ${raw} ».`);
  }
  const key = raw.slice(0, equals);
  const value = raw.slice(equals + 1);

  if (!(key in DEFAULT_DESIGN)) {
    throw new CliError(
      `Clé de design inconnue : « ${key} ».\nClés valides : ${Object.keys(DEFAULT_DESIGN).join(", ")}.`,
    );
  }

  if (key === "logo") {
    const resolved = designLogoValue(value);
    return {
      ...design,
      logo:
        resolved === null || resolved.startsWith("data:") ? resolved : fileToDataUrl(resolved),
    };
  }

  if (DESIGN_NUMERIC.has(key)) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      throw new CliError(`--design ${key} attend un nombre, reçu : « ${value} ».`);
    }
    return { ...design, [key]: parsed };
  }

  if (DESIGN_BOOLEAN.has(key)) {
    if (value !== "true" && value !== "false") {
      throw new CliError(`--design ${key} attend true ou false, reçu : « ${value} ».`);
    }
    return { ...design, [key]: value === "true" };
  }

  const allowed = DESIGN_ENUMS[key]?.();
  if (allowed && !allowed.includes(value)) {
    throw new CliError(`--design ${key} attend une valeur parmi : ${allowed.join(", ")}.`);
  }

  return { ...design, [key]: value };
}

/** Découpe une expression `champ=valeur`. */
function splitPatch(raw: string, flagName: string): { key: string; value: string } {
  const equals = raw.indexOf("=");
  if (equals <= 0) {
    throw new CliError(`${flagName} attend « champ=valeur », reçu : « ${raw} ».`);
  }
  return { key: raw.slice(0, equals), value: raw.slice(equals + 1) };
}

function fieldOf(type: QrType, key: string): QrField {
  const field = type.fields.find((candidate) => candidate.name === key);
  if (!field) {
    throw new CliError(
      `Champ inconnu pour le type « ${type.label} » : « ${key} ».\nChamps : ${type.fields
        .map((candidate) => candidate.name)
        .join(", ")}.`,
    );
  }
  return field;
}

/** Valide puis applique `champ=valeur` sur le contenu d'un type. */
function applyValuePatch(type: QrType, values: QrValues, raw: string): QrValues {
  const { key, value } = splitPatch(raw, "--set");
  const field = fieldOf(type, key);
  if (field.type === "select") {
    const options = field.options?.map((option) => option.value) ?? [];
    if (!options.includes(value)) {
      throw new CliError(`--set ${key} attend une valeur parmi : ${options.join(", ")}.`);
    }
  }
  if (field.type === "switch" && value !== "true" && value !== "false") {
    throw new CliError(`--set ${key} attend true ou false (champ de type interrupteur).`);
  }
  if (field.type === "file") {
    throw new CliError(`--set ${key} : utilisez --file ${key}=<fichier> pour un champ média.`);
  }
  return { ...values, [key]: value };
}

/** Applique un objet JSON complet de valeurs (scripting). */
function applyValuesJson(type: QrType, values: QrValues, json: string): QrValues {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new CliError(`--values attend du JSON valide, reçu : ${json.slice(0, 80)}…`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new CliError("--values attend un objet JSON { champ: valeur }.");
  }
  let next = { ...values };
  for (const [key, rawValue] of Object.entries(parsed as Record<string, unknown>)) {
    fieldOf(type, key);
    const value =
      typeof rawValue === "boolean" ? (rawValue ? "true" : "false") : String(rawValue ?? "");
    next = { ...next, [key]: value };
  }
  return next;
}

function applyFilePatch(type: QrType, values: QrValues, raw: string): QrValues {
  const { key, value: path } = splitPatch(raw, "--file");
  fieldOf(type, key);
  return assignFileValue(values, key, path);
}

function applyUnset(type: QrType, values: QrValues, key: string): QrValues {
  const defaults = defaultValuesFor(type);
  fieldOf(type, key);
  return { ...values, [key]: defaults[key] ?? "" };
}

/** Applique tous les drapeaux de contenu/design d'un create/set. */
function applyProjectFlags(
  args: ParsedArgs,
  typeId: string,
  values: QrValues,
  design: QrDesign,
): { typeId: string; values: QrValues; design: QrDesign; mockupId: string; saveSize: number } {
  const type = typeById(typeId);
  let nextValues = { ...values };
  let nextDesign = { ...design };

  const templateId = flagString(args, "template");
  if (templateId !== undefined && templateId.length > 0) {
    const template = DESIGN_TEMPLATES.find((candidate) => candidate.id === templateId);
    if (!template) {
      throw new CliError(
        `Modèle de design inconnu : « ${templateId} ».\nModèles : ${DESIGN_TEMPLATES.map(
          (candidate) => candidate.id,
        ).join(", ")}.`,
      );
    }
    nextDesign = { ...nextDesign, ...template.design };
  }

  const valuesJson = flagString(args, "values");
  if (valuesJson !== undefined) nextValues = applyValuesJson(type, nextValues, valuesJson);

  for (const patch of flagList(args, "set")) {
    nextValues = applyValuePatch(type, nextValues, patch);
  }
  for (const patch of flagList(args, "file")) {
    nextValues = applyFilePatch(type, nextValues, patch);
  }
  for (const key of flagList(args, "unset")) {
    nextValues = applyUnset(type, nextValues, key);
  }
  for (const patch of flagList(args, "design")) {
    nextDesign = applyDesignPatch(nextDesign, patch);
  }

  return {
    typeId: type.id,
    values: nextValues,
    design: nextDesign,
    mockupId: knownMockup(flagString(args, "mockup")),
    saveSize: knownSaveSize(flagNumber(args, "size")),
  };
}

function dateLabel(timestamp: number): string {
  const date = new Date(timestamp);
  const pad = (value: number): string => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function requireProjectRef(args: ParsedArgs, operation: string): string {
  const ref = args.positionals[0];
  if (!ref) {
    throw new CliError(
      `Usage : eventages-lite ${operation} <projet> [options] — voir « eventages-lite help ${operation} ».`,
    );
  }
  return ref;
}

/* ------------------------------------------------------------------ */
/* Commandes                                                           */
/* ------------------------------------------------------------------ */

function commandInit(args: ParsedArgs): void {
  const dir = workspaceDir(flagString(args, "dir"));
  ensureWorkspace(dir);
  console.log(`Espace de travail prêt : ${dir}`);
}

function commandCreate(args: ParsedArgs): void {
  const name = args.positionals[0];
  if (!name) {
    throw new CliError(
      "Usage : eventages-lite create <nom> [--type wifi] [--set ssid=… --set password=…] — voir « eventages-lite help create ».",
    );
  }
  const dir = workspaceDir(flagString(args, "dir"));
  assertNameFree(dir, name);

  const type = typeById(flagString(args, "type", QR_TYPE_DEFAULT));
  const applied = applyProjectFlags(args, type.id, defaultValuesFor(type), { ...DEFAULT_DESIGN });

  const project = createProjectFile({
    name,
    typeId: applied.typeId,
    valuesByType: { [applied.typeId]: applied.values },
    design: applied.design,
    mockupId: applied.mockupId,
    saveSize: applied.saveSize,
  });
  const path = saveProject(dir, project);

  const projectType = getQrType(project.typeId);
  const progress = formProgress(projectType, applied.values);
  console.log(`Projet créé : ${name}`);
  console.log(`  type : ${projectType.label} (${projectType.id}) · complétion ${progress} %`);
  console.log(`  fichier : ${path}`);
  console.log(`  composition : eventages-lite render "${name}"`);
}

function commandList(args: ParsedArgs): void {
  const dir = workspaceDir(flagString(args, "dir"));
  const projects = listProjects(dir);
  if (projects.length === 0) {
    console.log(
      'Aucun projet. Créez-en un avec : eventages-lite create "Mon projet" --type url --set url=https://exemple.com',
    );
    return;
  }

  const rows = projects.map((project) => {
    const type = getQrType(project.typeId);
    const values = project.valuesByType[project.typeId] ?? defaultValuesFor(type);
    return {
      name: project.name,
      type: type.label,
      progress: `${formProgress(type, values)} %`,
      updated: dateLabel(project.updatedAt),
    };
  });

  const nameWidth = Math.max("Nom".length, ...rows.map((row) => row.name.length));
  const typeWidth = Math.max("Type".length, ...rows.map((row) => row.type.length));
  console.log(
    `${"Nom".padEnd(nameWidth)}  ${"Type".padEnd(typeWidth)}  ${"Progrès".padEnd(8)}  Modifié`,
  );
  for (const row of rows) {
    console.log(
      `${row.name.padEnd(nameWidth)}  ${row.type.padEnd(typeWidth)}  ${row.progress.padEnd(8)}  ${row.updated}`,
    );
  }
}

function commandShow(args: ParsedArgs): void {
  const dir = workspaceDir(flagString(args, "dir"));
  const project = resolveProject(dir, requireProjectRef(args, "show"));
  console.log(JSON.stringify(project, null, 2));
}

function commandPayload(args: ParsedArgs): void {
  const dir = workspaceDir(flagString(args, "dir"));
  const project = resolveProject(dir, requireProjectRef(args, "payload"));
  const { type, values } = valuesOf(project);
  const missing = firstMissingField(type, values);
  if (missing) {
    throw new CliError(`Contenu incomplet : le champ « ${missing.label} » est requis.`);
  }
  const payload = buildPayload(type, values);
  if (!payload.trim()) {
    throw new CliError("Le payload encodé est vide : complétez le contenu du projet.");
  }
  console.log(payload);
}

function commandSet(args: ParsedArgs): void {
  const dir = workspaceDir(flagString(args, "dir"));
  const project = resolveProject(dir, requireProjectRef(args, "set"));
  const { type, values } = valuesOf(project);

  let nextTypeId = type.id;
  const nextType = flagString(args, "type");
  if (nextType !== undefined && nextType !== project.typeId) {
    const switched = typeById(nextType);
    nextTypeId = switched.id;
    project.valuesByType[nextTypeId] ??= defaultValuesFor(switched);
  }

  const applied = applyProjectFlags(
    args,
    nextTypeId,
    project.valuesByType[nextTypeId] ?? values,
    project.design,
  );

  const originalName = project.name;
  const nextName = flagString(args, "rename") ?? originalName;
  if (nextName !== originalName) assertNameFree(dir, nextName);

  const updated: ProjectFile = {
    ...project,
    name: nextName,
    typeId: applied.typeId,
    valuesByType: { ...project.valuesByType, [applied.typeId]: applied.values },
    design: applied.design,
    mockupId: applied.mockupId,
    saveSize: applied.saveSize,
    updatedAt: Date.now(),
  };
  const path = saveProject(dir, updated);

  // Renommage : purge l'ancien fichier si le slug a changé.
  const previousPath = projectFilePath(dir, originalName);
  if (previousPath !== path && existsSync(previousPath)) {
    deleteProjectFile(dir, { ...project, name: originalName });
  }
  console.log(`Projet mis à jour : ${updated.name} (${path})`);
}

function commandDuplicate(args: ParsedArgs): void {
  const dir = workspaceDir(flagString(args, "dir"));
  const project = resolveProject(dir, requireProjectRef(args, "duplicate"));
  const requested = args.positionals[1];

  let name = requested ?? `${project.name} (copie)`;
  if (requested !== undefined) {
    assertNameFree(dir, name);
  } else {
    const taken = new Set(listProjects(dir).map((other) => sanitizeFileName(other.name)));
    let index = 2;
    while (taken.has(sanitizeFileName(name))) {
      name = `${project.name} (copie ${index})`;
      index += 1;
    }
  }

  const copy: ProjectFile = {
    ...project,
    id: projectId(),
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const path = saveProject(dir, copy);
  console.log(`Projet dupliqué : ${project.name} → ${name}\n  fichier : ${path}`);
}

function commandDelete(args: ParsedArgs): void {
  const dir = workspaceDir(flagString(args, "dir"));
  const project = resolveProject(dir, requireProjectRef(args, "delete"));
  const path = deleteProjectFile(dir, project);
  console.log(`Projet supprimé : ${project.name} (${path})`);
}

function commandTypes(args: ParsedArgs): void {
  const typeId = args.positionals[0];
  if (typeId === undefined || typeId === "") {
    console.log(`${"Id".padEnd(14)}${"Label".padEnd(16)}Mode     Description`);
    console.log("─".repeat(72));
    for (const type of QR_TYPES) {
      console.log(`${type.id.padEnd(14)}${type.label.padEnd(16)}${type.encoding.padEnd(9)}${type.tagline}`);
    }
    console.log("\nDétail des champs     : eventages-lite types <type>");
    console.log("Clés de design        : eventages-lite help design");
    return;
  }

  const type = typeById(typeId);
  console.log(`${type.label} (${type.id}) — ${type.tagline}`);
  console.log(
    `Encodage : ${
      type.encoding === "direct" ? "direct dans le QR" : "page autonome (publication à venir)"
    }`,
  );
  console.log("\nChamps :");
  for (const field of type.fields) {
    const required = field.required ? " [requis]" : "";
    const options = field.options?.map((option) => option.value).join("|");
    console.log(
      `  ${field.name.padEnd(14)}${field.type.padEnd(10)}${field.label}${required}${
        options ? ` (${options})` : ""
      }`,
    );
  }
}

async function commandRender(args: ParsedArgs): Promise<void> {
  const dir = workspaceDir(flagString(args, "dir"));
  const project = resolveProject(dir, requireProjectRef(args, "render"));
  const { type, values } = valuesOf(project);

  const missing = firstMissingField(type, values);
  if (missing) {
    throw new CliError(
      `Contenu incomplet : le champ « ${missing.label} » est requis avant de composer le QR.`,
    );
  }
  const payload = buildPayload(type, values);
  if (!payload.trim()) {
    throw new CliError("Le payload encodé est vide : complétez le contenu du projet.");
  }

  let design = project.design;
  if (flagBool(args, "no-frame")) design = { ...design, frameId: "none" };
  const qrSize = knownSaveSize(flagNumber(args, "size", project.saveSize));

  const declared = flagString(args, "format");
  if (declared !== undefined && declared !== "svg" && declared !== "png") {
    throw new CliError(`--format attend svg ou png, reçu : « ${declared} ».`);
  }
  const output = flagString(args, "output");
  const inferred = output?.toLowerCase().endsWith(".png")
    ? "png"
    : output?.toLowerCase().endsWith(".svg")
      ? "svg"
      : undefined;
  const format = declared ?? inferred ?? "svg";
  const target = output ?? `${sanitizeFileName(project.name)}.${format}`;
  const finalPath = target.toLowerCase().endsWith(`.${format}`) ? target : `${target}.${format}`;

  if (format === "png") {
    const rendered = await renderQrPngFile(design, payload, qrSize);
    writeFileSync(finalPath, rendered.png);
    console.log(
      `Écrit : ${finalPath} (${rendered.width}×${rendered.height} px, ${humanSize(
        rendered.png.length,
      )})`,
    );
    return;
  }

  const rendered = renderQrSvgFile(design, payload, qrSize);
  writeFileSync(finalPath, rendered.svg);
  console.log(
    `Écrit : ${finalPath} (${rendered.width}×${rendered.height} px, ${humanSize(
      Buffer.byteLength(rendered.svg),
    )})`,
  );
}

function commandPack(args: ParsedArgs): void {
  const dir = workspaceDir(flagString(args, "dir"));
  const project = resolveProject(dir, requireProjectRef(args, "pack"));
  const { manifest, assets } = readProjectAsQcp(project);
  if (assets.length > 64) {
    throw new CliError(`Trop de fichiers média (${assets.length}) : la limite est de 64.`);
  }

  let target = flagString(args, "output") ?? `${sanitizeFileName(project.name)}.qcp`;
  if (!target.toLowerCase().endsWith(".qcp")) target += ".qcp";

  const archive = zipSync({
    "manifest.json": Buffer.from(manifest, "utf8"),
    ...qcpAssetBytes(assets),
  });
  writeFileSync(target, archive);
  console.log(`Écrit : ${target} (${humanSize(archive.length)})`);
}

function commandImport(args: ParsedArgs): void {
  const source = args.positionals[0];
  if (!source) {
    throw new CliError(
      "Usage : eventages-lite import <fichier.qcp> [--as <nom>] — voir « eventages-lite help import ».",
    );
  }
  const dir = workspaceDir(flagString(args, "dir"));

  const parsed = writeQcpAsProject(source);
  const name = flagString(args, "as") ?? parsed.name;
  assertNameFree(dir, name);

  const project: ProjectFile =
    name === parsed.name
      ? parsed
      : createProjectFile({
          name,
          typeId: parsed.typeId,
          valuesByType: parsed.valuesByType,
          design: parsed.design,
          mockupId: parsed.mockupId,
          saveSize: parsed.saveSize,
        });
  const path = saveProject(dir, project);
  const type = getQrType(project.typeId);
  console.log(`Projet importé : ${name} (${type.label})\n  fichier : ${path}`);
}

/* ------------------------------------------------------------------ */
/* Aide                                                                */
/* ------------------------------------------------------------------ */

const COMMAND_HELP: Record<string, string> = {
  init: "Prépare le dossier d'espace de travail (défaut : ./studio, ou EVENTAGES_LITE_DIR / --dir).\n\n  eventages-lite init [--dir <chemin>]",
  create:
    "Crée un projet dans l'espace de travail.\n\n" +
    "  eventages-lite create <nom> [--type <id>] [--set champ=valeur]… [--file champ=fichier]…\n" +
    "              [--values '{json}'] [--template <id>] [--design clé=valeur]…\n" +
    "              [--mockup <id>] [--size <px>]\n\n" +
    'Exemples :\n  eventages-lite create "Wi-Fi invité" --type wifi --set ssid=Invité --set password=bienvenue --template mint\n  eventages-lite create "Mon site" --set url=https://exemple.com',
  list: "Liste les projets du dossier, du plus récent au plus ancien.\n\n  eventages-lite list [--dir <chemin>]",
  show: "Affiche le JSON complet d'un projet (nom exact, slug ou préfixe d'id).\n\n  eventages-lite show <projet>",
  payload: "Affiche la chaîne encodée dans le QR (utile pour vérifier le contenu).\n\n  eventages-lite payload <projet>",
  set:
    "Modifie un projet : contenu, design, type, mockup, taille, nom.\n\n" +
    "  eventages-lite set <projet> [--type <id>] [--set champ=valeur]… [--unset champ]…\n" +
    "             [--file champ=fichier]… [--values '{json}'] [--template <id>]\n" +
    "             [--design clé=valeur]… [--rename <nom>]",
  duplicate: "Duplique un projet (nom automatique « X (copie) » si non précisé).\n\n  eventages-lite duplicate <projet> [nouveau-nom]",
  delete: "Supprime un projet de l'espace de travail (définitif).\n\n  eventages-lite delete <projet>",
  render:
    "Compose le QR final : SVG toujours, PNG via @resvg/resvg-js.\n\n" +
    "  eventages-lite render <projet> [-o <fichier>] [--format svg|png] [--size <px>] [--no-frame]\n\n" +
    'Exemples :\n  eventages-lite render "Wi-Fi invité" -o affiche.png --size 2048\n  eventages-lite render "Menu" --no-frame --format svg',
  pack: "Exporte le projet en archive .qcp, lisible par l'app desktop.\n\n  eventages-lite pack <projet> [-o <fichier.qcp>]",
  import: "Importe une archive .qcp dans l'espace de travail.\n\n  eventages-lite import <fichier.qcp> [--as <nom>]",
  types: "Liste les types de QR, ou détaille les champs d'un type.\n\n  eventages-lite types [type]",
  design:
    "Clés acceptées par --design (et leur forme de valeur) :\n\n" +
    "  dotsType              sq | rounded | extra-rounded | dots | classy | classy-rounded\n" +
    "  dotsColorMode         solid | gradient\n" +
    "  dotsColor             couleur (#rrggbb)\n" +
    "  dotsGradientFrom / To couleur (#rrggbb)\n" +
    "  dotsGradientRotation  nombre (degrés)\n" +
    "  cornersMatchBody      true | false\n" +
    "  cornerSquareType      square | extra-rounded | dot | rounded | classy\n" +
    "  cornerDotType         square | dot | rounded | extra-rounded\n" +
    "  cornerSquareColor / cornerDotColor couleur\n" +
    "  background            couleur (#rrggbb)\n" +
    "  transparentBackground true | false\n" +
    "  logo                  null | data URL | chemin de fichier local\n" +
    "  logoSize              nombre (0–1, proportion du QR)\n" +
    "  logoMargin            nombre (px)\n" +
    "  hideBackgroundDots    true | false\n" +
    "  frameId               " +
    Object.keys(FRAMES_BY_ID).join(" | ") +
    "\n" +
    "  frameText             texte du cadre\n" +
    "  frameColor / frameTextColor / frameBackground  couleur\n" +
    "  frameTextSize         nombre (px)\n" +
    "  errorCorrection       L | M | Q | H\n" +
    "  margin                nombre (marge de silence, en px à 280)\n\n" +
    "Modèles prêts : " +
    DESIGN_TEMPLATES.map((template) => template.id).join(", "),
};

const HELP_TEXT = `eventages-lite — Eventages Lite en ligne de commande (headless)
Alias : evenlite (les deux noms sont interchangeables).

Espace de travail : un dossier contenant un fichier .json par projet.
Défaut : ./studio — substituable par EVENTAGES_LITE_DIR ou l'option --dir <chemin>.

Commandes :
  init                 Préparer l'espace de travail
  types [type]         Catalogue des types de QR (détail avec un id)
  create <nom>         Créer un projet (--type, --set, --file, --template, --design…)
  list                 Lister les projets
  show <projet>        Afficher le JSON complet d'un projet
  payload <projet>     Afficher la chaîne encodée dans le QR
  set <projet>         Modifier contenu / design / type / nom
  duplicate <projet>   Dupliquer un projet
  delete <projet>      Supprimer un projet
  render <projet>      Composer le QR en SVG ou PNG (cadre et logo inclus)
  pack <projet>        Exporter vers l'archive .qcp de l'app desktop
  import <fichier.qcp> Importer une archive .qcp

Options globales :
  --dir <chemin>       Espace de travail cible (sinon EVENTAGES_LITE_DIR, sinon ./studio)

Détail d'une commande : eventages-lite help <commande>
Version : ${pkgJson.version}`;

function printMainHelp(): void {
  console.log(HELP_TEXT);
}

function printCommandHelp(operation: string): void {
  const usage = COMMAND_HELP[operation];
  if (!usage) {
    printMainHelp();
    return;
  }
  console.log(`eventages-lite ${operation}\n\n${usage}`);
}

/* ------------------------------------------------------------------ */
/* Point d'entrée                                                      */
/* ------------------------------------------------------------------ */

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.length === 0) {
    printMainHelp();
    return;
  }

  if (argv[0] === "--version" || argv[0] === "-v") {
    console.log(`eventages-lite ${pkgJson.version}`);
    return;
  }

  const args = parseArgs(argv);

  if (args.command === "help" || args.command === "--help" || flagBool(args, "help")) {
    const topic = args.command === "help" ? args.positionals[0] : args.command;
    if (topic && topic !== "help") printCommandHelp(topic);
    else printMainHelp();
    return;
  }

  switch (args.command) {
    case "init":
      commandInit(args);
      return;
    case "create":
      commandCreate(args);
      return;
    case "list":
      commandList(args);
      return;
    case "show":
      commandShow(args);
      return;
    case "payload":
      commandPayload(args);
      return;
    case "set":
      commandSet(args);
      return;
    case "duplicate":
      commandDuplicate(args);
      return;
    case "delete":
      commandDelete(args);
      return;
    case "types":
      commandTypes(args);
      return;
    case "render":
      await commandRender(args);
      return;
    case "pack":
      commandPack(args);
      return;
    case "import":
      commandImport(args);
      return;
  }

  console.error(`Commande inconnue : « ${args.command} ».\n`);
  printMainHelp();
  process.exitCode = 1;
}

try {
  await main();
} catch (error) {
  const message =
    error instanceof Error && error.message ? error.message : `Erreur inattendue : ${String(error)}`;
  console.error(`Erreur : ${message}`);
  process.exitCode = 1;
}
