/**
 * Rendu headless du QR (CLI) : réimplémentation fidèle du tracé de
 * `qr-code-styling` en SVG pur, sans DOM — mêmes figures (styles de modules,
 * marqueurs de coin, dégradés, emplacement du logo) et même composition de
 * cadre que l'aperçu et l'export de l'application (`qr-export.ts`).
 *
 * La matrice vient de `qrcode` (node-qrcode), qui suit la norme ISO/IEC 18004
 * comme le générateur embarqué côté interface. Le raster PNG est produit par
 * `@resvg/resvg-js` à partir du même SVG.
 */

import { imageSize } from "image-size";
import { FRAMES_BY_ID, type QrDesign } from "@/lib/qr-design";
import { frameMetrics } from "@/lib/qr-frame";
import { marginFor } from "@/lib/qr-options";
import { wrapSvg } from "@/lib/qr-svg";
import { parseDataUrl } from "@/lib/qcp";
import { fileToDataUrl } from "./workspace";
import { createMatrix } from "./matrix";

const SVG_NS = "http://www.w3.org/2000/svg";
const PROLOG = '<?xml version="1.0" standalone="no"?>\r\n';

/** Quotient de modules qu'un logo peut masquer, par niveau de correction. */
const ECC_FRACTION: Record<QrDesign["errorCorrection"], number> = {
  L: 0.07,
  M: 0.15,
  Q: 0.25,
  H: 0.3,
};

/** Anneau du marqueur de coin (7×7), tel que le dessine qr-code-styling. */
const FINDER_RING: number[][] = [
  [1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1],
];

/** Point central du marqueur (3×3). */
const FINDER_CENTER: number[][] = [
  [0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0],
  [0, 0, 1, 1, 1, 0, 0],
  [0, 0, 1, 1, 1, 0, 0],
  [0, 0, 1, 1, 1, 0, 0],
  [0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0],
];

type Figure = { svg: string };

type Painter = {
  circle: (cx: number, cy: number, r: number) => void;
  rect: (x: number, y: number, width: number, height: number) => void;
  path: (d: string, transform?: string, clipRule?: "evenodd") => void;
};

function painterInto(figures: Figure[]): Painter {
  return {
    circle: (cx, cy, r) => {
      figures.push({ svg: `<circle cx="${cx}" cy="${cy}" r="${r}"/>` });
    },
    rect: (x, y, width, height) => {
      figures.push({ svg: `<rect x="${x}" y="${y}" width="${width}" height="${height}"/>` });
    },
    path: (d, transform, clipRule) => {
      figures.push({
        svg: `<path d="${d}"${clipRule ? ` clip-rule="${clipRule}"` : ""}${
          transform ? ` transform="${transform}"` : ""
        }/>`,
      });
    },
  };
}

function rotateAround(rotation: number, cx: number, cy: number): string {
  const degrees = (180 * rotation) / Math.PI;
  return `rotate(${degrees} ${cx} ${cy})`;
}

/* ------------------------------------------------------------------ */
/* Figures de modules (points du corps du QR)                          */
/* ------------------------------------------------------------------ */

function basicDot(p: Painter, x: number, y: number, size: number): void {
  p.circle(x + size / 2, y + size / 2, size / 2);
}

function basicSquare(p: Painter, x: number, y: number, size: number): void {
  p.rect(x, y, size, size);
}

function basicSideRounded(p: Painter, x: number, y: number, size: number, rotation: number): void {
  p.path(
    `M ${x} ${y}v ${size}h ${size / 2}a ${size / 2} ${size / 2}, 0, 0, 0, 0 ${-size}`,
    rotateAround(rotation, x + size / 2, y + size / 2),
  );
}

function basicCornerRounded(p: Painter, x: number, y: number, size: number, rotation: number): void {
  p.path(
    `M ${x} ${y}v ${size}h ${size}v ${-size / 2}a ${size / 2} ${size / 2}, 0, 0, 0, ${-size / 2} ${
      -size / 2
    }`,
    rotateAround(rotation, x + size / 2, y + size / 2),
  );
}

