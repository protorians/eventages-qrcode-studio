import QRCodeStyling from "qr-code-styling";
import { FRAMES_BY_ID, type ExportFormat, type QrDesign } from "@/lib/qr-design";
import { frameMetrics } from "@/lib/qr-frame";
import { designToOptions } from "@/lib/qr-options";

const MIME: Record<ExportFormat, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
};

export type QrExportRequest = {
  design: QrDesign;
  payload: string;
  /** Côté du QR hors cadre, en px. */
  qrSize: number;
  format: ExportFormat;
  fileName: string;
};

/** Rendu du QR seul, à la résolution demandée (canvas pour les rasters). */
async function renderRaster(
  design: QrDesign,
  payload: string,
  size: number,
  format: Exclude<ExportFormat, "svg">,
): Promise<HTMLImageElement> {
  const instance = new QRCodeStyling(designToOptions(design, payload, size));
  const raw = await instance.getRawData(format);
  if (!(raw instanceof Blob)) throw new Error("Rendu du QR indisponible");
  const url = URL.createObjectURL(raw);
  try {
    const image = new Image();
    image.decoding = "sync";
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Image illisible"));
      image.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Compose le QR et son cadre dans une image unique : le fichier téléchargé est
 * identique à l'aperçu (spec 004, FR-7 — identité pixel près).
 */
export async function renderExportBlob({
  design,
  payload,
  qrSize,
  format,
}: Omit<QrExportRequest, "fileName">): Promise<Blob> {
  const frame = FRAMES_BY_ID[design.frameId] ?? FRAMES_BY_ID.none;

  if (format === "svg") {
    const instance = new QRCodeStyling(designToOptions(design, payload, qrSize));
    const raw = await instance.getRawData("svg");
    if (!(raw instanceof Blob)) throw new Error("Rendu vectoriel indisponible");
    const source = await raw.text();

    if (frame.id === "none") return new Blob([source], { type: MIME.svg });

    const metrics = frameMetrics(frame, qrSize, Boolean(design.frameText));
    const inner = await inlineSvg(source, metrics.pad + metrics.borderWidth);
    return new Blob([wrapSvg(inner, design, metrics)], { type: MIME.svg });
  }

  const image = await renderRaster(design, payload, qrSize, format);
  const metrics = frameMetrics(frame, qrSize, Boolean(design.frameText));
  const canvas = document.createElement("canvas");
  canvas.width = metrics.width;
  canvas.height = metrics.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Contexte de rendu indisponible");

  if (frame.id !== "none") {
    const inset = metrics.borderWidth / 2;
    roundRect(
      ctx,
      inset,
      inset,
      metrics.width - metrics.borderWidth,
      metrics.height - metrics.borderWidth,
      metrics.radius,
    );
    ctx.fillStyle = design.frameBackground;
    ctx.fill();
    if (metrics.borderWidth > 0) {
      ctx.lineWidth = metrics.borderWidth;
      ctx.strokeStyle = design.frameColor;
      ctx.setLineDash(frame.borderStyle === "dashed" ? [10, 8] : []);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  const offset = metrics.pad + metrics.borderWidth;
  ctx.drawImage(image, offset, offset, qrSize, qrSize);

  if (metrics.hasLabel) {
    const barY =
      frame.labelPosition === "top"
        ? offset
        : offset + qrSize;
    const labelTop = barY + metrics.accentBar;

    if (metrics.accentBar > 0) {
      ctx.fillStyle = design.frameColor;
      roundRect(ctx, offset, barY, qrSize, metrics.accentBar, metrics.accentBar / 2);
      ctx.fill();
    }

    const fontSize = Math.max(10, (design.frameTextSize / 280) * qrSize);
    ctx.fillStyle = design.frameTextColor;
    ctx.font = `600 ${fontSize}px "Manrope Variable", system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      design.frameText,
      metrics.width / 2,
      labelTop + metrics.labelBand / 2,
      metrics.width - offset * 2,
    );
  }

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Export impossible"))),
      MIME[format],
      0.96,
    );
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, Math.min(width, height) / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

/** Re-positionne le SVG du QR pour l'imbriquer dans un document plus grand. */
async function inlineSvg(source: string, offset: number): Promise<string> {
  const parsed = new DOMParser().parseFromString(source, "image/svg+xml");
  const root = parsed.documentElement;
  root.setAttribute("x", String(offset));
  root.setAttribute("y", String(offset));
  return root.outerHTML;
}

function wrapSvg(
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

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sanitize(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9-_]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "qr-code"
  );
}

/** Nom de fichier sûr et sans accent, partagé par l'export et le partage. */
export function sanitizeFileName(name: string): string {
  return sanitize(name);
}

/** Déclenche le téléchargement local du fichier (aucun serveur, spec 005). */
export async function exportQr(request: QrExportRequest): Promise<string> {
  const blob = await renderExportBlob(request);
  const filename = `${sanitize(request.fileName)}.${request.format}`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  return filename;
}
