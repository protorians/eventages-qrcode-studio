/**
 * Intégration Tauri du système de mise à jour : lecture de la dernière
 * release publiée du dépôt GitHub, téléchargement de l'artefact adapté à
 * l'OS avec progression, ouverture de l'installateur natif. Hors shell
 * Tauri, chaque fonction est un no-op sûr (l'interface n'affiche alors
 * rien). Les décisions — vérifier, télécharger, installer — appartiennent
 * à l'interface (use-updater.tsx) : ce module n'est qu'un pont vers les
 * commandes natives (src-tauri/src/updater.rs).
 */

import {invoke, Channel} from "@tauri-apps/api/core";
import { isTauriRuntime } from "./tauri";

/** Dépôt GitHub dont les releases font foi (miroir de updater.rs). */
export const GITHUB_REPO = "protorians/eventages-qrcode-studio";

/** État complet renvoyé par la commande native `updater_check`. */
export type UpdateCheckInfo = {
    /** Version installée (tauri.conf.json). */
    currentVersion: string;
    /** Dernière version publiée (sans « v ») — égale à currentVersion si rien de neuf. */
    latestVersion: string;
    /** Tag de la release (« v0.13.0 »), vide si aucune release publiée. */
    tag: string;
    /** Une version plus récente est disponible. */
    available: boolean;
    /** Artefact adapté à l'OS courant (null : aucune release publiée). */
    assetName: string | null;
    /** URL de téléchargement de cet artefact. */
    assetUrl: string | null;
    /** Taille de l'artefact en octets. */
    assetSize: number | null;
    /** Page GitHub de la release (notes, autres artefacts). */
    releaseUrl: string;
    /** Notes de version résumées (markdown nettoyé), si publiées. */
    releaseNotes: string | null;
    /** Date de publication ISO 8601. */
    publishedAt: string | null;
};

/** Progression du téléchargement, poussée par le canal Tauri. */
export type DownloadProgress = {
    received: number;
    total: number;
    /** 0 à 100, ou 0 si la taille totale est inconnue. */
    percent: number;
};

/** Vérifie la dernière release publiée, ou `null` hors shell Tauri. */
export async function fetchUpdateStatus(): Promise<UpdateCheckInfo | null> {
    if (!isTauriRuntime()) return null;
    return invoke<UpdateCheckInfo>("updater_check");
}

/** Télécharge l'artefact et pousse la progression ; renvoie le chemin local. */
export async function downloadUpdate(
    url: string,
    name: string,
    onProgress?: (progress: DownloadProgress) => void,
): Promise<string | null> {
    if (!isTauriRuntime()) return null;
    let channel: Channel<DownloadProgress> | undefined;
    if (onProgress) {
        channel = new Channel<DownloadProgress>();
        channel.onmessage = onProgress;
    }
    return invoke<string>("updater_download", {
        url,
        name,
        onProgress: channel,
    });
}

/** Ouvre l'installateur téléchargé avec l'outil natif de l'OS. */
export async function installUpdate(path: string): Promise<void> {
    if (!isTauriRuntime()) return;
    await invoke<void>("updater_install", { path });
}

/** Ouvre la page GitHub de la release (notes de version). */
export async function openReleasePage(url: string): Promise<void> {
    if (!isTauriRuntime()) return;
    await invoke<void>("updater_open_release", { url });
}

/** Taille lisible en Mo (plafond au dixième ; « — » si inconnue). */
export function formatAssetSize(size: number | null): string {
    if (size === null || size <= 0) return "—";
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
