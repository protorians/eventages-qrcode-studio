import QRCodeStyling from "qr-code-styling";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { FRAMES_BY_ID, type ExportFormat, type QrDesign } from "@/lib/qr-design";
import { frameMetrics } from "@/lib/qr-frame";
import { designToOptions } from "@/lib/qr-options";
import { renderBarcodeSvg, type BarcodeDesign } from "@/lib/barcode";
import { wrapSvg, sanitizeFileName } from "@/lib/qr-svg";
import { blobToBase64, isTauriRuntime } from "@/lib/tauri";

const MIME: Record<ExportFormat, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
};

/** Entrée code-barres pour l'export : symbologie + habillage 1D. */
export type BarcodeExportInput = { symbology: string; design: BarcodeDesign };

export type QrExportRequest = {
  design: QrDesign;
  payload: string;
  /** Côté du QR hors cadre, en px. */
  qrSize: number;
  format: ExportFormat;
  fileName: string;
  /** Présent pour le type code-barres 1D (rendu dédié au lieu du QR). */
  barcode?: BarcodeExportInput;
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

/** Rasterise une source SVG (code-barres) en image dessinable. */
async function imageFromSvg(source: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.decoding = "sync";
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Image illisible"));
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
  });
  return image;
}

/** SVG du code-barres à la taille demandée, ou échec avec message lisible. */
function barcodeSvgSource(
  input: BarcodeExportInput,
  design: QrDesign,
  payload: string,
  size: number,
): string {
  const { svg, error } = renderBarcodeSvg({
    value: payload,
    symbology: input.symbology,
    design: input.design,
    background: design.transparentBackground ? null : design.background,
    size,
  });
  if (!svg) throw new Error(error ?? "Rendu du code-barres indisponible");
  return svg;
}

/** SVG vectoriel du QR seul, à la résolution demandée. */
async function qrSvgSource(design: QrDesign, payload: string, size: number): Promise<string> {
  const instance = new QRCodeStyling(designToOptions(design, payload, size));
  const raw = await instance.getRawData("svg");
  if (!(raw instanceof Blob)) throw new Error("Rendu vectoriel indisponible");
  return await raw.text();
}

/**
 * Compose le code (QR ou code-barres 1D) et son cadre dans une image unique :
 * le fichier téléchargé est identique à l'aperçu (spec 004, FR-7).
 */
export async function renderExportBlob({
  design,
  payload,
  qrSize,
  format,
  barcode,
}: Omit<QrExportRequest, "fileName">): Promise<Blob> {
  const frame = FRAMES_BY_ID[design.frameId] ?? FRAMES_BY_ID.none;

  if (format === "svg") {
    const source = barcode
      ? barcodeSvgSource(barcode, design, payload, qrSize)
      : await qrSvgSource(design, payload, qrSize);

    if (frame.id === "none") return new Blob([source], { type: MIME.svg });

    const metrics = frameMetrics(frame, qrSize, Boolean(design.frameText));
    const inner = await inlineSvg(source, metrics.pad + metrics.borderWidth);
    return new Blob([wrapSvg(inner, design, metrics)], { type: MIME.svg });
  }

  const image = barcode
    ? await imageFromSvg(barcodeSvgSource(barcode, design, payload, qrSize))
    : await renderRaster(design, payload, qrSize, format);
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

/** Déclenche le téléchargement local du fichier (aucun serveur, spec 005).
 *
 * Sous Tauri, le webview ignore le téléchargement par ancre `blob:` : on passe
 * par le dialogue natif de sauvegarde puis l'écriture disque. Renvoie le nom du
 * fichier (navigateur) ou le chemin complet (natif), ou `""` si annulé.
 */
export async function exportQr(request: QrExportRequest): Promise<string> {
  const blob = await renderExportBlob(request);
  const filename = `${sanitizeFileName(request.fileName)}.${request.format}`;

  // Shell natif (Tauri) : dialogue système, puis écriture par commande Rust.
  if (isTauriRuntime()) {
    const target = await save({
      title: "Exporter le fichier",
      defaultPath: filename,
      filters: [SAVE_FILTERS[request.format]],
    });
    if (!target) return "";
    await invoke("save_export_file", {
      path: target,
      dataBase64: await blobToBase64(blob),
    });
    return target;
  }

  // Navigateur : téléchargement par ancre sur URL blob.
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

/** Filtres du dialogue de sauvegarde natif, par format d'export. */
const SAVE_FILTERS: Record<ExportFormat, { name: string; extensions: string[] }> = {
  png: { name: "Image PNG", extensions: ["png"] },
  jpeg: { name: "Image JPEG", extensions: ["jpeg", "jpg"] },
  webp: { name: "Image WebP", extensions: ["webp"] },
  svg: { name: "Dessin vectoriel SVG", extensions: ["svg"] },
};
