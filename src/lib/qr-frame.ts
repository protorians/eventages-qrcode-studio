import type { QrFrame } from "@/lib/qr-design";

/** Taille de référence du QR dans la maquette interne, en px. */
export const BASE_QR_SIZE = 280;
const BASE_LABEL_BAND = 46;
const BASE_ACCENT = 6;

export type FrameMetrics = {
  frame: QrFrame;
  qrSize: number;
  pad: number;
  radius: number;
  borderWidth: number;
  accentBar: number;
  labelBand: number;
  width: number;
  height: number;
  hasLabel: boolean;
};

/**
 * Calcule la géométrie du cadre pour une taille de QR donnée. Le même calcul
 * alimente l'aperçu DOM et la composition à l'export, ce qui garantit un
 * rendu identique à l'écran et dans le fichier téléchargé (spec 004, FR-7).
 */
export function frameMetrics(
  frame: QrFrame,
  qrSize: number = BASE_QR_SIZE,
  hasText = true,
): FrameMetrics {
  const scale = qrSize / BASE_QR_SIZE;
  const hasLabel = frame.labelPosition !== "none" && hasText;
  const pad = Math.round(frame.padding * scale);
  const borderWidth = Math.round(frame.borderWidth * scale);
  const labelBand = hasLabel ? Math.round(BASE_LABEL_BAND * scale) : 0;
  const accentBar =
    hasLabel && frame.accentBar ? Math.max(2, Math.round(BASE_ACCENT * scale)) : 0;
  const radius = Math.round(frame.radius * scale);
  const width = qrSize + pad * 2 + borderWidth * 2;
  const height = width + accentBar + labelBand;

  return {
    frame,
    qrSize,
    pad,
    radius,
    borderWidth,
    accentBar,
    labelBand,
    width,
    height,
    hasLabel,
  };
}
