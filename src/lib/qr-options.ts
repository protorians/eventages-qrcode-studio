import type { Gradient, Options } from "qr-code-styling";
import { BASE_QR_SIZE } from "@/lib/qr-frame";
import type { QrDesign } from "@/lib/qr-design";

/** Le moteur exprime les rotations de dégradé en radians. */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function linearGradient(from: string, to: string, rotationDegrees: number): Gradient {
  return {
    type: "linear",
    rotation: toRadians(rotationDegrees),
    colorStops: [
      { offset: 0, color: from },
      { offset: 1, color: to },
    ],
  };
}

/** Marge de silence (quiet zone), proportionnelle à la taille de rendu. */
export function marginFor(margin: number, size: number): number {
  return Math.max(0, Math.round((margin / BASE_QR_SIZE) * size));
}

/**
 * Traduit le modèle de design (spec 004) en options `qr-code-styling`.
 * `size` est la résolution de rendu ; toutes les proportions en dépendent.
 *
 * Le rendu est toujours de type `svg` : net à l'écran et rasterisé à la
 * demande pour l'export (PNG/JPEG/WebP).
 */
export function designToOptions(
  design: QrDesign,
  data: string,
  size: number,
): Partial<Options> {
  const gradient =
    design.dotsColorMode === "gradient"
      ? linearGradient(
          design.dotsGradientFrom,
          design.dotsGradientTo,
          design.dotsGradientRotation,
        )
      : undefined;

  const bodyColor = design.dotsColorMode === "gradient" ? undefined : design.dotsColor;

  return {
    type: "svg",
    shape: "square",
    width: size,
    height: size,
    margin: marginFor(design.margin, size),
    data: data || " ",
    qrOptions: {
      typeNumber: 0,
      errorCorrectionLevel: design.errorCorrection,
    },
    image: design.logo ?? undefined,
    imageOptions: {
      hideBackgroundDots: design.hideBackgroundDots,
      imageSize: design.logoSize,
      margin: design.logoMargin,
      saveAsBlob: false,
    },
    dotsOptions: {
      type: design.dotsType,
      color: bodyColor,
      gradient,
      roundSize: design.dotsType !== "square",
    },
    cornersSquareOptions: {
      type: design.cornerSquareType,
      color: design.cornersMatchBody ? undefined : design.cornerSquareColor,
      gradient: design.cornersMatchBody ? gradient : undefined,
    },
    cornersDotOptions: {
      type: design.cornerDotType,
      color: design.cornersMatchBody ? undefined : design.cornerDotColor,
      gradient: design.cornersMatchBody ? gradient : undefined,
    },
    backgroundOptions: {
      round: 0,
      color: design.transparentBackground ? "transparent" : design.background,
    },
  };
}

/** Couleur effective des modules, pour l'analyse de contraste. */
export function bodyColors(design: QrDesign): { from: string; to: string } {
  if (design.dotsColorMode === "gradient") {
    return { from: design.dotsGradientFrom, to: design.dotsGradientTo };
  }
  return { from: design.dotsColor, to: design.dotsColor };
}
