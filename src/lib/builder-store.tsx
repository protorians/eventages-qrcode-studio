import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import { Channel } from "@tauri-apps/api/core";
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
import {
  DEFAULT_BARCODE_DESIGN,
  normalizeBarcodeDesign,
  type BarcodeDesign,
} from "@/lib/barcode";
import { buildPayload } from "@/lib/qr-payload";
import { sanitizeFileName } from "@/lib/qr-svg";
import {
  backendToOverall,
  contentFromPayload,
  designFromHints,
  hexFromImport,
  ImportCancelled,
  isBarcode1DFormat,
  type BackendImportProgress,
  type ImportProgressCallback,
  type ImportedDesignHints,
} from "@/lib/qr-import";
import { applyQcpManifest, buildQcpManifest, type QcpFilePayload } from "@/lib/qcp";
import { useSettings } from "@/hooks/use-settings";

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

/**
 * Modules applicables au type courant : le code-barres 1D n'a ni coins ni
 * logo (les deux casseraient la lecture au scan).
 */
export function modulesForType(typeId: string): { id: BuilderModule; label: string }[] {
  return typeId === "barcode"
    ? BUILDER_MODULES.filter((module) => module.id !== "corners" && module.id !== "logo")
    : BUILDER_MODULES;
}

export type BuilderState = {
  projectId: string;
  projectName: string;
  typeId: string;
  valuesByType: Record<string, QrValues>;
  design: QrDesign;
  /** Habillage du code-barres 1D (type « barcode » uniquement). */
  barcode: BarcodeDesign;
  activeModule: BuilderModule;
  mockupId: string;
  saveSize: number;
  /** Enregistrement local du brouillon (spec 001, FR-8). */
  savedAt: number | null;
  /**
   * Chemin du fichier .qrd lié au projet. Un projet lié s'écrit sur le disque
   * sans repasser par la boîte de dialogue : enregistrement manuel (⌘S) et
   * enregistrement automatique écrivent directement à cet emplacement.
   */
  filePath: string | null;
  /**
   * Chemin du fichier d'origine du projet (archive .qrd ouverte ou image
   * importée), uniquement à des fins de dédoublonnage : rouvrir le même
   * fichier réactive le projet existant au lieu d'en créer une copie.
   * Non modifiable ensuite (la duplication l'efface).
   */
  sourcePath: string | null;
};

export type BuilderAction =
  | { type: "setProjectName"; name: string }
  | { type: "setType"; typeId: string }
  | { type: "setValue"; field: string; value: string }
  | { type: "patchDesign"; patch: Partial<QrDesign> }
  | { type: "patchBarcode"; patch: Partial<BarcodeDesign> }
  | { type: "resetDesign" }
  | { type: "setModule"; module: BuilderModule }
  | { type: "setMockup"; mockupId: string }
  | { type: "setSaveSize"; size: number }
  | { type: "markSaved"; at: number }
  | { type: "setFilePath"; path: string }
  | { type: "hydrate"; state: BuilderState }
  | { type: "undo" }
  | { type: "redo" };

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
/**
 * Persistance des onglets de l'espace de travail (tenus par WorkspaceProvider).
 * Lue aussi au démarrage pour réhydrater d'office le projet de l'onglet actif
 * de la session précédente — et éviter tout flash de mauvais contenu.
 */
export const WORKSPACE_TABS_STORAGE_KEY = "qrcode-studio:tabs:v1";

