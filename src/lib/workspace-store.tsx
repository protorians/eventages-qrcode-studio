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
  useBuilder,
  WORKSPACE_TABS_STORAGE_KEY,
} from "@/lib/builder-store";

/** Onglet « Accueil » : toujours présent, non fermable. */
export const HOME_TAB_ID = "__home__";

export type WorkspaceContextValue = {
  /** Onglet affiché : HOME_TAB_ID ou l'ID d'un projet ouvert. */
  activeTabId: string;
  /** IDs des projets ouverts dans un onglet, dans l'ordre du ruban. */
  openProjectIds: string[];
  /** Affiche l'onglet Accueil. */
  openHome: () => void;
  /**
   * Ouvre (ou réactive) l'onglet d'un projet : le brouillon à l'écran est
   * d'abord écrit dans le registre, puis le projet cible est hydraté.
   */
  openProjectTab: (projectId: string) => void;
  /** Ferme l'onglet d'un projet et active l'onglet voisin (ou l'accueil). */
  closeProjectTab: (projectId: string) => void;
  /** Crée un projet et ouvre directement son onglet. */
  createProjectTab: () => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

/**
 * État des onglets de l'espace de travail, façon Figma : l'onglet Accueil
 * (gestionnaire de projets) est permanent, chaque projet ouvert ajoute un
 * onglet fermable au-dessus de l'atelier. L'éditeur ne porte qu'un brouillon
 * à la fois : changer d'onglet l'écrit dans le registre puis recharge celui
 * du projet visé — les onglets conservent donc leur état d'édition.
 */
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { state, projects, ready, newProject, openProject, flushActiveProject } =
    useBuilder();
  const [tabOrder, setTabOrder] = useState<string[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>(HOME_TAB_ID);

  const openProjectTab = useCallback(
    (projectId: string) => {
      if (!projects.some((project) => project.id === projectId)) return;
      if (state.projectId !== projectId) {
        // Écrit le brouillon à l'écran avant de charger le projet visé.
        flushActiveProject();
        openProject(projectId);
      }
      setTabOrder((prev) => (prev.includes(projectId) ? prev : [...prev, projectId]));
      setActiveTabId(projectId);
    },
    [projects, state.projectId, flushActiveProject, openProject],
  );

  const openHome = useCallback(() => setActiveTabId(HOME_TAB_ID), []);

  const closeProjectTab = useCallback(
    (projectId: string) => {
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
    [tabOrder, activeTabId, openProjectTab],
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
  useEffect(() => {
    if (!restoredRef.current) return;
    try {
      window.localStorage.setItem(
        WORKSPACE_TABS_STORAGE_KEY,
        JSON.stringify({ order: tabOrder, active: activeTabId }),
      );
    } catch {
      // Stockage indisponible : les onglets restent en mémoire.
    }
  }, [tabOrder, activeTabId]);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      activeTabId,
      openProjectIds: tabOrder,
      openHome,
      openProjectTab,
      closeProjectTab,
      createProjectTab,
    }),
    [activeTabId, tabOrder, openHome, openProjectTab, closeProjectTab, createProjectTab],
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
