/**
 * Système de mise à jour côté interface : un provider unique (monté dans
 * App.tsx) vérifie la dernière release GitHub au lancement, tient l'état
 * (disponible / téléchargement / installateur prêt) et expose les actions.
 *
 * - Réglage « mise à jour automatique » (use-settings.tsx, désactivé par
 *   défaut) : une version plus récente est téléchargée puis installée
 *   sans action de l'utilisateur, avec une notification système.
 * - Réglage désactivé : seule une notification signale la nouveauté et la
 *   barre de titre affiche une pastille ; l'installateur ne démarre que
 *   sur un clic explicite.
 *
 * Hors shell Tauri (navigateur), le provider reste inerte : aucun appel
 * réseau, aucun rendu conditionnel à traiter côté consommateurs.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import {
  downloadUpdate,
  fetchUpdateStatus,
  installUpdate,
  type DownloadProgress,
  type UpdateCheckInfo,
} from "@/lib/updater";
import { isTauriRuntime } from "@/lib/tauri";
import { translate } from "@/lib/i18n";
import { useSettings } from "@/hooks/use-settings";

/** États du cycle de vie du système de mise à jour. */
export type UpdaterStatus =
  | "idle" // inerte (hors Tauri) ou pas encore vérifié
  | "checking" // requête GitHub en cours
  | "uptodate" // vérifié : rien de plus récent
  | "available" // une version plus récente existe, en attente de décision
  | "downloading" // artefact en cours de réception
  | "ready" // installateur téléchargé, prêt à être lancé
  | "error"; // échec réseau ou d'installation

type UpdaterState = {
  status: UpdaterStatus;
  /** Détails de la release consultée (dernière vérification réussie). */
  info: UpdateCheckInfo | null;
  /** Message d'erreur lisible du dernier échec. */
  error: string | null;
  /** Avancement du téléchargement (0-100), null hors téléchargement. */
  progress: number | null;
  /** Chemin local de l'installateur téléchargé (état « ready »). */
  downloadedPath: string | null;
  /** « Ignorer » cliqué : pastille masquée jusqu'au prochain lancement. */
  dismissed: boolean;
};

type UpdaterContextValue = UpdaterState & {
  /** Vérification manuelle (paramètres, pastille de la barre de titre). */
  checkForUpdate: () => Promise<void>;
  /** Télécharge puis lance l'installateur (action de l'utilisateur). */
  installNow: () => Promise<void>;
  /** Masque la pastille de la barre de titre (session courante). */
  dismiss: () => void;
};

const UpdaterContext = createContext<UpdaterContextValue | null>(null);

/** Délai avant la vérification au lancement : laisser l'app démarrer. */
const STARTUP_DELAY_MS = 4_000;

/** Notification système, silencieuse si la permission manque. */
async function notifySystem(title: string, body: string): Promise<void> {
  if (!isTauriRuntime()) return;
  try {
    let granted = await isPermissionGranted();
    if (!granted) {
      granted = (await requestPermission()) === "granted";
    }
    if (granted) sendNotification({ title, body });
  } catch {
    // Notification impossible : la pastille de la barre de titre reste
    // le signal visible — jamais bloquant pour la mise à jour.
  }
}