function createProjectId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Nom de projet unique à la Photoshop : « Sans titre », « Sans titre 2 »… */
function uniqueProjectName(existing: string[], base = "Sans titre"): string {
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
    barcode: { ...DEFAULT_BARCODE_DESIGN },
    activeModule: "content",
    mockupId: "plain",
    saveSize: 1024,
    savedAt: null,
    filePath: null,
    sourcePath: null,
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

  // Ancien type « barcode2d » (QR de données brutes) : devenu code-barres 1D,
  // la valeur saisie est conservée, l'ancien champ « format » est abandonné.
  let typeId = candidate.state.typeId;
  const valuesByType: Record<string, QrValues> = {
    ...(candidate.state.valuesByType ?? {}),
  };
  if (typeId === "barcode2d") {
    const legacy = valuesByType["barcode2d"] ?? {};
    delete valuesByType["barcode2d"];
    const barcodeType = getQrType("barcode");
    valuesByType["barcode"] = {
      ...defaultValuesFor(barcodeType),
      data: legacy.data ?? "",
    };
    typeId = "barcode";
  }

  const state: BuilderState = {
    ...createInitialState(candidate.id),
    ...(legacyState as BuilderState),
    typeId,
    valuesByType,
    design: { ...DEFAULT_DESIGN, ...(candidate.state.design ?? {}) },
    barcode: normalizeBarcodeDesign(candidate.state.barcode),
    // Métadonnées de suivi de fichier : jamais de valeur absente ni non
    // chaîne dans un projet restauré (les anciens registres n'en ont pas).
    filePath:
      typeof legacyState.filePath === "string" ? legacyState.filePath : null,
    sourcePath:
      typeof legacyState.sourcePath === "string" ? legacyState.sourcePath : null,
    projectId: candidate.id,
  };
  return {
    id: candidate.id,
    createdAt: typeof candidate.createdAt === "number" ? candidate.createdAt : now,
    updatedAt: typeof candidate.updatedAt === "number" ? candidate.updatedAt : now,
    state,
  };
}

/**
 * État éditeur complet pour un projet du registre : rétablit le module actif
 * tel qu'à la dernière édition (un onglet rouvre là où l'utilisateur s'était
 * arrêté) en garantissant sa validité vis-à-vis du type de code.
 */
