import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  detectSystemLocale,
  isLocale,
  type LocaleId,
} from "@/lib/i18n/locales";

export type ThemeMode = "light" | "dark";

/**
 * Identifiants des thèmes de couleurs (les nommés vivent dans src/themes.css).
 * Thèmes d'origine : crimson, cramoisy, shalk, violate, eventages.
 * Thèmes variés (sobres / modernes / atypiques) : dracula, tokyo, mono,
 * humanizer, mokoto, highness, lucy, corporate, noble.
 */
export type ColorThemeId =
  | "default"
  | "crimson"
  | "cramoisy"
  | "shalk"
  | "violate"
  | "eventages"
  | "dracula"
  | "tokyo"
  | "mono"
  | "humanizer"
  | "mokoto"
  | "highness"
  | "lucy"
  | "corporate"
  | "noble";

export type ColorThemePalette = {
  /** Fond de la zone d'aperçu. */
  bg: string;
  /** Bande d'accent principale. */
  primary: string;
  /** Bande d'accent secondaire. */
  accent: string;
};

/**
 * Catalogue des thèmes de couleurs proposés dans les paramètres.
 * Les valeurs sont reprises de src/index.css (défaut « Lior ») et de
 * src/themes.css (thèmes nommés), en clair sombre et clair.
 */
export const COLOR_THEMES: {
  id: ColorThemeId;
  label: string;
  palettes: Record<ThemeMode, ColorThemePalette>;
}[] = [
  {
    id: "default",
    label: "Lior",
    palettes: {
      light: {
        bg: "oklch(0.965 0.004 240)",
        primary: "oklch(0.55 0.1 83)",
        accent: "oklch(0.925 0.008 240)",
      },
      dark: {
        bg: "oklch(0.165 0.015 240)",
        primary: "oklch(0.775 0.105 85)",
        accent: "oklch(0.26 0.02 240)",
      },
    },
  },
  {
    id: "crimson",
    label: "Crimson",
    palettes: {
      light: {
        bg: "oklch(0.9827 0.0152 325.69)",
        primary: "oklch(0.6041 0.1924 38.70)",
        accent: "oklch(0.94 0.024 330)",
      },
      dark: {
        bg: "oklch(0.1444 0.0209 330.84)",
        primary: "oklch(0.6041 0.1924 38.70)",
        accent: "oklch(0.22 0.035 330)",
      },
    },
  },
  {
    id: "cramoisy",
    label: "Cramoisy",
    palettes: {
      light: {
        bg: "oklch(1 0 0)",
        primary: "oklch(0.5778 0.2282 26.5713)",
        accent: "oklch(0.9691 0.0017 247.8397)",
      },
      dark: {
        bg: "oklch(0.145 0.0028 247.4358)",
        primary: "oklch(0.5778 0.2282 26.5713)",
        accent: "oklch(0.2674 0.009 248.1657)",
      },
    },
  },
  {
    id: "shalk",
    label: "Shalk",
    palettes: {
      light: {
        bg: "oklch(0.9745 0.0079 253.8524)",
        primary: "oklch(0.2038 0.0264 260.9332)",
        accent: "oklch(0.9442 0.0137 258.3455)",
      },
      dark: {
        bg: "oklch(0.2292 0.0304 259.0329)",
        primary: "oklch(0.8993 0.0119 239.9205)",
        accent: "oklch(0.3056 0.0334 255.7755)",
      },
    },
  },
  {
    id: "violate",
    label: "Violate",
    palettes: {
      light: {
        bg: "oklch(0.9892 0.0053 286.3028)",
        primary: "oklch(0.6217 0.1799 287.7754)",
        accent: "oklch(0.957 0.0187 289.3286)",
      },
      dark: {
        bg: "oklch(0.1503 0.0171 289.8934)",
        primary: "oklch(0.6217 0.1799 287.7754)",
        accent: "oklch(0.2354 0.0399 287.2762)",
      },
    },
  },
  {
    id: "eventages",
    label: "Eventages",
    palettes: {
      light: {
        bg: "oklch(0.982 0.006 230)",
        primary: "oklch(0.41 0.105 250)",
        accent: "oklch(0.94 0.05 145)",
      },
      dark: {
        bg: "oklch(0.17 0.03 250)",
        primary: "oklch(0.82 0.19 130)",
        accent: "oklch(0.3 0.05 150)",
      },
    },
  },
  {
    id: "dracula",
    label: "Dracula",
    palettes: {
      light: {
        bg: "#F6F4FB",
        primary: "#7B5EA7",
        accent: "#E8E3F6",
      },
      dark: {
        bg: "#282A36",
        primary: "#BD93F9",
        accent: "#3F4456",
      },
    },
  },
  {
    id: "tokyo",
    label: "Tokyo",
    palettes: {
      light: {
        bg: "#EFF1F6",
        primary: "#4664C9",
        accent: "#E2E7F8",
      },
      dark: {
        bg: "#1A1B26",
        primary: "#7AA2F7",
        accent: "#2A3049",
      },
    },
  },
  {
    id: "mono",
    label: "Mono",
    palettes: {
      light: {
        bg: "#F7F7F7",
        primary: "#242424",
        accent: "#E7E7E7",
      },
      dark: {
        bg: "#111111",
        primary: "#F4F4F4",
        accent: "#2C2C2C",
      },
    },
  },
  {
    id: "humanizer",
    label: "Humanizer",
    palettes: {
      light: {
        bg: "#FAF5ED",
        primary: "#AD6A45",
        accent: "#EFE3D1",
      },
      dark: {
        bg: "#241E18",
        primary: "#D99A6C",
        accent: "#3F352A",
      },
    },
  },
  {
    id: "mokoto",
    label: "Mokoto",
    palettes: {
      light: {
        bg: "#F7F4F1",
        primary: "#46557A",
        accent: "#F5E4E4",
      },
      dark: {
        bg: "#262429",
        primary: "#9AA7CC",
        accent: "#3E3941",
      },
    },
  },
  {
    id: "highness",
    label: "Highness",
    palettes: {
      light: {
        bg: "#FAF8F5",
        primary: "#FC6E20",
        accent: "#FFE7D0",
      },
      dark: {
        bg: "#1B1B1B",
        primary: "#FC6E20",
        accent: "#33241A",
      },
    },
  },
  {
    id: "lucy",
    label: "Lucy",
    palettes: {
      light: {
        bg: "#FDF5F7",
        primary: "#C25B7F",
        accent: "#F6E2E9",
      },
      dark: {
        bg: "#211A20",
        primary: "#DE8AA8",
        accent: "#44303B",
      },
    },
  },
  {
    id: "corporate",
    label: "Corporate",
    palettes: {
      light: {
        bg: "#F4F6F9",
        primary: "#1E4F8F",
        accent: "#E2EAF4",
      },
      dark: {
        bg: "#10151C",
        primary: "#5191CE",
        accent: "#233144",
      },
    },
  },
  {
    id: "noble",
    label: "Noble",
    palettes: {
      light: {
        bg: "#FBFAF5",
        primary: "#17694F",
        accent: "#F2E9D4",
      },
      dark: {
        bg: "#0F1411",
        primary: "#CDA34A",
        accent: "#263028",
      },
    },
  },
];

