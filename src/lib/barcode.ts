/**
 * Moteur de code-barres 1D : rendu vectoriel SVG via JsBarcode, normalisé
 * dans une toile carrée pour réutiliser le cadre, les maquettes et le
 * pipeline d'export du QR (spec 004) sans duplications.
 *
 * Aucun accès réseau : le rendu est local et déterministe.
 */

import JsBarcode from "jsbarcode";

const SVG_NS = "http://www.w3.org/2000/svg";

/** Symbologie de code-barres : norme, contraintes de valeur et exemple. */
export type BarcodeFormat = {
  /** Identifiant JsBarcode. */
  id: string;
  label: string;
  /** Contenu attendu, affiché en aide du champ valeur. */
  hint: string;
  /** Jeu d'exemple valide (bouton « Exemple »). */
  sample: string;
};

/**
 * Catalogue des symbologies prises en charge — de la grande distribution
 * (EAN/UPC) à la logistique (Code 128, ITF-14) et aux usages spécialisés.
 */
export const BARCODE_FORMATS: BarcodeFormat[] = [
  {
    id: "CODE128",
    label: "Code 128",
    hint: "Tout caractère ASCII — références internes, transport, suivi.",
    sample: "STUDIO-2026",
  },
  {
    id: "CODE39",
    label: "Code 39",
    hint: "A–Z, 0–9, espace et - . $ / + % — industrie et badges.",
    sample: "STUDIO 2026",
  },
  {
    id: "CODE93",
    label: "Code 93",
    hint: "A–Z, 0–9 et - . $ / + % — plus compact que le Code 39.",
    sample: "STUDIO-2026",
  },
  {
    id: "EAN13",
    label: "EAN-13",
    hint: "12 chiffres — la clé de contrôle est calculée (13 si déjà fournie).",
    sample: "400638133393",
  },
  {
    id: "EAN8",
    label: "EAN-8",
    hint: "7 chiffres — la clé de contrôle est calculée (8 si déjà fournie).",
    sample: "9638507",
  },
  {
    id: "UPC",
    label: "UPC-A",
    hint: "11 chiffres — la clé de contrôle est calculée (12 si déjà fournie).",
    sample: "03600029145",
  },
  {
    id: "UPCE",
    label: "UPC-E",
    hint: "UPC-A compressé : 6 à 8 chiffres selon la règle de suppression de zéros.",
    sample: "01234565",
  },
  {
    id: "ITF14",
    label: "ITF-14",
    hint: "14 chiffres, clé de contrôle incluse — cartons et palettes.",
    sample: "12345678901235",
  },
  {
    id: "ITF",
    label: "ITF",
    hint: "Chiffres uniquement, par paires (nombre pair).",
    sample: "1234567890",
  },
  {
    id: "MSI",
    label: "MSI",
    hint: "Chiffres uniquement — inventaires et rayons.",
    sample: "1234567",
  },
  {
    id: "codabar",
    label: "Codabar",
    hint: "Chiffres (et - $ : . + /) encadrés par A, B, C ou D.",
    sample: "A123456B",
  },
  {
    id: "pharmacode",
    label: "Pharmacode",
    hint: "Nombre entier de 3 à 131 070 — industrie pharmaceutique.",
    sample: "1234",
  },
];

/** Symbologie par identifiant, avec repli sur le Code 128. */
export function barcodeFormat(id: string | undefined): BarcodeFormat {
  return (
    BARCODE_FORMATS.find((format) => format.id === id) ?? BARCODE_FORMATS[0]
  );
}

/** Options visuelles du code-barres (spec « code-barres 1D »). */
export type BarcodeDesign = {
  barColor: string;
  /** Largeur d'un module (barre fine), en px. */
  barWidth: number;
  /** Hauteur des barres, en px. */
  barHeight: number;
  /** Afficher la valeur lisible sous les barres. */
  showValue: boolean;
  fontSize: number;
  textMargin: number;
  /** Zone de silence autour des barres, en px. */
  margin: number;
};

export const DEFAULT_BARCODE_DESIGN: BarcodeDesign = {
  barColor: "#0f172a",
  barWidth: 2,
  barHeight: 110,
  showValue: true,
  fontSize: 20,
  textMargin: 2,
  margin: 10,
};

/** Complète un design de code-barres lu du stockage avec les défauts. */
export function normalizeBarcodeDesign(raw: unknown): BarcodeDesign {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_BARCODE_DESIGN };
  return { ...DEFAULT_BARCODE_DESIGN, ...(raw as Partial<BarcodeDesign>) };
}

export type BarcodeRender = {
  /** SVG carré prêt à afficher, ou `null` si la valeur est refusée. */
  svg: string | null;
  /** Message d'erreur prêt à afficher (valeur invalide pour la symbologie). */
  error: string | null;
};

/**
 * Rend le code-barres en SVG carré de taille `size` : les barres (et le
 * texte lisible) sont mises à l'échelle puis centrées, exactement comme le
 * SVG du QR — le cadre, les maquettes et l'export restent partagés.
 *
 * `background` peint le fond du carré ; `null` le laisse transparent.
 */
export function renderBarcodeSvg({
  value,
  symbology,
  design,
  background,
  size,
}: {
  value: string;
  symbology: string;
  design: BarcodeDesign;
  background: string | null;
  size: number;
}): BarcodeRender {
  const text = value.trim();
  const format = barcodeFormat(symbology);
  if (!text) return { svg: null, error: null };

  // Avec un callback `valid`, JsBarcode signale les valeurs refusées sans lever.
  let valid = true;
  const element = document.createElementNS(SVG_NS, "svg");
  try {
    JsBarcode(element, text, {
      format: format.id,
      width: design.barWidth,
      height: design.barHeight,
      displayValue: design.showValue,
      fontSize: design.fontSize,
      textMargin: design.textMargin,
      font: "monospace",
      lineColor: design.barColor,
      margin: design.margin,
      valid: (ok) => {
        valid = ok;
      },
    });
  } catch {
    return { svg: null, error: invalidMessage(text, format) };
  }
  if (!valid || !element.firstChild) {
    return { svg: null, error: invalidMessage(text, format) };
  }

  // Dimensions naturelles posées par le moteur (« …px » + viewBox).
  const width = parseFloat(element.getAttribute("width") ?? "0");
  const height = parseFloat(element.getAttribute("height") ?? "0");
  if (!(width > 0) || !(height > 0)) {
    return { svg: null, error: invalidMessage(text, format) };
  }

  const scale = size / Math.max(width, height);
  const offsetX = (size - width * scale) / 2;
  const offsetY = (size - height * scale) / 2;
  const paint = (input: number, digits = 2): string =>
    String(Number(input.toFixed(digits)));
  const backgroundRect = background
    ? `<rect width="${size}" height="${size}" fill="${background}"/>`
    : "";

  return {
    svg: [
      `<svg xmlns="${SVG_NS}" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`,
      backgroundRect,
      `<g transform="translate(${paint(offsetX)} ${paint(offsetY)}) scale(${paint(scale, 4)})">${
        element.innerHTML
      }</g>`,
      "</svg>",
    ].join(""),
    error: null,
  };
}

function invalidMessage(value: string, format: BarcodeFormat): string {
  return `« ${value} » n'est pas valide en ${format.label}. Attendu : ${format.hint}`;
}
