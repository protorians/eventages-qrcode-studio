import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  useBuilder,
  WORKSPACE_TABS_STORAGE_KEY,
} from "@/lib/builder-store";
import { describeError } from "@/lib/qcp";
import { ImportCancelled, type ImportStage } from "@/lib/qr-import";

/** Onglet « Accueil » : toujours présent, non fermable. */
export const HOME_TAB_ID = "__home__";

/**
 * Onglet d'import transitoire : héberge la conversion image → projet le temps
 * du traitement, puis se transforme en onglet du projet créé. Jamais persisté
 * ni enregistré dans le registre des projets.
 */
export const IMPORT_TAB_ID = "__import__";

/** État d'une conversion en cours (panneau de progression de l'onglet dédié). */
export type ImportTask = {
  id: string;
  /** Chemin du fichier source (image, SVG ou PDF). */
  path: string;
  /** Nom du fichier, affiché tel quel dans l'onglet et le panneau. */
  fileName: string;
  /** Progression globale, de 0 à 100. */
  percent: number;
  /** Étape courante de la conversion. */
  stage: ImportStage;
  status: "running" | "error";
  /** Message d'erreur prêt à afficher (statut « error »). */
  error: string | null;
};

export type WorkspaceContextValue = {
  /** Onglet affiché : HOME_TAB_ID, IMPORT_TAB_ID ou l'ID d'un projet ouvert. */
  activeTabId: string;
  /** IDs des projets ouverts dans un onglet, dans l'ordre du ruban. */
  openProjectIds: string[];
  /** Conversion d'un fichier en projet, en cours dans l'onglet d'import. */
  importTask: ImportTask | null;
  /** Affiche l'onglet Accueil. */
  openHome: () => void;
  /**
   * Ouvre (ou réactive) l'onglet d'un projet : le brouillon à l'écran est
   * d'abord écrit dans le registre, puis le projet cible est hydraté.
   * Fonctionne aussi pour un projet enregistré dans le même cycle
   * (ouverture d'un .qcp, import d'un QR).
   */
  openProjectTab: (projectId: string) => void;
  /** Ferme l'onglet d'un projet et active l'onglet voisin (ou l'accueil). */
  closeProjectTab: (projectId: string) => void;
  /** Crée un projet et ouvre directement son onglet. */
  createProjectTab: () => void;
  /**
   * Convertit un fichier image/SVG/PDF (QR ou code-barres) en projet :
   * ouvre l'onglet d'import avec son panneau de progression, puis transforme
   * l'onglet en projet à la fin du traitement. Un import déjà en cours est
   * annulé et remplacé.
   */
  startQrImport: (path: string) => void;
  /** Abandonne l'import en cours (résultat jeté) et ferme son onglet. */
  cancelImport: () => void;
  /** Relance la conversion du fichier de la tâche courante (après échec). */
  retryImport: () => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

/** Identifiant de tâche d'import (UUID, repli déterministe hors crypto). */
function createTaskId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `import-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * État des onglets de l'espace de travail, façon Figma : l'onglet Accueil
 * (gestionnaire de projets) est permanent, chaque projet ouvert ajoute un
 * onglet fermable au-dessus de l'atelier — plus un onglet transitoire pendant
 * une conversion image → projet. L'éditeur ne porte qu'un brouillon à la
 * fois : changer d'onglet l'écrit dans le registre puis recharge celui du
 * projet visé — les onglets conservent donc leur état d'édition.
 */
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const {
    state,
    projects,
    ready,
    newProject,
    openProject,
    flushActiveProject,
    newProjectFromQr,
  } = useBuilder();
  const [tabOrder, setTabOrder] = useState<string[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>(HOME_TAB_ID);
  const [importTask, setImportTask] = useState<ImportTask | null>(null);

  // Miroir de la tâche courante (lecture sans délai dans les callbacks) et
  // tâches annulées : leur résultat arrivera mais sera jeté — le décodage
  // backend, déjà lancé, ne peut pas être interrompu sans dommage.
  const importTaskRef = useRef<ImportTask | null>(null);
  const cancelledTaskIds = useRef(new Set<string>());

  /** Remplace la tâche courante (ref et état toujours d'accord). */
  const setTask = useCallback((task: ImportTask | null) => {
    importTaskRef.current = task;
    setImportTask(task);
  }, []);

  /** Met à jour la tâche désignée si elle est toujours la tâche affichée. */
  const patchTask = useCallback((id: string, patch: Partial<ImportTask>) => {
    setImportTask((current) => {
      if (!current || current.id !== id) return current;
      const next = { ...current, ...patch };
      importTaskRef.current = next;
      return next;
    });
  }, []);

  const openProjectTab = useCallback((projectId: string) => {
    // Activation immédiate de l'onglet ; l'écriture du brouillon quitté et le
    // chargement du projet visé sont délégués à l'effet de synchronisation
    // ci-dessous. Indispensable pour les projets enregistrés dans le même
    // cycle (ouverture d'un .qcp, import d'un QR) : le snapshot `projects`
    // de ce rendu ne contient pas encore leur ID et rejetterait l'ouverture.
    setTabOrder((prev) => (prev.includes(projectId) ? prev : [...prev, projectId]));
    setActiveTabId(projectId);
  }, []);

  /** Lance le traitement d'une tâche d'import, puis bascule l'onglet. */
  const runQrImport = useCallback(
    (task: ImportTask) => {
      void (async () => {
        try {
          const projectId = await newProjectFromQr(task.path, {
            onProgress: (step) =>
              patchTask(task.id, { percent: step.percent, stage: step.stage }),
            isCancelled: () => cancelledTaskIds.current.has(task.id),
          });
          if (cancelledTaskIds.current.has(task.id)) {
            cancelledTaskIds.current.delete(task.id);
            if (importTaskRef.current?.id === task.id) setTask(null);
            return;
          }
          cancelledTaskIds.current.delete(task.id);
          // Succès : l'onglet d'import devient l'onglet du projet créé.
          setTask(null);
          setTabOrder((prev) => {
            const rest = prev.filter((tabId) => tabId !== IMPORT_TAB_ID);
            return rest.includes(projectId) ? rest : [...rest, projectId];
          });
          setActiveTabId(projectId);
        } catch (cause) {
          // Annulation : nettoyage silencieux, sans erreur affichée.
          if (cause instanceof ImportCancelled) {
            cancelledTaskIds.current.delete(task.id);
            if (importTaskRef.current?.id === task.id) setTask(null);
            return;
          }
          patchTask(task.id, {
            status: "error",
            percent: 100,
            error: describeError(cause, "Import du QR code impossible."),
          });
        }
      })();
    },
    [newProjectFromQr, patchTask, setTask],
  );

  const startQrImport = useCallback(
    (path: string) => {
      // Un seul import à la fois : la tâche précédente est annulée (son
      // résultat sera jeté) et son panneau est repris par la nouvelle.
      const previous = importTaskRef.current;
      if (previous) cancelledTaskIds.current.add(previous.id);
      const task: ImportTask = {
        id: createTaskId(),
        path,
        fileName: path.split(/[\\/]/).pop() || path,
        percent: 0,
        stage: "open",
        status: "running",
        error: null,
      };
      setTask(task);
      setTabOrder((prev) =>
        prev.includes(IMPORT_TAB_ID) ? prev : [...prev, IMPORT_TAB_ID],
      );
      setActiveTabId(IMPORT_TAB_ID);
      runQrImport(task);
    },
    [runQrImport, setTask],
  );

  const cancelImport = useCallback(() => {
    const task = importTaskRef.current;
    if (task) cancelledTaskIds.current.add(task.id);
    setTask(null);
    const index = tabOrder.indexOf(IMPORT_TAB_ID);
    if (index < 0) return;
    const nextOrder = tabOrder.filter((tabId) => tabId !== IMPORT_TAB_ID);
    setTabOrder(nextOrder);
    if (activeTabId !== IMPORT_TAB_ID) return;
    // Le voisin reprend la main, sinon l'accueil.
    const nextId = nextOrder[Math.min(index, nextOrder.length - 1)];
    if (nextId) {
      openProjectTab(nextId);
    } else {
      setActiveTabId(HOME_TAB_ID);
    }
  }, [tabOrder, activeTabId, openProjectTab, setTask]);

  const retryImport = useCallback(() => {
    const task = importTaskRef.current;
    if (task) startQrImport(task.path);
  }, [startQrImport]);

  // Changement d'onglet actif : une fois le rendu à jour (registre et état
  // inclus), le brouillon de l'onglet quittée est écrit dans le registre puis
  // le projet visé est chargé. Passé avant le paint (useLayoutEffect) pour
  // qu'aucune frame ne montre l'ancien brouillon sous le nouvel onglet.
  useLayoutEffect(() => {
    if (activeTabId === HOME_TAB_ID || activeTabId === IMPORT_TAB_ID) return;
    // Déjà le brouillon courant : rien à écrire ni recharger (projet
    // fraîchement enregistré, ou onglet réactivée à l'identique).
    if (state.projectId === activeTabId) return;
    if (!projects.some((project) => project.id === activeTabId)) return;
    flushActiveProject();
    openProject(activeTabId);
  }, [activeTabId, state.projectId, projects, flushActiveProject, openProject]);

  const openHome = useCallback(() => setActiveTabId(HOME_TAB_ID), []);

  const closeProjectTab = useCallback(
    (projectId: string) => {
      // Fermer l'onglet d'import revient à annuler la conversion en cours.
      if (projectId === IMPORT_TAB_ID) {
        cancelImport();
        return;
      }
      const index = tabOrder.indexOf(projectId);
      if (index < 0) return;
      const nextOrder = tabOrder.filter((id) => id !== projectId);
      setTabOrder(nextOrder);
      if (activeTabId !== projectId) return;
      // Le voisin de droite reprend la main, sinon celui de gauche, sinon l'accueil.
      const nextId = nextOrder[Math.min(index, nextOrder.length - 1)];
      if (nextId) {
        openProjectTab(nextId);
      } else {
        setActiveTabId(HOME_TAB_ID);
      }
    },
    [tabOrder, activeTabId, openProjectTab, cancelImport],
  );

  const createProjectTab = useCallback(() => {
    const id = newProject();
    setTabOrder((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setActiveTabId(id);
  }, [newProject]);

  // Restauration des onglets de la session précédente (une seule fois).
  // Le brouillon du projet actif restauré a déjà été hydraté au démarrage
  // par BuilderProvider, qui lit la même clé.
  const restoredRef = useRef(false);
  useEffect(() => {
    if (!ready || restoredRef.current) return;
    restoredRef.current = true;
    let saved: { order?: unknown; active?: unknown } | null = null;
    try {
      const raw = window.localStorage.getItem(WORKSPACE_TABS_STORAGE_KEY);
      if (raw) saved = JSON.parse(raw) as { order?: unknown; active?: unknown };
    } catch {
      // Clé illisible : session vierge.
    }
    if (!saved) return;
    const known = new Set(projects.map((project) => project.id));
    const order = Array.isArray(saved.order)
      ? saved.order.filter(
          (id): id is string => typeof id === "string" && known.has(id),
        )
      : [];
    const active = typeof saved.active === "string" ? saved.active : HOME_TAB_ID;
    if (order.length > 0) setTabOrder(order);
    if (active !== HOME_TAB_ID && known.has(active)) {
      openProjectTab(active);
    } else {
      setActiveTabId(HOME_TAB_ID);
    }
  }, [ready, projects, openProjectTab]);

  // Persistance des onglets pour la session suivante. Elle ne démarre qu'
  // après la restauration : sinon le montage écraserait les onglets
  // sauvegardés avec l'état initial vide avant qu'ils ne soient relus.
  // L'onglet d'import est transitoire : jamais persisté, ni en ordre ni en
  // onglet actif — une session relancée reprend sur l'accueil.
  useEffect(() => {
    if (!restoredRef.current) return;
    try {
      window.localStorage.setItem(
        WORKSPACE_TABS_STORAGE_KEY,
        JSON.stringify({
          order: tabOrder.filter((tabId) => tabId !== IMPORT_TAB_ID),
          active: activeTabId === IMPORT_TAB_ID ? HOME_TAB_ID : activeTabId,
        }),
      );
    } catch {
      // Stockage indisponible : les onglets restent en mémoire.
    }
  }, [tabOrder, activeTabId]);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      activeTabId,
      openProjectIds: tabOrder,
      importTask,
      openHome,
      openProjectTab,
      closeProjectTab,
      createProjectTab,
      startQrImport,
      cancelImport,
      retryImport,
    }),
    [
      activeTabId,
      tabOrder,
      importTask,
      openHome,
      openProjectTab,
      closeProjectTab,
      createProjectTab,
      startQrImport,
      cancelImport,
      retryImport,
    ],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace doit être utilisé dans un WorkspaceProvider");
  }
  return context;
}