function basicCornerExtraRounded(
  p: Painter,
  x: number,
  y: number,
  size: number,
  rotation: number,
): void {
  p.path(
    `M ${x} ${y}v ${size}h ${size}a ${size} ${size}, 0, 0, 0, ${-size} ${-size}`,
    rotateAround(rotation, x + size / 2, y + size / 2),
  );
}

function basicCornersRounded(p: Painter, x: number, y: number, size: number, rotation: number): void {
  p.path(
    `M ${x} ${y}v ${size / 2}a ${size / 2} ${size / 2}, 0, 0, 0, ${size / 2} ${size / 2}h ${
      size / 2
    }v ${-size / 2}a ${size / 2} ${size / 2}, 0, 0, 0, ${-size / 2} ${-size / 2}`,
    rotateAround(rotation, x + size / 2, y + size / 2),
  );
}

type NeighborFn = (dx: number, dy: number) => boolean;

/**
 * Dessine un module selon son style et son voisinage — transposition directe
 * de la classe de tracé des points de `qr-code-styling`.
 */
function drawModule(
  p: Painter,
  type: QrDesign["dotsType"],
  x: number,
  y: number,
  size: number,
  neighbor: NeighborFn,
): void {
  const left = Number(neighbor(-1, 0));
  const right = Number(neighbor(1, 0));
  const up = Number(neighbor(0, -1));
  const down = Number(neighbor(0, 1));
  const total = left + right + up + down;

  switch (type) {
    case "dots":
      basicDot(p, x, y, size);
      return;
    case "square":
      basicSquare(p, x, y, size);
      return;
    case "classy":
      if (total === 0) {
        basicCornersRounded(p, x, y, size, Math.PI / 2);
      } else if (left || up) {
        if (right || down) basicSquare(p, x, y, size);
        else basicCornerRounded(p, x, y, size, Math.PI / 2);
      } else {
        basicCornerRounded(p, x, y, size, -Math.PI / 2);
      }
      return;
    case "classy-rounded":
      if (total === 0) {
        basicCornersRounded(p, x, y, size, Math.PI / 2);
      } else if (left || up) {
        if (right || down) basicSquare(p, x, y, size);
        else basicCornerExtraRounded(p, x, y, size, Math.PI / 2);
      } else {
        basicCornerExtraRounded(p, x, y, size, -Math.PI / 2);
      }
      return;
    case "extra-rounded": {
      if (total === 0) {
        basicDot(p, x, y, size);
      } else if (total > 2 || (left && right) || (up && down)) {
        basicSquare(p, x, y, size);
      } else if (total === 2) {
        const rotation = left && up ? Math.PI / 2 : up && right ? Math.PI : right && down ? -Math.PI / 2 : 0;
        basicCornerExtraRounded(p, x, y, size, rotation);
      } else {
        const rotation = up ? Math.PI / 2 : right ? Math.PI : down ? -Math.PI / 2 : 0;
        basicSideRounded(p, x, y, size, rotation);
      }
      return;
    }
    case "rounded": {
      if (total === 0) {
        basicDot(p, x, y, size);
      } else if (total > 2 || (left && right) || (up && down)) {
        basicSquare(p, x, y, size);
      } else if (total === 2) {
        const rotation = left && up ? Math.PI / 2 : up && right ? Math.PI : right && down ? -Math.PI / 2 : 0;
        basicCornerRounded(p, x, y, size, rotation);
      } else {
        const rotation = up ? Math.PI / 2 : right ? Math.PI : down ? -Math.PI / 2 : 0;
        basicSideRounded(p, x, y, size, rotation);
      }
      return;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Figures des marqueurs de coin                                       */
/* ------------------------------------------------------------------ */

function cornerSquareFigure(
  p: Painter,
  type: QrDesign["cornerSquareType"],
  x: number,
  y: number,
  size: number,
  rotation: number,
): void {
  const unit = size / 7;
  switch (type) {
    case "dot":
      p.path(
        `M ${x + size / 2} ${y}a ${size / 2} ${size / 2} 0 1 0 0.1 0zm 0 ${unit}a ${
          size / 2 - unit
        } ${size / 2 - unit} 0 1 1 -0.1 0Z`,
        rotateAround(rotation, x + size / 2, y + size / 2),
        "evenodd",
      );
      return;
    case "square":
      p.path(
        `M ${x} ${y}v ${size}h ${size}v ${-size}zM ${x + unit} ${y + unit}h ${
          size - 2 * unit
        }v ${size - 2 * unit}h ${2 * unit - size}z`,
        rotateAround(rotation, x + size / 2, y + size / 2),
        "evenodd",
      );
      return;
    case "extra-rounded":
      p.path(
        [
          `M ${x} ${y + 2.5 * unit}v ${2 * unit}a ${2.5 * unit} ${2.5 * unit}, 0, 0, 0, ${
            2.5 * unit
          } ${2.5 * unit}h ${2 * unit}a ${2.5 * unit} ${2.5 * unit}, 0, 0, 0, ${2.5 * unit} ${
            -2.5 * unit
          }v ${-2 * unit}a ${2.5 * unit} ${2.5 * unit}, 0, 0, 0, ${-2.5 * unit} ${
            -2.5 * unit
          }h ${-2 * unit}a ${2.5 * unit} ${2.5 * unit}, 0, 0, 0, ${-2.5 * unit} ${2.5 * unit}`,
          `M ${x + 2.5 * unit} ${y + unit}h ${2 * unit}a ${1.5 * unit} ${1.5 * unit}, 0, 0, 1, ${
            1.5 * unit
          } ${1.5 * unit}v ${2 * unit}a ${1.5 * unit} ${1.5 * unit}, 0, 0, 1, ${-1.5 * unit} ${
            1.5 * unit
          }h ${-2 * unit}a ${1.5 * unit} ${1.5 * unit}, 0, 0, 1, ${-1.5 * unit} ${
            -1.5 * unit
          }v ${-2 * unit}a ${1.5 * unit} ${1.5 * unit}, 0, 0, 1, ${1.5 * unit} ${-1.5 * unit}`,
        ].join(""),
        rotateAround(rotation, x + size / 2, y + size / 2),
        "evenodd",
      );
      return;
    // « rounded » et « classy » : anneau tracé module par module.
  }
}

function cornerDotFigure(
  p: Painter,
  type: QrDesign["cornerDotType"],
  x: number,
  y: number,
  size: number,
): void {
  if (type === "dot") basicDot(p, x, y, size);
  else basicSquare(p, x, y, size);
}

/** Trace une grille de pattern (anneau ou point central) module par module. */
function drawPattern(
  p: Painter,
  pattern: number[][],
  type: QrDesign["dotsType"],
  x: number,
  y: number,
  dotSize: number,
): void {
  for (let row = 0; row < pattern.length; row += 1) {
    for (let col = 0; col < pattern[row]!.length; col += 1) {
      if (!pattern[row]![col]) continue;
      drawModule(p, type, x + col * dotSize, y + row * dotSize, dotSize, (dx, dy) =>
        Boolean(pattern[row + dy]?.[col + dx]),
      );
    }
  }
}

/* ------------------------------------------------------------------ */
/* Dégradés et calques couleurs                                        */
/* ------------------------------------------------------------------ */

type GradientSpec = { from: string; to: string; rotationRadians: number };

/** Extrémités du dégradé linéaire, même géométrie que qr-code-styling. */
function gradientEndpoints(
  gradient: GradientSpec,
  additionalRotation: number,
  x: number,
  y: number,
  width: number,
  height: number,
): { x1: number; y1: number; x2: number; y2: number } {
  const quarter = Math.PI / 4;
  const angle = ((gradient.rotationRadians + additionalRotation) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
  let x1 = x + width / 2;
  let y1 = y + height / 2;
  let x2 = x + width / 2;
  let y2 = y + height / 2;

  if ((angle >= 0 && angle <= quarter) || (angle > 1.75 * Math.PI && angle <= 2 * Math.PI)) {
    x1 -= width / 2;
    y1 -= (height / 2) * Math.tan(angle);
    x2 += width / 2;
    y2 += (height / 2) * Math.tan(angle);
  } else if (angle > quarter && angle <= 3 * quarter) {
    y1 -= height / 2;
    x1 -= width / 2 / Math.tan(angle);
    y2 += height / 2;
    x2 += width / 2 / Math.tan(angle);
  } else if (angle > 3 * quarter && angle <= 5 * quarter) {
    x1 += width / 2;
    y1 += (height / 2) * Math.tan(angle);
    x2 -= width / 2;
    y2 -= (height / 2) * Math.tan(angle);
  } else {
    y1 += height / 2;
    x1 += width / 2 / Math.tan(angle);
    y2 -= height / 2;
    x2 -= width / 2 / Math.tan(angle);
  }

  return { x1: Math.round(x1), y1: Math.round(y1), x2: Math.round(x2), y2: Math.round(y2) };
}

type ColorLayerInput = {
  clipId: string;
  gradientId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  gradient?: GradientSpec;
  additionalRotation: number;
  figures: Figure[];
};

/** Écrit le clipPath des figures + le rectangle coloré qui les peint. */
function colorLayer(defs: string[], body: string[], input: ColorLayerInput): void {
  const { clipId, gradientId, x, y, width, height, color, gradient, additionalRotation, figures } =
    input;
  defs.push(`<clipPath id="${clipId}">${figures.map((figure) => figure.svg).join("")}</clipPath>`);

  let fill: string;
  if (gradient) {
    const { x1, y1, x2, y2 } = gradientEndpoints(gradient, additionalRotation, x, y, width, height);
    defs.push(
      `<linearGradient id="${gradientId}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">` +
        `<stop offset="0%" stop-color="${gradient.from}"/>` +
        `<stop offset="100%" stop-color="${gradient.to}"/>` +
        `</linearGradient>`,
    );
    fill = `url(#${gradientId})`;
  } else {
    fill = color ?? "#000000";
  }

  body.push(
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" clip-path="url(#${clipId})" fill="${fill}"/>`,
  );
}

/* ------------------------------------------------------------------ */
/* Logo                                                                */
/* ------------------------------------------------------------------ */

type LogoSource = { href: string; bytes: Uint8Array };

/** Résout le logo du design en data URL exploitable par le SVG. */
function resolveLogo(logo: NonNullable<QrDesign["logo"]>): LogoSource {
  if (logo.startsWith("data:")) {
    const parsed = parseDataUrl(logo);
    if (!parsed) throw new Error("Logo illisible : data URL invalide.");
    return { href: logo, bytes: new Uint8Array(Buffer.from(parsed.base64, "base64")) };
  }
  if (/^https?:/i.test(logo)) {
    throw new Error(
      "Logo distant (http/https) non pris en charge en headless : utilisez un fichier local.",
    );
  }
  // Chemin de fichier inscrit à la main dans le JSON du projet.
  const href = fileToDataUrl(logo);
  const parsed = parseDataUrl(href);
  if (!parsed) throw new Error(`Logo illisible : ${logo}`);
  return { href, bytes: new Uint8Array(Buffer.from(parsed.base64, "base64")) };
}

/** Zone de modules masqués par le logo — algorithme de qr-code-styling. */
function hiddenDotRegion(
  originalWidth: number,
  originalHeight: number,
  imageSizeRatio: number,
  errorCorrection: QrDesign["errorCorrection"],
  count: number,
  dotSize: number,
): { hideXDots: number; hideYDots: number; width: number; height: number } {
  const maxHiddenDots = Math.floor(imageSizeRatio * ECC_FRACTION[errorCorrection] * count * count);
  const maxHiddenAxisDots = count - 14;
  const offset = { x: 0, y: 0 };
  const size = { x: 0, y: 0 };

  if (originalHeight <= 0 || originalWidth <= 0 || maxHiddenDots <= 0 || dotSize <= 0) {
    return { hideYDots: 0, hideXDots: 0, width: 0, height: 0 };
  }

  const ratio = originalHeight / originalWidth;
  offset.x = Math.floor(Math.sqrt(maxHiddenDots / ratio));
  if (offset.x <= 0) offset.x = 1;
  if (maxHiddenAxisDots && maxHiddenAxisDots < offset.x) offset.x = maxHiddenAxisDots;
  if (offset.x % 2 === 0) offset.x -= 1;
  size.x = offset.x * dotSize;
  offset.y = 1 + 2 * Math.ceil((offset.x * ratio - 1) / 2);
  size.y = Math.round(size.x * ratio);

  if (offset.y * offset.x > maxHiddenDots || (maxHiddenAxisDots && maxHiddenAxisDots < offset.y)) {
    if (maxHiddenAxisDots && maxHiddenAxisDots < offset.y) {
      offset.y = maxHiddenAxisDots;
      if (offset.y % 2 === 0) offset.x -= 1;
    } else {
      offset.y -= 2;
    }
    size.y = offset.y * dotSize;
    offset.x = 1 + 2 * Math.ceil((offset.y / ratio - 1) / 2);
    size.x = Math.round(size.y / ratio);
  }

  return { hideYDots: offset.y, hideXDots: offset.x, width: size.x, height: size.y };
}

/* ------------------------------------------------------------------ */
/* Rendu du SVG interne (QR seul, marge de silence incluse)            */
/* ------------------------------------------------------------------ */

export type HeadlessRenderInput = {
  design: QrDesign;
  payload: string;
  /** Côté du QR marge de silence incluse, en px (comme `saveSize`). */
  qrSize: number;
  /** Décalage d'insertion pour la composition dans un cadre. */
  offset?: number;
  /** Suffixe d'identifiants SVG (défaut : aléatoire, évite les collisions). */
  instanceId?: string;
};

/** Construit le SVG du QR seul (fond, points, coins, logo). */
export function renderQrSvg({
  design,
  payload,
  qrSize,
  offset = 0,
  instanceId = Math.random().toString(36).slice(2, 8),
}: HeadlessRenderInput): string {
  const matrix = createMatrix(payload, design.errorCorrection);
  const count = matrix.count;
  const margin = marginFor(design.margin, qrSize);
  const available = qrSize - 2 * margin;
  if (available <= 0 || count > available) {
    throw new Error(
      `Taille de rendu trop petite (${qrSize} px) pour ce contenu : augmentez --size.`,
    );
  }

  const roundSize =
    design.dotsType !== "square"
      ? (value: number): number => Math.floor(value)
      : (value: number): number => value;
  const dotSize = roundSize(available / count);
  const quadrant = roundSize((qrSize - count * dotSize) / 2);

  const gradient: GradientSpec | undefined =
    design.dotsColorMode === "gradient"
      ? {
          from: design.dotsGradientFrom,
          to: design.dotsGradientTo,
          rotationRadians: (design.dotsGradientRotation * Math.PI) / 180,
        }
      : undefined;
  const bodyColor = design.dotsColorMode === "gradient" ? undefined : design.dotsColor;
  const cornerGradient = design.cornersMatchBody ? gradient : undefined;
  const cornerSquareColor = design.cornersMatchBody ? undefined : design.cornerSquareColor;
  const cornerDotColor = design.cornersMatchBody ? undefined : design.cornerDotColor;

  // Logo : dimensions naturelles + zone de modules masquée en son centre.
  let region = { hideXDots: 0, hideYDots: 0, width: 0, height: 0 };
  let logoHref: string | null = null;
  if (design.logo) {
    const logo = resolveLogo(design.logo);
    let natural = { width: 0, height: 0 };
    try {
      const dims = imageSize(logo.bytes);
      natural = { width: Number(dims.width) || 0, height: Number(dims.height) || 0 };
    } catch {
      // Format non reconnu : le logo est dessiné mais ne masque rien.
    }
    region = hiddenDotRegion(
      natural.width,
      natural.height,
      design.logoSize,
      design.errorCorrection,
      count,
      dotSize,
    );
    logoHref = logo.href;
  }

  const skipModule = (row: number, col: number): boolean => {
    if (
      design.logo &&
      design.hideBackgroundDots &&
      row >= (count - region.hideYDots) / 2 &&
      row < (count + region.hideYDots) / 2 &&
      col >= (count - region.hideXDots) / 2 &&
      col < (count + region.hideXDots) / 2
    ) {
      return true;
    }
    return Boolean(
      FINDER_RING[row]?.[col] ||
        FINDER_RING[row - count + 7]?.[col] ||
        FINDER_RING[row]?.[col - count + 7] ||
        FINDER_CENTER[row]?.[col] ||
        FINDER_CENTER[row - count + 7]?.[col] ||
        FINDER_CENTER[row]?.[col - count + 7],
    );
  };

  // Corps : figures dans un clipPath unique, peint par le dégradé ou la couleur.
  const defs: string[] = [];
  const body: string[] = [];
  const dots: Figure[] = [];
  const dotsPainter = painterInto(dots);

  for (let row = 0; row < count; row += 1) {
    for (let col = 0; col < count; col += 1) {
      if (skipModule(row, col)) continue;
      if (!matrix.isDark(row, col)) continue;
      drawModule(
        dotsPainter,
        design.dotsType,
        quadrant + col * dotSize,
        quadrant + row * dotSize,
        dotSize,
        (dx, dy) => {
          const nextRow = row + dy;
          const nextCol = col + dx;
          return (
            nextRow >= 0 &&
            nextCol >= 0 &&
            nextRow < count &&
            nextCol < count &&
            !skipModule(nextRow, nextCol) &&
            matrix.isDark(nextRow, nextCol)
          );
        },
      );
    }
  }

  // Fond : rect plein, transparent si demandé — dessiné avant les points,
  // l'ordre des éléments détermine qui recouvre qui.
  const background = design.transparentBackground ? "transparent" : design.background;
  const bgClipId = `clip-path-background-color-${instanceId}`;
  defs.push(`<clipPath id="${bgClipId}"><rect x="0" y="0" width="${qrSize}" height="${qrSize}"/></clipPath>`);
  body.push(
    `<rect x="0" y="0" width="${qrSize}" height="${qrSize}" clip-path="url(#${bgClipId})" fill="${background}"/>`,
  );

  // Marqueurs de coin, dans l'ordre haut-gauche, haut-droite, bas-gauche.
  const corners: { tx: number; ty: number; rotation: number }[] = [
    { tx: 0, ty: 0, rotation: 0 },
    { tx: 1, ty: 0, rotation: Math.PI / 2 },
    { tx: 0, ty: 1, rotation: -Math.PI / 2 },
  ];
  for (const corner of corners) {
    const x = quadrant + corner.tx * dotSize * (count - 7);
    const y = quadrant + corner.ty * dotSize * (count - 7);
    const eyeSize = 7 * dotSize;
    const pupilSize = 3 * dotSize;

    const eye: Figure[] = [];
    const eyePainter = painterInto(eye);
    const eyeType = design.cornerSquareType;
    if (eyeType === "dot" || eyeType === "square" || eyeType === "extra-rounded") {
      cornerSquareFigure(eyePainter, eyeType, x, y, eyeSize, corner.rotation);
    } else {
      drawPattern(eyePainter, FINDER_RING, eyeType, x, y, dotSize);
    }

    const pupil: Figure[] = [];
    const pupilPainter = painterInto(pupil);
    const pupilType = design.cornerDotType;
    if (pupilType === "dot" || pupilType === "square") {
      cornerDotFigure(pupilPainter, pupilType, x + 2 * dotSize, y + 2 * dotSize, pupilSize);
    } else {
      drawPattern(pupilPainter, FINDER_CENTER, pupilType, x + 2 * dotSize, y + 2 * dotSize, dotSize);
    }

    // Corps commun (coins assortis) ou couche dédiée par coin.
    if (cornerGradient || cornerSquareColor) {
      colorLayer(defs, body, {
        clipId: `clip-path-corners-square-color-${corner.tx}-${corner.ty}-${instanceId}`,
        gradientId: `corners-square-color-${corner.tx}-${corner.ty}-${instanceId}`,
        x,
        y,
        width: eyeSize,
        height: eyeSize,
        color: cornerSquareColor,
        gradient: cornerGradient,
        additionalRotation: corner.rotation,
        figures: eye,
      });
    } else {
      dots.push(...eye);
    }
    if (cornerGradient || cornerDotColor) {
      colorLayer(defs, body, {
        clipId: `clip-path-corners-dot-color-${corner.tx}-${corner.ty}-${instanceId}`,
        gradientId: `corners-dot-color-${corner.tx}-${corner.ty}-${instanceId}`,
        x: x + 2 * dotSize,
        y: y + 2 * dotSize,
        width: pupilSize,
        height: pupilSize,
        color: cornerDotColor,
        gradient: cornerGradient,
        additionalRotation: corner.rotation,
        figures: pupil,
      });
    } else {
      dots.push(...pupil);
    }
  }

  // Corps : figures puis rectangle coloré (dégradé ou couleur pleine).
  colorLayer(defs, body, {
    clipId: `clip-path-dot-color-${instanceId}`,
    gradientId: `dot-color-${instanceId}`,
    x: 0,
    y: 0,
    width: qrSize,
    height: qrSize,
    color: bodyColor,
    gradient,
    additionalRotation: 0,
    figures: dots,
  });

  // Logo par-dessus le corps.
  if (logoHref) {
    const imageWidth = region.width - 2 * design.logoMargin;
    const imageHeight = region.height - 2 * design.logoMargin;
    if (imageWidth > 0 && imageHeight > 0) {
      const imageX = quadrant + roundSize(design.logoMargin + (count * dotSize - region.width) / 2);
      const imageY = quadrant + roundSize(design.logoMargin + (count * dotSize - region.height) / 2);
      body.push(
        `<image href="${logoHref}" xlink:href="${logoHref}" x="${imageX}" y="${imageY}" width="${imageWidth}px" height="${imageHeight}px"/>`,
      );
    }
  }

  const crisp = design.dotsType === "square" ? ` shape-rendering="crispEdges"` : "";
  const offsetAttributes = offset !== 0 ? ` x="${offset}" y="${offset}"` : "";

  return (
    `<svg xmlns="${SVG_NS}" xmlns:xlink="http://www.w3.org/1999/xlink"${offsetAttributes} ` +
    `width="${qrSize}" height="${qrSize}" viewBox="0 0 ${qrSize} ${qrSize}"${crisp}>` +
    `<defs>${defs.join("")}</defs>` +
    body.join("") +
    `</svg>`
  );
}

/* ------------------------------------------------------------------ */
/* Composition finale : QR + cadre, export SVG et PNG                  */
/* ------------------------------------------------------------------ */

export type HeadlessRenderResult = { svg: string; width: number; height: number };

/**
 * Compose le fichier final : le QR seul sans cadre, ou le QR inséré dans le
 * décor du cadre — exactement comme `renderExportBlob` côté interface.
 */
export function renderQrSvgFile(design: QrDesign, payload: string, qrSize: number): HeadlessRenderResult {
  const frame = FRAMES_BY_ID[design.frameId] ?? FRAMES_BY_ID.none;
  if (frame.id === "none") {
    return { svg: `${PROLOG}${renderQrSvg({ design, payload, qrSize })}`, width: qrSize, height: qrSize };
  }

  const metrics = frameMetrics(frame, qrSize, Boolean(design.frameText));
  const offset = metrics.pad + metrics.borderWidth;
  const inner = renderQrSvg({ design, payload, qrSize, offset });
  return { svg: wrapSvg(inner, design, metrics), width: metrics.width, height: metrics.height };
}

/** Rasterise le SVG composé en PNG (@resvg/resvg-js). */
export async function renderQrPngFile(
  design: QrDesign,
  payload: string,
  qrSize: number,
): Promise<HeadlessRenderResult & { png: Uint8Array }> {
  const result = renderQrSvgFile(design, payload, qrSize);
  let Resvg: typeof import("@resvg/resvg-js").Resvg;
  try {
    ({ Resvg } = await import("@resvg/resvg-js"));
  } catch {
    throw new Error(
      "Rendu PNG indisponible (@resvg/resvg-js n'est pas installé) — utilisez --format svg.",
    );
  }
  const resvg = new Resvg(result.svg, { font: { loadSystemFonts: true } });
  const png = resvg.render().asPng();
  return { ...result, png };
}
