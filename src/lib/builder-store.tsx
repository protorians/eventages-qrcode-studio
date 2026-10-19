import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type Dispatch,
  type ReactNode,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import {
  defaultValuesFor,
  formProgress,
  firstMissingField,
  getQrType,
  QR_TYPE_DEFAULT,
  type QrField,
  type QrType,
  type QrValues,
} from "@/lib/qr-catalog";
import { DEFAULT_DESIGN, type QrDesign } from "@/lib/qr-design";
import { buildPayload } from "@/lib/qr-payload";
import { sanitizeFileName } from "@/lib/qr-export";

import { applyQcpManifest, buildQcpManifest, type QcpFilePayload } from "@/lib/qcp";

export type BuilderModule =
  | "content"
  | "style"
  | "corners"
  | "logo"
  | "frame"
  | "export";

export const BUILDER_MODULES: { id: BuilderModule; label: string }[] = [
  { id: "content", label: "Contenu" },
  { id: "style", label: "Style" },
  { id: "corners", label: "Coins" },
  { id: "logo", label: "Logo" },
  { id: "frame", label: "Cadre" },
  { id: "export", label: "Export" },
];

export type BuilderState = {
  projectId: string;
  projectName: string;
  typeId: string;
  valuesByType: Record<string, QrValues>;
  design: QrDesign;
  activeModule: BuilderModule;
  mockupId: string;
  saveSize: number;
  /** Enregistrement local du brouillon (spec 001, FR-8). */
  savedAt: number | null;
};

export type BuilderAction =
  | { type: "setProjectName"; name: string }
  | { type: "setType"; typeId: string }
  | { type: "setValue"; field: string; value: string }
  | { type: "patchDesign"; patch: Partial<QrDesign> }
  | { type: "resetDesign" }
  | { type: "setModule"; module: BuilderModule }
  | { type: "setMockup"; mockupId: string }
  | { type: "setSaveSize"; size: number }
  | { type: "markSaved"; at: number }
  | { type: "hydrate"; state: BuilderState };

/** Projet complet stocké dans le registre local (100 % hors ligne). */
export type StoredProject = {
  id: string;
  createdAt: number;
  updatedAt: number;
  state: BuilderState;
};

/** Résumé léger affiché dans le gestionnaire de projets. */
export type ProjectSummary = {
  id: string;
  name: string;
  typeId: string;
  progress: number;
  createdAt: number;
  updatedAt: number;
};

type ProjectsData = {
  activeId: string;
  items: StoredProject[];
};

type ProjectsAction =
  | { type: "hydrate"; data: ProjectsData }
  | { type: "upsert"; project: StoredProject }
  | { type: "add"; project: StoredProject }
  | { type: "insert"; project: StoredProject }
  | { type: "remove"; id: string };

const PROJECTS_STORAGE_KEY = "qrcode-studio:projects:v1";
/** Ancien format (brouillon unique) migré automatiquement au premier lancement. */
const LEGACY_STORAGE_KEY = "qrcode-studio:builder:v1";

function createProjectId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Nom de projet unique à la Photoshop : « Sans titre », « Sans titre 2 »… */
function uniqueProjectName(existing: string[]): string {
  const base = "Sans titre";
  if (!existing.includes(base)) return base;
  let index = 2;
  while (existing.includes(`${base} ${index}`)) index += 1;
  return `${base} ${index}`;
}

function createInitialState(projectId = createProjectId()): BuilderState {
  const type = getQrType(QR_TYPE_DEFAULT);
  return {
    projectId,
    projectName: "Sans titre",
    typeId: type.id,
    valuesByType: { [type.id]: defaultValuesFor(type) },
    design: { ...DEFAULT_DESIGN },
    activeModule: "content",
    mockupId: "plain",
    saveSize: 1024,
    savedAt: null,
  };
}

/** Nettoie et complète un projet lu depuis le stockage local. */
function normalizeStoredProject(raw: unknown): StoredProject | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<StoredProject>;
  if (
    typeof candidate.id !== "string" ||
    !candidate.id ||
    !candidate.state ||
    typeof candidate.state !== "object" ||
    typeof candidate.state.typeId !== "string"
  ) {
    return null;
  }
  const now = Date.now();
  // Les anciens enregistrements contenaient un statut de publication, retiré.
  const legacyState = { ...candidate.state } as Record<string, unknown>;
  delete legacyState.status;
  const state: BuilderState = {
    ...createInitialState(candidate.id),
    ...(legacyState as BuilderState),
    design: { ...DEFAULT_DESIGN, ...(candidate.state.design ?? {}) },
    projectId: candidate.id,
  };
  return {
    id: candidate.id,
    createdAt: typeof candidate.createdAt === "number" ? candidate.createdAt : now,
    updatedAt: typeof candidate.updatedAt === "number" ? candidate.updatedAt : now,
    state,
  };
}