function stateFromProject(project: StoredProject): BuilderState {
  const stored = project.state;
  const validModule = modulesForType(stored.typeId).some(
    (module) => module.id === stored.activeModule,
  );
  return {
    ...stored,
    projectId: project.id,
    activeModule: validModule ? stored.activeModule : "content",
    design: { ...DEFAULT_DESIGN, ...stored.design },
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
        // Le code-barres n'a pas de modules coins/logo : repli sur « Contenu ».
        activeModule: modulesForType(type.id).some((module) => module.id === state.activeModule)
          ? state.activeModule
          : "content",
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

    case "patchBarcode":
      return { ...state, barcode: { ...state.barcode, ...action.patch } };

    case "resetDesign":
      return { ...state, design: { ...DEFAULT_DESIGN } };

    case "setModule":
      return { ...state, activeModule: action.module };

    case "setMockup":
      return { ...state, mockupId: action.mockupId };

    case "setSaveSize":
      return { ...state, saveSize: action.size };

    case "setFilePath":
      return state.filePath === action.path ? state : { ...state, filePath: action.path };

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

/**
 * Historique d'annulation du brouillon actif : un présent, un passé et un
 * futur d'états complets, bornés. Les éditions de même nature rapprochées
 * (frappe clavier champ par champ, glissement de curseur) sont coalescées
 * en une seule entrée — un ⌘Z retire une séquence d'un coup, pas chaque
 * frappe.
 */
type HistoryEdit = { kind: string; key: string; at: number };

type HistoryState = {
  present: BuilderState;
  past: BuilderState[];
  future: BuilderState[];
  lastEdit: HistoryEdit | null;
};

/** Profondeur maximale de l'historique d'annulation. */
const HISTORY_LIMIT = 100;

/** Fenêtre de coalescence des éditions (ms) : au-delà, nouvelle entrée. */
const COALESCE_WINDOW_MS = 500;

/**
 * Clé de coalescence d'une action annulable (modification du contenu du
 * projet) ; null pour une action non annulable (métadonnées, navigation).
 */
function editKey(
  action: BuilderAction,
  typeId: string,
): { kind: string; key: string } | null {
  switch (action.type) {
    case "setProjectName":
      return { kind: action.type, key: "name" };
    case "setType":
      return { kind: action.type, key: "type" };
    case "setValue":
      return { kind: action.type, key: `${typeId}:${action.field}` };
    case "patchDesign":
      return { kind: action.type, key: Object.keys(action.patch).sort().join(",") };
    case "patchBarcode":
      return { kind: action.type, key: Object.keys(action.patch).sort().join(",") };
    case "resetDesign":
      return { kind: action.type, key: "design" };
    default:
      return null;
  }
}

/**
 * Réducteur enveloppant le réducteur d'état avec l'historique d'annulation.
 * Les actions de contenu alimentent passé/futur ; les actions de métadonnées
 * (enregistrement, module actif, chemin lié) ne touchent qu'au présent ;
 * « hydrate » (changement de projet) repart d'un historique vierge — celui
 * du brouillon précédent n'a plus de sens.
 */
function historyReducer(history: HistoryState, action: BuilderAction): HistoryState {
  if (action.type === "undo" || action.type === "redo") {
    const back = action.type === "undo";
    const neighbour = back
      ? history.past[history.past.length - 1]
      : history.future[0];
    if (!neighbour) return history;
    // La navigation n'est pas annulée : on reste dans le module courant,
    // sauf s'il n'existe plus pour le type restauré (repli sur « Contenu »).
    const withCurrentModule = { ...neighbour, activeModule: history.present.activeModule };
    const restored = modulesForType(withCurrentModule.typeId).some(
      (module) => module.id === withCurrentModule.activeModule,
    )
      ? withCurrentModule
      : { ...withCurrentModule, activeModule: "content" as const };
    return back
      ? {
          present: restored,
          past: history.past.slice(0, -1),
          future: [history.present, ...history.future].slice(0, HISTORY_LIMIT),
          lastEdit: null,
        }
      : {
          present: restored,
          past: [...history.past, history.present],
          future: history.future.slice(1),
          lastEdit: null,
        };
  }

  const present = reducer(history.present, action);
  // Action sans effet (reducer rendu idempotent) : rien à enregistrer.
  if (present === history.present) return history;

  if (action.type === "hydrate") {
    return { present, past: [], future: [], lastEdit: null };
  }

  const key = editKey(action, present.typeId);
  if (!key) {
    // Métadonnées (savedAt, filePath, module actif…) : ni annulables, ni
    // cassantes pour l'historique existant.
    return { present, past: history.past, future: history.future, lastEdit: null };
  }

  const now = Date.now();
  const coalesced =
    history.lastEdit !== null &&
    history.lastEdit.kind === key.kind &&
    history.lastEdit.key === key.key &&
    now - history.lastEdit.at < COALESCE_WINDOW_MS;
  // Toute nouvelle édition invalide le futur (redo).
  return coalesced
    ? { present, past: history.past, future: [], lastEdit: { ...key, at: now } }
    : {
        present,
        past: [...history.past, history.present].slice(-HISTORY_LIMIT),
        future: [],
        lastEdit: { ...key, at: now },
      };
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
  patchBarcode: (patch: Partial<BarcodeDesign>) => void;
  /** Annule la dernière édition du brouillon actif (sans effet si aucune). */
  undo: () => void;
  /** Rétablit la dernière édition annulée (sans effet si aucune). */
  redo: () => void;
  /** Vrai si le brouillon actif a une édition annulable. */
  canUndo: boolean;
  /** Vrai si le brouillon actif a une édition rétablissable. */
  canRedo: boolean;
  /** Date du dernier enregistrement local, en heure courte. */
  savedLabel: string | null;
  /** Projets du registre local, triés du plus récent au plus ancien. */
  projects: ProjectSummary[];
  /** Vrai une fois le registre local restauré (démarrage terminé). */
  ready: boolean;
  newProject: () => string;
  openProject: (id: string) => void;
  duplicateProject: (id: string) => void;
  deleteProject: (id: string) => void;
  /**
   * Écrit immédiatement le brouillon actif dans le registre local, sans
   * attendre le debounce — changement d'onglet, fermeture, suppression.
   */
  flushActiveProject: () => void;
  /** Écrit le projet actif dans un fichier .qrd ; renvoie le chemin. */
  saveProjectAsQcp: () => Promise<string>;
  /**
   * Enregistre le projet actif : écrit directement dans le fichier .qrd lié
   * s'il existe, sinon ouvre la boîte de dialogue « Enregistrer sous… »
   * (et lie le nouveau chemin). Renvoie le chemin écrit, ou "" si annulé.
   */
  saveProject: () => Promise<string>;
  /** Chemin du fichier .qrd lié au projet actif (null = non lié). */
  filePath: string | null;
  /** Vrai si des modifications ne sont pas encore écrites dans le fichier lié. */
  dirty: boolean;
  /** Ouvre un fichier .qrd et l'ajoute au registre ; renvoie l'ID du projet. */
  openProjectFromQcp: (path: string) => Promise<OpenedQcpProject>;
  /**
   * Convertit un fichier image/SVG/PDF (QR ou code-barres) en projet : appelle
   * le décodage backend avec progression, analyse le contenu puis enregistre
   * le projet. `isCancelled` est consulté juste avant l'enregistrement — un
   * import annulé ne touche ni au registre ni au brouillon.
   */
  newProjectFromQr: (
    path: string,
    options?: NewQrProjectOptions,
  ) => Promise<string>;
};

/** Résultat d'une ouverture de .qrd : projet réactivé (doublon) ou créé. */
export type OpenedQcpProject = {
  id: string;
  /** Vrai si le projet existait déjà : son onglet a simplement été réactivé. */
  deduped: boolean;
};

/** Options de conversion d'un fichier image en projet. */
export type NewQrProjectOptions = {
  /** Progression globale (0-100) et étape courante. */
  onProgress?: ImportProgressCallback;
  /** Consulté juste avant l'enregistrement : vrai = abandon silencieux. */
  isCancelled?: () => boolean;
};

const BuilderContext = createContext<BuilderContextValue | null>(null);

/** Délai de debounce avant régénération de l'aperçu (spec 001, FR-6). */
const PREVIEW_DEBOUNCE_MS = 180;

/** Délai de debounce avant enregistrement local du projet actif. */
const SAVE_DEBOUNCE_MS = 400;

/** Délai de stabilisation avant l'enregistrement auto du fichier .qrd lié. */
const FILE_SAVE_DEBOUNCE_MS = 1600;

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function BuilderProvider({ children }: { children: ReactNode }) {
  // L'état exposé est le présent de l'historique d'annulation : toute action
  // passe par historyReducer, qui alimente passé/futur selon sa nature.
  const [history, dispatch] = useReducer(historyReducer, undefined, (): HistoryState => ({
    present: createInitialState(),
    past: [],
    future: [],
    lastEdit: null,
  }));
  const state = history.present;
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;
  // Réglage applicatif : l'enregistrement auto du fichier lié est activé par
  // défaut et désactivable dans les paramètres (préférence persistée).
  const { autoSaveFile } = useSettings();
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
    // Onglets de l'espace de travail : la session précédente peut désigner le
    // projet à rouvrir d'office (onglet actif restauré au démarrage).
    let bootId = activeId;
    try {
      const rawTabs = window.localStorage.getItem(WORKSPACE_TABS_STORAGE_KEY);
      if (rawTabs) {
        const tabs = JSON.parse(rawTabs) as { active?: unknown };
        if (typeof tabs.active === "string" && loaded.some((p) => p.id === tabs.active)) {
          bootId = tabs.active;
        }
      }
    } catch {
      // Clé illisible : repli sur le projet actif du registre.
    }
    const active = loaded.find((project) => project.id === bootId);
    if (active) dispatch({ type: "hydrate", state: stateFromProject(active) });
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

  // Empreinte de l'état project (hors métadonnées d'affichage) : tout écart
  // avec la dernière empreinte écrite signale des modifications non enregistrées.
  const stateSignature = useMemo(
    () =>
      JSON.stringify({
        projectName: state.projectName,
        typeId: state.typeId,
        valuesByType: state.valuesByType,
        design: state.design,
        barcode: state.barcode,
        mockupId: state.mockupId,
        saveSize: state.saveSize,
      }),
    [
      state.projectName,
      state.typeId,
      state.valuesByType,
      state.design,
      state.barcode,
      state.mockupId,
      state.saveSize,
    ],
  );
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const dirty = savedSignature !== null && savedSignature !== stateSignature;

  // Références synchronisées à chaque rendu : les sauvegardes lisent l'état
  // courant sans recréer leurs callbacks à chaque frappe.
  const stateRef = useRef(state);
  const signatureRef = useRef(stateSignature);
  useEffect(() => {
    stateRef.current = state;
    signatureRef.current = stateSignature;
  });

  // Traitements de fichiers en cours, par chemin : un second déclenchement
  // du même fichier (double clic, accueil + menu) attend le premier résultat
  // au lieu d'enregistrer un doublon. Réservé à l'ouverture .qrd — sans
  // annulation possible, la promesse partagée ne peut pas être empoisonnée.
  const pendingPathsRef = useRef(new Map<string, Promise<OpenedQcpProject>>());

  // Changer de projet actif établit une nouvelle base « enregistrée ».
  useEffect(() => {
    setSavedSignature(signatureRef.current);
  }, [state.projectId]);

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
      // L'onglet rouvre le projet là où l'utilisateur s'était arrêté.
      dispatch({ type: "hydrate", state: stateFromProject(project) });
    },
    [projectsData.items],
  );

  const newProject = useCallback((): string => {
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
    return id;
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
        filePath: null,
        // Une copie est un projet distinct : plus liée au fichier d'origine.
        sourcePath: null,
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
        dispatch({ type: "hydrate", state: stateFromProject(next) });
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

  /**
   * Écrit immédiatement le brouillon actif dans le registre, sans attendre le
   * debounce : appelé avant tout changement d'onglet, d'import ou de fermeture,
   * afin qu'aucun dernier frappe ne puisse être perdu au passage.
   */
  const flushActiveProject = useCallback(() => {
    const current = stateRef.current;
    projectsDispatch({
      type: "upsert",
      project: { id: current.projectId, createdAt: Date.now(), updatedAt: Date.now(), state: current },
    });
  }, []);

  /** Enregistre le projet dans le registre et en fait le projet actif. */
  const registerAndActivate = useCallback(
    (imported: BuilderState): string => {
      // Écrit d'abord le brouillon à l'écran dans le registre : l'hydratation
      // qui suit annule le debounce d'enregistrement automatique, les
      // dernières frappes du projet quitté seraient sinon perdues.
      flushActiveProject();
      const now = Date.now();
      projectsDispatch({
        type: "add",
        project: { id: imported.projectId, createdAt: now, updatedAt: now, state: imported },
      });
      dispatch({ type: "hydrate", state: imported });
      return imported.projectId;
    },
    [flushActiveProject],
  );

  /** Écrit l'archive .qrd du projet courant à un chemin donné, sans dialogue. */
  const writeProjectQcp = useCallback(async (target: string): Promise<string> => {
    const current = stateRef.current;
    const { manifest, assets } = buildQcpManifest({
      // L'identifiant stable du projet part dans l'archive : rouvrir ce
      // fichier (même copié) réactivera ce projet au lieu d'en créer un double.
      projectId: current.projectId,
      name: current.projectName,
      typeId: current.typeId,
      valuesByType: current.valuesByType,
      design: current.design,
      barcode: current.barcode,
      mockupId: current.mockupId,
      saveSize: current.saveSize,
    });
    return await invoke<string>("save_project_qcp", { path: target, manifest, assets });
  }, []);

  /** Enregistre sous… : dialogue fichier, puis liaison du chemin au projet. */
  const saveProjectAsQcp = useCallback(async (): Promise<string> => {
    // Empreinte prise avant le dialogue : c'est l'état qui ira dans l'archive.
    const writtenSignature = signatureRef.current;
    const target = await save({
      title: "Enregistrer le projet",
      defaultPath: `${sanitizeFileName(stateRef.current.projectName)}.qrd`,
      filters: [{ name: "Projet Eventages QrCode Studio", extensions: ["qrd"] }],
    });
    if (!target) return "";
    const path = await writeProjectQcp(target);
    dispatch({ type: "setFilePath", path });
    dispatch({ type: "markSaved", at: Date.now() });
    setSavedSignature(writtenSignature);
    return path;
  }, [writeProjectQcp]);

  /** Enregistre le projet : fichier lié sans dialogue, sinon « sous… ». */
  const saveProject = useCallback(async (): Promise<string> => {
    const target = stateRef.current.filePath;
    if (!target) return await saveProjectAsQcp();
    const writtenSignature = signatureRef.current;
    const path = await writeProjectQcp(target);
    dispatch({ type: "markSaved", at: Date.now() });
    setSavedSignature(writtenSignature);
    return path;
  }, [saveProjectAsQcp, writeProjectQcp]);

  const openProjectFromQcp = useCallback(
    async (path: string): Promise<OpenedQcpProject> => {
      // Un même fichier ne s'ouvre qu'une fois à la fois.
      const pending = pendingPathsRef.current.get(path);
      if (pending) return pending;
      const task = (async (): Promise<OpenedQcpProject> => {
        const file = await invoke<QcpFilePayload>("open_project_qcp", { path });
        const data = applyQcpManifest({ manifest: file.manifest, assets: file.assets ?? [] });
        // Dédoublonnage : un projet déjà connu n'est jamais réenregistré.
        // 1) UUID inscrit dans l'archive à l'enregistrement (retrouve le
        //    projet même si le fichier a été copié ou déplacé) ;
        // 2) chemin d'origine, pour les archives anciennes sans UUID.
        const known = data.projectId
          ? projectsData.items.find((project) => project.id === data.projectId)
          : undefined;
        const byPath = projectsData.items.find(
          (project) => project.state.sourcePath === path,
        );
        const existing = known ?? byPath;
        if (existing) return { id: existing.id, deduped: true };
        return {
          id: registerAndActivate({
            projectId: data.projectId ?? createProjectId(),
            projectName: data.name,
            typeId: data.typeId,
            valuesByType: data.valuesByType,
            design: data.design,
            barcode: data.barcode,
            activeModule: "content",
            mockupId: data.mockupId,
            saveSize: data.saveSize,
            savedAt: null,
            // Nouveau projet dans le registre : non lié à l'archive d'origine.
            filePath: null,
            // Mémorisé pour reconnaître ce fichier à la réouverture.
            sourcePath: path,
          }),
          deduped: false,
        };
      })();
      pendingPathsRef.current.set(path, task);
      try {
        return await task;
      } finally {
        pendingPathsRef.current.delete(path);
      }
    },
    [projectsData.items, registerAndActivate],
  );

  const newProjectFromQr = useCallback(
    async (path: string, options?: NewQrProjectOptions): Promise<string> => {
      // Cette image a déjà été convertie : on réactive le projet existant
      // au lieu d'en créer une copie.
      const byPath = projectsData.items.find(
        (project) => project.state.sourcePath === path,
      );
      if (byPath) {
        options?.onProgress?.({ stage: "open", percent: 100 });
        return byPath.id;
      }

      options?.onProgress?.({ stage: "open", percent: 8 });
      // Étape « décodage » : le backend pousse sa progression sur un canal
      // (lecture, tentatives de détection, images du PDF…). Chaque conversion
      // décode dans son propre canal : une annulation n'empoisonne jamais une
      // relance du même fichier (le workspace ne lance qu'une conversion à
      // la fois et annule la précédente avant de repartir).
      const onBackendProgress = new Channel<BackendImportProgress>();
      onBackendProgress.onmessage = (message) => {
        options?.onProgress?.(backendToOverall(message));
      };
      const result = await invoke<{
        payload: string;
        errorCorrection: string | null;
        codeFormat: string | null;
        design: ImportedDesignHints | null;
      }>("import_qr_from_file", { path, onProgress: onBackendProgress });

      // Import annulé pendant le décodage : rien à écrire nulle part.
      if (options?.isCancelled?.()) throw new ImportCancelled();

      options?.onProgress?.({ stage: "content", percent: 88 });
      const content = contentFromPayload(result.payload, result.codeFormat);
      const type = getQrType(content.typeId);
      const errorCorrection = ["L", "M", "Q", "H"].includes(result.errorCorrection ?? "")
        ? (result.errorCorrection as QrDesign["errorCorrection"])
        : DEFAULT_DESIGN.errorCorrection;
      // Le design détecté dans l'image (couleurs, angles, logo, cadre)
      // remplace les défauts ; les aspects incertains restent d'origine.
      const design = designFromHints(result.design, errorCorrection);
      const barcode = { ...DEFAULT_BARCODE_DESIGN };
      if (isBarcode1DFormat(result.codeFormat)) {
        const barColor = hexFromImport(result.design?.dotColor);
        if (barColor) barcode.barColor = barColor;
      }

      options?.onProgress?.({ stage: "create", percent: 94 });
      if (options?.isCancelled?.()) throw new ImportCancelled();
      return registerAndActivate({
        projectId: createProjectId(),
        projectName: uniqueProjectName(
          projectsData.items.map((item) => item.state.projectName),
          isBarcode1DFormat(result.codeFormat) ? "Code-barres importé" : "QR importé",
        ),
        typeId: type.id,
        valuesByType: { [type.id]: { ...defaultValuesFor(type), ...content.values } },
        design,
        barcode,
        activeModule: "content",
        mockupId: "plain",
        saveSize: 1024,
        savedAt: null,
        filePath: null,
        // Mémorisé pour reconnaître cette image à la réimportation.
        sourcePath: path,
      });
    },
    [projectsData.items, registerAndActivate],
  );

  // Enregistrement automatique du fichier .qrd lié : après stabilisation des
  // modifications (debounce), le projet déjà enregistré sur disque est réécrit
  // sans aucune action. Désactivable dans les paramètres ; les projets non
  // liés restent des brouillons locaux.
  useEffect(() => {
    if (!ready || !autoSaveFile || !state.filePath || !dirty) return;
    const target = state.filePath;
    const timer = window.setTimeout(() => {
      void (async () => {
        // Empreinte prise au moment de la collecte : état réellement écrit.
        const writtenSignature = signatureRef.current;
        try {
          await writeProjectQcp(target);
          dispatch({ type: "markSaved", at: Date.now() });
          setSavedSignature(writtenSignature);
        } catch {
          // Échec silencieux : le projet reste signalé « non enregistré »
          // jusqu'à la prochaine modification ou à un enregistrement manuel.
          console.warn("Enregistrement automatique du projet impossible.");
        }
      })();
    }, FILE_SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
    // stateSignature redémarre le délai à chaque modification de contenu.
  }, [ready, autoSaveFile, state.filePath, dirty, stateSignature, writeProjectQcp]);

  const setValue = useCallback(
    (field: string, value: string) => dispatch({ type: "setValue", field, value }),
    [],
  );

  const patchDesign = useCallback(
    (patch: Partial<QrDesign>) => dispatch({ type: "patchDesign", patch }),
    [],
  );

  const patchBarcode = useCallback(
    (patch: Partial<BarcodeDesign>) => dispatch({ type: "patchBarcode", patch }),
    [],
  );

  const undo = useCallback(() => dispatch({ type: "undo" }), []);
  const redo = useCallback(() => dispatch({ type: "redo" }), []);

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
      patchBarcode,
      undo,
      redo,
      canUndo,
      canRedo,
      savedLabel,
      projects,
      ready,
      newProject,
      openProject,
      duplicateProject,
      deleteProject,
      flushActiveProject,
      saveProjectAsQcp,
      saveProject,
      dirty,
      filePath: state.filePath,
      openProjectFromQcp,
      newProjectFromQr,
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
      patchBarcode,
      undo,
      redo,
      canUndo,
      canRedo,
      savedLabel,
      projects,
      ready,
      newProject,
      openProject,
      duplicateProject,
      deleteProject,
      flushActiveProject,
      saveProjectAsQcp,
      saveProject,
      dirty,
      openProjectFromQcp,
      newProjectFromQr,
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
