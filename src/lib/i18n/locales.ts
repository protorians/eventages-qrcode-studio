/**
 * Catalogue des langues de l'interface (préférence réglée dans les
 * paramètres, persistée par le SettingsProvider). Aucune dépendance React :
 * ce module est aussi importé par use-settings.tsx pour valider la
 * préférence persistée.
 */

export type LocaleId =
  | "en"
  | "fr"
  | "es"
  | "de"
  | "it"
  | "pt"
  | "nl"
  | "ru"
  | "ja"
  | "zh"
  | "ar";

/** Langue par défaut de l'application (anglais). */
export const DEFAULT_LOCALE: LocaleId = "en";

/**
 * Langues proposées dans les paramètres. Les libellés sont écrits dans leur
 * langue d'origine (invariante) : ils s'affichent tels quels quel que soit
 * le réglage courant.
 */
export const LOCALES: { id: LocaleId; label: string }[] = [
  { id: "en", label: "English" },
  { id: "fr", label: "Français" },
  { id: "es", label: "Español" },
  { id: "de", label: "Deutsch" },
  { id: "it", label: "Italiano" },
  { id: "pt", label: "Português" },
  { id: "nl", label: "Nederlands" },
  { id: "ru", label: "Русский" },
  { id: "ja", label: "日本語" },
  { id: "zh", label: "简体中文" },
  { id: "ar", label: "العربية" },
];

/** Langues écrites de droite à gauche (l'interface pose `dir` sur <html>). */
const RTL_LOCALES: readonly LocaleId[] = ["ar"];

export function isLocale(value: unknown): value is LocaleId {
  return LOCALES.some((locale) => locale.id === value);
}

/** Vrai si la langue se lit de droite à gauche (arabe…). */
export function isRtlLocale(id: LocaleId): boolean {
  return RTL_LOCALES.includes(id);
}

/**
 * Langue du système au premier lancement : parcourt les langues préférées
 * de l'agent utilisateur (de la plus souhaitée à la moins) et retient la
 * première dont la sous-étiquette primaire est proposée (« pt-BR » → « pt »).
 * Retourne null hors navigateur ou sans correspondance — l'appelant garde
 * alors la langue par défaut.
 */
export function detectSystemLocale(): LocaleId | null {
  if (typeof navigator === "undefined") return null;
  const candidates = [...(navigator.languages ?? []), navigator.language ?? ""];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const primary = candidate.toLowerCase().split("-")[0];
    if (isLocale(primary)) return primary;
  }
  return null;
}

/** Libellé d'origine d'une langue (ex. « Français » pour fr). */
export function localeLabel(id: LocaleId): string {
  return LOCALES.find((locale) => locale.id === id)?.label ?? id;
}
