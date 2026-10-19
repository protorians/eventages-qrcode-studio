/**
 * Utilitaires purs de composition d'export, partagés par le navigateur
 * (`qr-export.ts`) et le CLI headless (`cli/`) : aucun accès au DOM ici,
 * uniquement des chaînes — garantit un fichier composé identique partout
 * (spec 004, FR-7).
 */

import { frameMetrics } from "@/lib/qr-frame";
import type { QrDesign } from "@/lib/qr-design";

/** Nom de fichier sûr et sans accent, partagé par l'export, le partage et le CLI. */
export function sanitizeFileName(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9-_]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "qr-code"
  );
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Enveloppe le SVG du QR (déjà positionné via ses attributs `x`/`y`) dans le
 * document du cadre : fond, bordure, barre d'accent et libellé. Le SVG interne
 * reste inchangé, seul le décor s'ajoute autour.
 */
export function wrapSvg(
  inner: string,
  design: QrDesign,
  metrics: ReturnType<typeof frameMetrics>,
): string {
  const { width, height, radius, borderWidth } = metrics;
  const frame = metrics.frame;
  const inset = borderWidth / 2;
  const parts: string[] = [];

  if (frame.id !== "none") {
    parts.push(
      `<rect x="${inset}" y="${inset}" width="${width - borderWidth}" height="${
        height - borderWidth
      }" rx="${radius}" fill="${design.frameBackground}" stroke="${
        borderWidth > 0 ? design.frameColor : "none"
      }" stroke-width="${borderWidth}"${
        frame.borderStyle === "dashed" ? ' stroke-dasharray="10 8"' : ""
      }/>`,
    );
  }

  const offset = metrics.pad + borderWidth;
  const barY = frame.labelPosition === "top" ? offset : offset + metrics.qrSize;
  const labelTop = barY + metrics.accentBar;

  if (metrics.hasLabel && metrics.accentBar > 0) {
    parts.push(
      `<rect x="${offset}" y="${barY}" width="${metrics.qrSize}" height="${metrics.accentBar}" rx="${
        metrics.accentBar / 2
      }" fill="${design.frameColor}"/>`,
    );
  }

  if (metrics.hasLabel) {
    const fontSize = Math.max(10, (design.frameTextSize / 280) * metrics.qrSize);
    parts.push(
      `<text x="${width / 2}" y="${
        labelTop + metrics.labelBand / 2
      }" fill="${design.frameTextColor}" font-family="Manrope Variable, system-ui, sans-serif" font-size="${fontSize}" font-weight="600" text-anchor="middle" dominant-baseline="central">${escapeXml(
        design.frameText,
      )}</text>`,
    );
  }

  const background =
    frame.id === "none" && design.transparentBackground
      ? ""
      : `<rect width="${width}" height="${height}" rx="${radius}" fill="${
          frame.id === "none" ? design.background : "none"
        }"/>`;

  return [
    '<?xml version="1.0" standalone="no"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    background,
    parts.join(""),
    inner,
    "</svg>",
  ].join("");
}