type SettingsState = {
  /** Mode d'affichage, pilote la classe `.dark` sur <html>. */
  mode: ThemeMode;
  /** Thème de couleurs, pilote l'attribut `data-theme` lu par src/themes.css. */
  colorTheme: ColorThemeId;
  /** Mode HUD : ornements futuristes (scanlines, brackets, readouts…). */
  hud: boolean;
  /** Animations de l'interface (transitions et keyframes). */
  animations: boolean;
  /** Enregistrement auto du fichier .qrd lié après stabilisation des modifications. */
  autoSaveFile: boolean;
  /** Mises à jour automatiques : téléchargement + installation sans demander. */
  autoUpdate: boolean;
  /** Langue de l'interface (dictionnaires src/lib/i18n/dictionaries). */
  language: LocaleId;
};

type SettingsContextValue = SettingsState & {
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  setColorTheme: (colorTheme: ColorThemeId) => void;
  setHud: (hud: boolean) => void;
  setAnimations: (animations: boolean) => void;
  setAutoSaveFile: (autoSaveFile: boolean) => void;
  setAutoUpdate: (autoUpdate: boolean) => void;
  setLanguage: (language: LocaleId) => void;
};

const STORAGE_KEY = "qrcode-studio:settings:v1";
/** Ancienne clé du mode (use-theme.ts), migrée au premier lancement. */
const LEGACY_THEME_KEY = "qrcode-studio:theme";

const DEFAULT_SETTINGS: SettingsState = {
  mode: "dark",
  colorTheme: "eventages",
  hud: true,
  animations: true,
  autoSaveFile: true,
  autoUpdate: false,
  language: DEFAULT_LOCALE,
};

function isColorTheme(value: unknown): value is ColorThemeId {
  return COLOR_THEMES.some((theme) => theme.id === value);
}

/**
 * Langue de remplacement quand la préférence est absente ou invalide
 * (premier lancement, préférences antérieures à l'i18n) : la langue du
 * système détectée d'après l'agent utilisateur (« fr-CA » → « fr »),
 * sinon l'anglais par défaut.
 */
function fallbackLanguage(): LocaleId {
  return detectSystemLocale() ?? DEFAULT_SETTINGS.language;
}

