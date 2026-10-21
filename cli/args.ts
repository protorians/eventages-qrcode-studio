/**
 * Analyse des arguments du CLI `eventages-lite` : positionnels, drapeaux valeur
 * (`--type wifi`), drapeaux inline (`--type=wifi`), booléens (`--no-frame`)
 * et drapeaux répétables (`--set a=1 --set b=2`). Volontairement sans
 * dépendance : un parseur de 80 lignes vaut mieux qu'un arbre de paquets.
 */

/** Erreur attendue de l'outil : message affiché tel quel, sans trace. */
export class CliError extends Error {}

/** Drapeaux acceptant d'être répétés (accumulés dans un tableau). */
const REPEATABLE = new Set(["set", "values", "file", "design", "unset"]);

/** Raccourcis courts (`-o` → `--output`). */
const SHORT_ALIASES: Record<string, string> = { o: "output" };

export type ParsedArgs = {
  /** Première commande : `create`, `render`, … */
  command: string;
  /** Arguments positionnels restants (après la commande). */
  positionals: string[];
  flags: Map<string, string | string[] | boolean>;
};

export function parseArgs(argv: string[]): ParsedArgs {
  const positionals: string[] = [];
  const flags = new Map<string, string | string[] | boolean>();

  const push = (key: string, value: string | boolean): void => {
    const existing = flags.get(key);
    if (REPEATABLE.has(key)) {
      const list = Array.isArray(existing)
        ? existing.slice()
        : typeof existing === "string"
          ? [existing]
          : [];
      if (typeof value === "string") list.push(value);
      flags.set(key, list);
      return;
    }
    flags.set(key, value);
  };

  let index = 0;
  while (index < argv.length) {
    const token = argv[index]!;
    index += 1;

    if (token === "--") {
      positionals.push(...argv.slice(index));
      break;
    }

    if (token.startsWith("--")) {
      const body = token.slice(2);
      const equals = body.indexOf("=");
      if (equals >= 0) {
        push(body.slice(0, equals), body.slice(equals + 1));
        continue;
      }
      const next = argv[index];
      if (next !== undefined && !next.startsWith("-")) {
        push(body, next);
        index += 1;
      } else {
        push(body, true);
      }
      continue;
    }

    if (token.startsWith("-") && token.length > 1) {
      const key = SHORT_ALIASES[token.slice(1)] ?? token.slice(1);
      const next = argv[index];
      if (next !== undefined && !next.startsWith("-")) {
        push(key, next);
        index += 1;
      } else {
        push(key, true);
      }
      continue;
    }

    positionals.push(token);
  }

  const command = positionals.shift() ?? "help";
  return { command, positionals, flags };
}

/** Valeur d'un drapeau scalaire (le dernier gagne), ou repli. */
export function flagString(args: ParsedArgs, name: string, fallback?: string): string | undefined {
  const value = args.flags.get(name);
  if (value === undefined || typeof value === "boolean") return fallback;
  return Array.isArray(value) ? value[value.length - 1] : value;
}

/** Liste des valeurs d'un drapeau répétable, dans l'ordre de saisie. */
export function flagList(args: ParsedArgs, name: string): string[] {
  const value = args.flags.get(name);
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [String(value)];
}

/** Vrai si un drapeau booléen est présent. */
export function flagBool(args: ParsedArgs, name: string): boolean {
  const value = args.flags.get(name);
  return value === true || value === "true";
}

/** Valeur numérique d'un drapeau, ou repli ; erreur si non convertible. */
export function flagNumber(args: ParsedArgs, name: string, fallback?: number): number | undefined {
  const raw = flagString(args, name);
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new CliError(`--${name} attend un nombre, reçu : « ${raw} ».`);
  }
  return value;
}