export function UpdaterProvider({ children }: { children: ReactNode }) {
  const { autoUpdate } = useSettings();
  const [state, setState] = useState<UpdaterState>({
    status: "idle",
    info: null,
    error: null,
    progress: null,
    downloadedPath: null,
    dismissed: false,
  });

  // Réglage lu par référence pour les effets (éviter de re-vérifier quand
  // l'utilisateur bascule l'option en cours de route).
  const autoUpdateRef = useRef(autoUpdate);
  useEffect(() => {
    autoUpdateRef.current = autoUpdate;
  }, [autoUpdate]);

  /** Télécharge puis ouvre l'installateur ; utilisée par les deux flux. */
  const downloadAndInstall = useCallback(
    async (info: UpdateCheckInfo): Promise<boolean> => {
      if (!info.assetUrl || !info.assetName) {
        // Artefact absent pour cette plateforme : décliner vers la page de release.
        notifySystem(
          translate("updater.notify.failedTitle"),
          translate("updater.notify.noAssetBody"),
        );
        return false;
      }
      setState((current) => ({
        ...current,
        status: "downloading",
        error: null,
        progress: 0,
      }));
      const onProgress = (progress: DownloadProgress): void => {
        setState((current) => ({
          ...current,
          progress: progress.percent,
        }));
      };
      try {
        const path = await downloadUpdate(info.assetUrl, info.assetName, onProgress);
        if (!path) return false;
        setState((current) => ({
          ...current,
          status: "ready",
          progress: null,
          downloadedPath: path,
        }));
        notifySystem(
          translate("updater.notify.readyTitle"),
          translate("updater.notify.readyBody", { version: info.latestVersion }),
        );
        await installUpdate(path);
        return true;
      } catch (failure) {
        const message =
          failure instanceof Error && failure.message ? failure.message : String(failure);
        setState((current) => ({
          ...current,
          status: "error",
          progress: null,
          error: message,
        }));
        notifySystem(
          translate("updater.notify.failedTitle"),
          translate("updater.notify.failedBody", { error: message }),
        );
        return false;
      }
    },
    [],
  );

  /** Vérifie la release la plus récente ; déclenche le flux automatique. */
  const checkForUpdate = useCallback(async (): Promise<void> => {
    if (!isTauriRuntime()) return;
    setState((current) => ({
      ...current,
      status: "checking",
      error: null,
    }));
    try {
      const info = await fetchUpdateStatus();
      if (!info) return;
      if (!info.available) {
        setState((current) => ({
          ...current,
          status: "uptodate",
          info,
          progress: null,
          error: null,
        }));
        return;
      }
      setState((current) => ({
        ...current,
        status: "available",
        info,
        progress: null,
        error: null,
        // Nouvelle version : un « ignorer » antérieur ne s'applique plus.
        dismissed: false,
      }));
      if (autoUpdateRef.current) {
        // Flux automatique : téléchargement + installation immédiats.
        await downloadAndInstall(info);
      } else {
        // Flux manuel : notification + pastille, la main reste à l'utilisateur.
        notifySystem(
          translate("updater.notify.availableTitle"),
          translate("updater.notify.availableBody", { version: info.latestVersion }),
        );
      }
    } catch (failure) {
      const message =
        failure instanceof Error && failure.message ? failure.message : String(failure);
      setState((current) => ({ ...current, status: "error", error: message }));
    }
  }, [downloadAndInstall]);

  const installNow = useCallback(async (): Promise<void> => {
    const info = state.info;
    if (!info?.available) return;
    // Installateur déjà téléchargé : on le relance simplement.
    if (state.downloadedPath) {
      try {
        await installUpdate(state.downloadedPath);
      } catch (failure) {
        setState((current) => ({
          ...current,
          status: "error",
          error:
            failure instanceof Error && failure.message
              ? failure.message
              : String(failure),
        }));
      }
      return;
    }
    await downloadAndInstall(info);
  }, [state.info, state.downloadedPath, downloadAndInstall]);

  const dismiss = useCallback((): void => {
    setState((current) => ({ ...current, dismissed: true }));
  }, []);

  // Vérification unique au lancement (shell Tauri uniquement) ; relancée
  // si l'utilisateur active la mise à jour automatique plus tard.
  const performCheck = checkForUpdate;
  useEffect(() => {
    if (!isTauriRuntime()) return;
    const timer = window.setTimeout(() => {
      void performCheck();
    }, STARTUP_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [performCheck]);

  const value = useMemo<UpdaterContextValue>(
    () => ({
      ...state,
      checkForUpdate,
      installNow,
      dismiss,
    }),
    [state, checkForUpdate, installNow, dismiss],
  );

  return <UpdaterContext.Provider value={value}>{children}</UpdaterContext.Provider>;
}

export function useUpdater(): UpdaterContextValue {
  const context = useContext(UpdaterContext);
  if (!context) {
    throw new Error("useUpdater doit être utilisé dans un UpdaterProvider");
  }
  return context;
}