function projectsReducer(state: ProjectsData, action: ProjectsAction): ProjectsData {
  switch (action.type) {
    case "hydrate":
      return action.data;

    case "upsert": {
      const items = [...state.items];
      const index = items.findIndex((project) => project.id === action.project.id);
      if (index >= 0) {
        // La date de création reste celle du projet d'origine.
        items[index] = { ...action.project, createdAt: items[index].createdAt };
      } else {
        items.push(action.project);
      }
      return { ...state, items };
    }

    case "add":
      return { activeId: action.project.id, items: [...state.items, action.project] };

    case "insert":
      return { ...state, items: [...state.items, action.project] };

    case "remove": {
      const items = state.items.filter((project) => project.id !== action.id);
      if (state.activeId !== action.id) return { ...state, items };
      return { activeId: items[0]?.id ?? "", items };
    }

    default:
      return state;
  }
}

function reducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case "setProjectName":
      return { ...state, projectName: action.name };

    case "setType": {
      if (action.typeId === state.typeId) return state;
      const type = getQrType(action.typeId);
      return {
        ...state,
        typeId: type.id,
        valuesByType: {
          ...state.valuesByType,
          [type.id]: state.valuesByType[type.id] ?? defaultValuesFor(type),
        },
      };
    }

    case "setValue": {
      const current = state.valuesByType[state.typeId] ?? {};
      return {
        ...state,
        valuesByType: {
          ...state.valuesByType,
          [state.typeId]: { ...current, [action.field]: action.value },
        },
      };
    }

    case "patchDesign":
      return { ...state, design: { ...state.design, ...action.patch } };

    case "resetDesign":
      return { ...state, design: { ...DEFAULT_DESIGN } };

    case "setModule":
      return { ...state, activeModule: action.module };

    case "setMockup":
      return { ...state, mockupId: action.mockupId };

    case "setSaveSize":
      return { ...state, saveSize: action.size };

    case "markSaved": {
      // Idempotent à la minute près : évite une boucle d'enregistrement infinie.
      const sameMinute =
        Math.floor((state.savedAt ?? 0) / 60_000) === Math.floor(action.at / 60_000);
      return sameMinute ? state : { ...state, savedAt: action.at };
    }

    case "hydrate":
      return action.state;

    default:
      return state;
  }
}

export type BuilderContextValue = {
  state: BuilderState;
  dispatch: Dispatch<BuilderAction>;
  type: QrType;
  values: QrValues;
  payload: string;
  debouncedPayload: string;
  missingField: QrField | null;
  progress: number;
  setValue: (field: string, value: string) => void;
  patchDesign: (patch: Partial<QrDesign>) => void;
  /** Date du dernier enregistrement local, en heure courte. */
  savedLabel: string | null;
  /** Projets du registre local, triés du plus récent au plus ancien. */
  projects: ProjectSummary[];
  newProject: () => void;
  openProject: (id: string) => void;
  duplicateProject: (id: string) => void;
  deleteProject: (id: string) => void;
  /** Écrit le projet actif dans un fichier .qcp ; renvoie le chemin. */
  saveProjectAsQcp: () => Promise<string>;
  /** Ouvre un fichier .qcp et l'ajoute au registre comme nouveau projet. */
  openProjectFromQcp: (path: string) => Promise<void>;
};

const BuilderContext = createContext<BuilderContextValue | null>(null);

/** Délai de debounce avant régénération de l'aperçu (spec 001, FR-6). */
const PREVIEW_DEBOUNCE_MS = 180;