function readInitialSettings(): SettingsState {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<SettingsState>;
      return {
        mode:
          parsed.mode === "light" || parsed.mode === "dark"
            ? parsed.mode
            : DEFAULT_SETTINGS.mode,
        colorTheme: isColorTheme(parsed.colorTheme)
          ? parsed.colorTheme
          : DEFAULT_SETTINGS.colorTheme,
        hud: typeof parsed.hud === "boolean" ? parsed.hud : DEFAULT_SETTINGS.hud,
        animations:
          typeof parsed.animations === "boolean"
            ? parsed.animations
            : DEFAULT_SETTINGS.animations,
        autoSaveFile:
          typeof parsed.autoSaveFile === "boolean"
            ? parsed.autoSaveFile
            : DEFAULT_SETTINGS.autoSaveFile,
        // Nouveau réglage (pas encore persisté) : volontairement désactivé
        // — l'installation silencieuse doit être un choix explicite.
        autoUpdate:
          typeof parsed.autoUpdate === "boolean"
            ? parsed.autoUpdate
            : DEFAULT_SETTINGS.autoUpdate,
        language: isLocale(parsed.language)
          ? parsed.language
          : fallbackLanguage(),
      };
    }
    // Migration de l'ancienne préférence de mode sombre / clair.
    const legacy = window.localStorage.getItem(LEGACY_THEME_KEY);
    if (legacy === "light" || legacy === "dark") {
      return { ...DEFAULT_SETTINGS, mode: legacy, language: fallbackLanguage() };
    }
    // Premier lancement : la langue suit celle du système.
    return { ...DEFAULT_SETTINGS, language: fallbackLanguage() };
  } catch {
    // Stockage indisponible : on repart des valeurs par défaut.
  }
  return DEFAULT_SETTINGS;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

/**
 * Lit la langue persistée sans monter le provider : utilisée par
 * l'I18nProvider pour initialiser le traducteur hors React avant le premier
 * rendu (évite un flash d'anglais). Fallback identique à
 * readInitialSettings (langue du système au premier lancement) ; retourne
 * null si le stockage est indisponible.
 */
export function readStoredLanguage(): LocaleId | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<SettingsState>;
      return isLocale(parsed.language) ? parsed.language : fallbackLanguage();
    }
    return fallbackLanguage();
  } catch {
    return null;
  }
}

/**
 * Préférences applicatives (mode, thème de couleurs, mode HUD, animations,
 * langue). Persistance locale 100 % hors ligne, application sur <html> :
 * - `.dark` + `colorScheme` pour le mode ;
 * - `data-theme` pour les thèmes de couleurs (src/themes.css) ;
 * - `data-hud` / `data-anim` pour les neutralisations CSS (src/index.css).
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SettingsState>(readInitialSettings);

  // Persistance locale des préférences (jamais expirées).
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignoré : les réglages restent appliqués pour la session.
    }
  }, [settings]);

  // Mode clair / sombre : classe .dark + scrollbars et formulaires natifs.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", settings.mode === "dark");
    root.style.colorScheme = settings.mode;
  }, [settings.mode]);

  // Thème de couleurs : le défaut (« Lior ») ne pose pas d'attribut,
  // les jetons de src/index.css s'appliquent déjà.
  useEffect(() => {
    const root = document.documentElement;
    if (settings.colorTheme === "default") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", settings.colorTheme);
  }, [settings.colorTheme]);

  // Ornements HUD : `data-hud` pilote le rendu des composants (hud.tsx) et
  // les neutralisations CSS (index.css).
  useEffect(() => {
    document.documentElement.dataset.hud = settings.hud ? "on" : "off";
  }, [settings.hud]);

  // Animations : `data-anim` fige transitions et keyframes côté CSS.
  useEffect(() => {
    document.documentElement.dataset.anim = settings.animations ? "on" : "off";
  }, [settings.animations]);

  const toggleMode = useCallback(() => {
    setSettings((current) => ({
      ...current,
      mode: current.mode === "dark" ? "light" : "dark",
    }));
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({
      ...settings,
      setMode: (mode) => setSettings((current) => ({ ...current, mode })),
      toggleMode,
      setColorTheme: (colorTheme) => setSettings((current) => ({ ...current, colorTheme })),
      setHud: (hud) => setSettings((current) => ({ ...current, hud })),
      setAnimations: (animations) => setSettings((current) => ({ ...current, animations })),
      setAutoSaveFile: (autoSaveFile) => setSettings((current) => ({ ...current, autoSaveFile })),
      setAutoUpdate: (autoUpdate) => setSettings((current) => ({ ...current, autoUpdate })),
      setLanguage: (language) => setSettings((current) => ({ ...current, language })),
    }),
    [settings, toggleMode],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings doit être utilisé dans un SettingsProvider");
  }
  return context;
}
