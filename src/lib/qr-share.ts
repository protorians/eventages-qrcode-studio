import { invoke } from "@tauri-apps/api/core";
import { renderExportBlob, type BarcodeExportInput } from "@/lib/qr-export";
import { sanitizeFileName } from "@/lib/qr-svg";
import { blobToBase64, isTauriRuntime } from "@/lib/tauri";
import type { ExportFormat, QrDesign } from "@/lib/qr-design";

/** Résultat d'un partage : fichier transmis, ou fenêtre refermée par l'utilisateur. */
export type ShareOutcome = { kind: "shared"; message: string } | { kind: "cancelled" };

/** Échec du partage natif, avec un message prêt à afficher. */
export class ShareError extends Error {}

type ShareDataWithFiles = {
  files: File[];
  title?: string;
};

type NavigatorWithShare = {
  share?: (data: ShareDataWithFiles) => Promise<void>;
  canShare?: (data: ShareDataWithFiles) => boolean;
};

/**
 * Indique si le partage système est disponible : toujours sous Tauri (la
 * commande native prend le relais), sinon selon la compatibilité du navigateur
 * avec l'API Web Share pour les fichiers (`navigator.share` + `canShare`).
 * Sert à désactiver le bouton « Partager » quand aucun chemin n'existe.
 */
export function isShareSupported(): boolean {
  if (isTauriRuntime()) return true;
  const nav = navigator as unknown as NavigatorWithShare;
  if (typeof nav.share !== "function") return false;
  if (typeof nav.canShare !== "function") return true;
  try {
    // Sondage minimal : certains navigateurs exposent `share` mais refusent les fichiers.
    const probe = new File(["qrcode-studio"], "probe.png", { type: "image/png" });
    return nav.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

/**
 * Partage natif du QR rendu (aucun serveur) :
 * 1. API Web Share si le webview l'expose ;
 * 2. sous Tauri, feuille de partage du système (macOS) ou fichier déposé et
 *    révélé dans le dossier système ;
 * 3. sinon, échec avec un message prêt à afficher — sur le web, le bouton est
 *    désactivé en amont (voir `isShareSupported`).
 */
export async function shareQrImage({
  design,
  payload,
  qrSize,
  fileName,
  format = "png",
  barcode,
}: {
  design: QrDesign;
  payload: string;
  qrSize: number;
  fileName: string;
  format?: ExportFormat;
  barcode?: BarcodeExportInput;
}): Promise<ShareOutcome> {
  const blob = await renderExportBlob({ design, payload, qrSize, format, barcode });
  const name = `${sanitizeFileName(fileName)}.${format}`;

  const nav = navigator as unknown as NavigatorWithShare;
  if (typeof nav.share === "function") {
    const file = new File([blob], name, { type: blob.type });
    const canShare = typeof nav.canShare !== "function" || nav.canShare({ files: [file] });
    if (canShare) {
      try {
        await nav.share({ files: [file], title: fileName });
        return { kind: "shared", message: `${name} partagé via le menu système.` };
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return { kind: "cancelled" };
        }
        // Sinon, on tente le partage natif via Tauri.
      }
    }
  }

  // Feuille de partage du système, uniquement sous Tauri (desktop).
  if (isTauriRuntime()) {
    const dataBase64 = await blobToBase64(blob);
    try {
      const method = await invoke<string>("share_image", { name, dataBase64 });
      return {
        kind: "shared",
        message:
          method === "sheet"
            ? `Menu de partage ouvert pour ${name}.`
            : `${name} enregistré et affiché dans le dossier système.`,
      };
    } catch {
      throw new ShareError(
        "Partage natif indisponible ici. Exportez le fichier puis partagez-le depuis votre dossier.",
      );
    }
  }

  // Navigateur sans Web Share exploitable : le bouton devrait être désactivé.
  throw new ShareError("Le partage n'est pas pris en charge par ce navigateur.");
}