/** Délai de debounce avant enregistrement local du projet actif. */
const SAVE_DEBOUNCE_MS = 400;

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function BuilderProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const [projectsData, projectsDispatch] = useReducer(projectsReducer, {
    activeId: "",
    items: [],
  } satisfies ProjectsData);
  // Évite d'écraser le registre avant la fin de la restauration.
  const [ready, setReady] = useState(false);

  // Restauration du registre local (aucun appel réseau).
  useEffect(() => {
    let loaded: StoredProject[] = [];
    let activeId = "";
    try {
      const raw = window.localStorage.getItem(PROJECTS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ProjectsData>;
        loaded = Array.isArray(parsed.items)
          ? parsed.items
              .map(normalizeStoredProject)
              .filter((project): project is StoredProject => project !== null)
          : [];
        if (parsed.activeId && loaded.some((project) => project.id === parsed.activeId)) {
          activeId = parsed.activeId;
        }
      } else {
        // Migration de l'ancien brouillon unique vers le registre multi-projets.
        const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacyRaw) {
          const legacy = JSON.parse(legacyRaw) as Partial<BuilderState>;
          const now = Date.now();
          const migrated = normalizeStoredProject({
            id: createProjectId(),
            createdAt: now,
            updatedAt: now,
            state: { ...createInitialState(), ...legacy },
          });
          if (migrated) loaded = [migrated];
        }
      }
    } catch {
      // Un registre illisible ne doit jamais bloquer le démarrage.
      loaded = [];
    }

    if (loaded.length === 0) {
      setReady(true);
      return;
    }
    activeId = activeId || loaded[0].id;
    projectsDispatch({ type: "hydrate", data: { activeId, items: loaded } });
    const active = loaded.find((project) => project.id === activeId);
    if (active) dispatch({ type: "hydrate", state: active.state });
    setReady(true);
  }, []);

  // Enregistrement automatique du projet actif dans le registre, jamais expirant.
  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => {
      projectsDispatch({
        type: "upsert",
        project: { id: state.projectId, createdAt: Date.now(), updatedAt: Date.now(), state },
      });
      dispatch({ type: "markSaved", at: Date.now() });
    }, SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [state, ready]);

  // Persistance du registre complet.
  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(
        PROJECTS_STORAGE_KEY,
        JSON.stringify({ activeId: state.projectId, items: projectsData.items }),
      );
    } catch {
      // Stockage indisponible : les projets restent en mémoire.
    }
  }, [projectsData, ready, state.projectId]);

  const type = useMemo(() => getQrType(state.typeId), [state.typeId]);
  const values = useMemo(
    () => state.valuesByType[state.typeId] ?? defaultValuesFor(type),
    [state.valuesByType, state.typeId, type],
  );

  const payload = useMemo(() => buildPayload(type, values), [type, values]);
  const debouncedPayload = useDebounced(payload, PREVIEW_DEBOUNCE_MS);

  const missingField = useMemo(() => firstMissingField(type, values), [type, values]);
  const progress = useMemo(() => formProgress(type, values), [type, values]);

  const projects = useMemo<ProjectSummary[]>(() => {
    return projectsData.items
      .map((project) => {
        const projectType = getQrType(project.state.typeId);
        const projectValues =
          project.state.valuesByType[project.state.typeId] ?? defaultValuesFor(projectType);
        return {
          id: project.id,
          name: project.state.projectName,
          typeId: project.state.typeId,
          progress: formProgress(projectType, projectValues),
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        };
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [projectsData.items]);

  const openProject = useCallback(
    (id: string) => {
      const project = projectsData.items.find((item) => item.id === id);
      if (!project) return;
      dispatch({
        type: "hydrate",
        state: {
          ...project.state,
          projectId: project.id,
          activeModule: "content",
          design: { ...DEFAULT_DESIGN, ...project.state.design },
        },
      });
    },
    [projectsData.items],
  );

  const newProject = useCallback(() => {
    const id = createProjectId();
    const initialState = createInitialState(id);
    initialState.projectName = uniqueProjectName(
      projectsData.items.map((item) => item.state.projectName),
    );
    const now = Date.now();
    projectsDispatch({
      type: "add",
      project: { id, createdAt: now, updatedAt: now, state: initialState },
    });
    dispatch({ type: "hydrate", state: initialState });
  }, [projectsData.items]);

  const duplicateProject = useCallback(
    (id: string) => {
      const source = projectsData.items.find((item) => item.id === id);
      if (!source) return;
      const names = projectsData.items.map((item) => item.state.projectName);
      const baseName = source.state.projectName;
      let name = `${baseName} (copie)`;
      if (names.includes(name)) {
        let index = 2;
        while (names.includes(`${baseName} (copie ${index})`)) index += 1;
        name = `${baseName} (copie ${index})`;
      }
      const copyId = createProjectId();
      const now = Date.now();
      const copyState: BuilderState = {
        ...source.state,
        projectId: copyId,
        projectName: name,
        activeModule: "content",
        savedAt: null,
      };
      projectsDispatch({
        type: "insert",
        project: { id: copyId, createdAt: now, updatedAt: now, state: copyState },
      });
    },
    [projectsData.items],
  );

  const deleteProject = useCallback(
    (id: string) => {
      const remaining = projectsData.items.filter((item) => item.id !== id);
      projectsDispatch({ type: "remove", id });
      if (state.projectId !== id) return;
      const next = remaining[0];
      if (next) {
        dispatch({
          type: "hydrate",
          state: {
            ...next.state,
            projectId: next.id,
            activeModule: "content",
            design: { ...DEFAULT_DESIGN, ...next.state.design },
          },
        });
        return;
      }
      // Plus aucun projet : on repart d'une toile vierge.
      const fresh = createInitialState();
      const now = Date.now();
      projectsDispatch({
        type: "add",
        project: { id: fresh.projectId, createdAt: now, updatedAt: now, state: fresh },
      });
      dispatch({ type: "hydrate", state: fresh });
    },
    [projectsData.items, state.projectId],
  );

  /** Enregistre le projet dans le registre et en fait le projet actif. */
  const registerAndActivate = useCallback((imported: BuilderState) => {
    const now = Date.now();
    projectsDispatch({
      type: "add",
      project: { id: imported.projectId, createdAt: now, updatedAt: now, state: imported },
    });
    dispatch({ type: "hydrate", state: imported });
  }, []);

  const saveProjectAsQcp = useCallback(async (): Promise<string> => {
    const { manifest, assets } = buildQcpManifest({
      name: state.projectName,
      typeId: state.typeId,
      valuesByType: state.valuesByType,
      design: state.design,
      mockupId: state.mockupId,
      saveSize: state.saveSize,
    });
    const target = await save({
      title: "Enregistrer le projet",
      defaultPath: `${sanitizeFileName(state.projectName)}.qcp`,
      filters: [{ name: "Projet QR Code Studio", extensions: ["qcp"] }],
    });
    if (!target) return "";
    return await invoke<string>("save_project_qcp", { path: target, manifest, assets });
  }, [state]);

  const openProjectFromQcp = useCallback(
    async (path: string): Promise<void> => {
      const file = await invoke<QcpFilePayload>("open_project_qcp", { path });
      const data = applyQcpManifest({ manifest: file.manifest, assets: file.assets ?? [] });
      registerAndActivate({
        projectId: createProjectId(),
        projectName: data.name,
        typeId: data.typeId,
        valuesByType: data.valuesByType,
        design: data.design,
        activeModule: "content",
        mockupId: data.mockupId,
        saveSize: data.saveSize,
        savedAt: null,
      });
    },
    [registerAndActivate],
  );

  const setValue = useCallback(
    (field: string, value: string) => dispatch({ type: "setValue", field, value }),
    [],
  );

  const patchDesign = useCallback(
    (patch: Partial<QrDesign>) => dispatch({ type: "patchDesign", patch }),
    [],
  );

  const savedLabel = useMemo(() => {
    if (!state.savedAt) return null;
    return new Date(state.savedAt).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [state.savedAt]);

  const value = useMemo<BuilderContextValue>(
    () => ({
      state,
      dispatch,
      type,
      values,
      payload,
      debouncedPayload,
      missingField,
      progress,
      setValue,
      patchDesign,
      savedLabel,
      projects,
      newProject,
      openProject,
      duplicateProject,
      deleteProject,
      saveProjectAsQcp,
      openProjectFromQcp,
    }),
    [
      state,
      type,
      values,
      payload,
      debouncedPayload,
      missingField,
      progress,
      setValue,
      patchDesign,
      savedLabel,
      projects,
      newProject,
      openProject,
      duplicateProject,
      deleteProject,
      saveProjectAsQcp,
      openProjectFromQcp,
    ],
  );

  return <BuilderContext.Provider value={value}>{children}</BuilderContext.Provider>;
}

export function useBuilder(): BuilderContextValue {
  const context = useContext(BuilderContext);
  if (!context) {
    throw new Error("useBuilder doit être utilisé dans un BuilderProvider");
  }
  return context;
}
