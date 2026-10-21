import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "@/lib/tauri";
import { useSettings, readStoredLanguage } from "@/hooks/use-settings";
import {
  DEFAULT_LOCALE,
  isRtlLocale,
  type LocaleId,
} from "./locales";
import { en, type TranslationKey } from "./dictionaries/en";
export type { TranslationKey };
import { fr } from "./dictionaries/fr";
import { es } from "./dictionaries/es";
import { de } from "./dictionaries/de";
import { it } from "./dictionaries/it";
import { pt } from "./dictionaries/pt";
import { nl } from "./dictionaries/nl";
import { ru } from "./dictionaries/ru";
import { ja } from "./dictionaries/ja";
import { zh } from "./dictionaries/zh";
import { ar } from "./dictionaries/ar";

/** Paramètres de interpolation : {name} dans les gabarits de traduction. */
export type TranslationParams = Record<string, string | number>;

/**
 * Dictionnaires par langue. L'anglais fait foi (clé de référence) ; une
 * langue incomplète retombe sur l'anglais clé par clé.
 */
const DICTIONARIES: Record<LocaleId, Partial<Record<TranslationKey, string>>> = {
  en,
  fr,
  es,
  de,
  it,
  pt,
  nl,
  ru,
  ja,
  zh,
  ar,
};

/** Remplace les marqueurs {nom} d'un gabarit par leurs valeurs. */
function interpolate(
  template: string,
  params: TranslationParams | undefined,
): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

/**
 * Traduction hors React (stores, utilitaires lib) : s'appuie sur la langue
 * courante tenue à jour par l'I18nProvider. En dehors du provider, retombe
 * sur l'anglais.
 */
let activeDictionary = DICTIONARIES[DEFAULT_LOCALE];

export function translate(
  key: TranslationKey,
  params?: TranslationParams,
): string {
  return interpolate(activeDictionary[key] ?? en[key] ?? key, params);
}

/** Traducteur React : stable tant que la langue ne change pas. */
export type Translator = (
  key: TranslationKey,
  params?: TranslationParams,
) => string;

const I18nContext = createContext<Translator>(translate);

/**
 * Fournit le traducteur issu des préférences (SettingsProvider requis en
 * amont) et synchronise la langue du document (<html lang>) ainsi que son
 * sens de lecture (<html dir>, RTL pour l'arabe), plus le traducteur hors
 * React. Le backend natif reçoit aussi la langue, pour traduire les
 * messages des commandes (src-tauri/src/i18n.rs).
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const { language } = useSettings();

  useEffect(() => {
    activeDictionary = DICTIONARIES[language] ?? DICTIONARIES[DEFAULT_LOCALE];
    document.documentElement.lang = language;
    document.documentElement.dir = isRtlLocale(language) ? "rtl" : "ltr";
    if (isTauriRuntime()) {
      void invoke("set_ui_locale", { locale: language }).catch(() => {
        // Hors build desktop ou commande indisponible : rien à faire.
      });
    }
  }, [language]);

  const t = useMemo<Translator>(() => {
    const dictionary = DICTIONARIES[language] ?? DICTIONARIES[DEFAULT_LOCALE];
    return (key, params) =>
      interpolate(dictionary[key] ?? en[key] ?? key, params);
  }, [language]);

  return <I18nContext.Provider value={t}>{children}</I18nContext.Provider>;
}

/** Traducteur lié à la langue courante (re-rend au changement de langue). */
export function useT(): Translator {
  return useContext(I18nContext);
}

/** Langue courante (pour Intl : dates, nombres, tris). */
export function useLocale(): LocaleId {
  return useSettings().language;
}

/** Langue initiale lue avant tout rendu (évite un flash d'anglais). */
const initialLocale = readStoredLanguage();
if (initialLocale) {
  activeDictionary = DICTIONARIES[initialLocale] ?? DICTIONARIES[DEFAULT_LOCALE];
  // Sens de lecture posé avant le premier rendu : l'arabe ne clignote pas en LTR.
  document.documentElement.dir = isRtlLocale(initialLocale) ? "rtl" : "ltr";
}
