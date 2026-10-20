/**
 * Matrice du QR code, calculée hors navigateur par `qrcode` (node-qrcode).
 * Le placement des modules suit la norme ISO/IEC 18004, comme le générateur
 * embarqué de `qr-code-styling` ; le rendu lui-même est fait par `render.ts`,
 * qui redessine les mêmes figures que l'application.
 */

import { create } from "qrcode";
import type { QrDesign } from "@/lib/qr-design";

export type QrMatrix = {
  /** Nombre de modules par côté. */
  count: number;
  isDark: (row: number, col: number) => boolean;
};

export function createMatrix(payload: string, errorCorrection: QrDesign["errorCorrection"]): QrMatrix {
  const created = create(payload, { errorCorrectionLevel: errorCorrection });
  const modules = created.modules as unknown as {
    size: number;
    data: Uint8Array;
    get: (row: number, col: number) => boolean;
  };

  const count = modules.size;
  if (count <= 0) {
    throw new Error("Matrice du QR vide : le payload n'a pas pu être encodé.");
  }

  // `data` est en ligne par rangée ; 1 = module sombre (fallback si `get` manque).
  const isDark =
    typeof modules.get === "function"
      ? (row: number, col: number): boolean => modules.get(row, col)
      : (row: number, col: number): boolean => modules.data[row * count + col] === 1;

  return { count, isDark };
}
