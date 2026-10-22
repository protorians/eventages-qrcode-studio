/**
 * Intégration Tauri du CLI `eventages-qr` : état de disponibilité,
 * installation et retrait des commandes `eventages-qr` / `eqr` dans le
 * PATH depuis les paramètres de l'application. Hors shell Tauri, l'état est
 * simplement indisponible (l'interface n'affiche alors pas de contrôle).
 */

import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "./tauri";

export type CliStatus = {
  /** Le script CLI du dépôt est présent (app lancée depuis le dépôt). */
  available: boolean;
  /** Les commandes `eventages-qr` et `eqr` sont posées dans le PATH. */
  installed: boolean;
  /** Chemin du script source `cli/eventages-qr.ts`, si disponible. */
  scriptPath: string | null;
  /** Dossier du PATH où les commandes sont (ou seraient) posées. */
  binDir: string | null;
  /** Noms de commande exposés. */
  commands: string[];
  /** Message lisible expliquant l'état ou l'échec. */
  message: string;
};

/** Lit l'état courant, ou `null` hors shell Tauri. */
export async function fetchCliStatus(): Promise<CliStatus | null> {
  if (!isTauriRuntime()) return null;
  return invoke<CliStatus>("cli_status");
}

/** Installe les commandes dans le PATH et renvoie le nouvel état. */
export async function installCli(): Promise<CliStatus> {
  return invoke<CliStatus>("cli_install");
}

/** Retire les commandes du PATH et renvoie le nouvel état. */
export async function uninstallCli(): Promise<CliStatus> {
  return invoke<CliStatus>("cli_uninstall");
}
