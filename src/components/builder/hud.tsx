import type { ReactNode } from "react";
import { useSettings } from "@/hooks/use-settings";
import { cn } from "@/lib/utils";

/**
 * Ornement HUD partagés de l'atelier (D.A. futuriste) : brackets d'angle,
 * étiquettes techniques, readouts mono et marqueurs de visée.
 * Tout est décoratif, `aria-hidden` et sans interaction.
 * Quand le mode HUD est désactivé (paramètres), les ornements purs
 * disparaissent et les porteurs d'information redeviennent sobres.
 */

/** Quatre brackets d'angle en L, à superposer à une surface active. */
export function HudCorners({
  className,
  inset = "0.25rem",
  size = "0.5rem",
  thickness = 1,
}: {
  className?: string;
  inset?: string;
  size?: string;
  thickness?: number;
}) {
  const { hud } = useSettings();
  const base = "pointer-events-none absolute animate-draw";
  const style = {
    width: size,
    height: size,
    borderColor: "currentColor",
  } as const;

  if (!hud) return null;

  return (
    <span aria-hidden="true" className={cn("text-primary", className)}>
      <span
        className={cn(base, "animate-draw border-t border-l left-0 top-0")}
        style={{ ...style, inset: `${inset} auto auto ${inset}`, borderWidth: thickness }}
      />
      <span
        className={cn(base, "animate-draw border-t border-r right-0 top-0")}
        style={{ ...style, inset: `${inset} ${inset} auto auto`, borderWidth: thickness }}
      />
      <span
        className={cn(base, "animate-draw border-b border-l bottom-0 left-0")}
        style={{ ...style, inset: `auto auto ${inset} ${inset}`, borderWidth: thickness }}
      />
      <span
        className={cn(base, "animate-draw border-b border-r bottom-0 right-0")}
        style={{ ...style, inset: `auto ${inset} ${inset} auto`, borderWidth: thickness }}
      />
    </span>
  );
}

/** Étiquette technique précédée d'un crantage doré (« ▍ MODULE — 01 »). */
export function HudLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { hud } = useSettings();

  // Hors HUD : simple intitulé de section, sans crantage ni mono.
  if (!hud) {
    return (
      <span
        className={cn(
          "text-[0.66rem] leading-tight font-medium text-muted-foreground",
          className,
        )}
      >
        {children}
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn("text-hud inline-flex items-center gap-1.5 text-muted-foreground", className)}
    >
      <span className="h-2.5 w-[3px] bg-primary/80" />
      {children}
    </span>
  );
}

/** Paire label + valeur en mono, façon télémétrie. */
export function HudReadout({
  label,
  value,
  className,
  valueClassName,
}: {
  label: ReactNode;
  value: ReactNode;
  className?: string;
  valueClassName?: string;
}) {
  const { hud } = useSettings();

  // Hors HUD : la valeur seule suffit (« 42 % » plutôt que « PRG 42 % »).
  if (!hud) {
    return (
      <span className={cn("inline-flex items-baseline text-xs", className)}>
        <span className={cn("tabular-nums text-foreground", valueClassName)}>{value}</span>
      </span>
    );
  }

  return (
    <span
      className={cn("inline-flex items-baseline gap-1.5 font-mono text-[0.6rem]", className)}
    >
      <span className="text-hud text-muted-foreground/80">{label}</span>
      <span className={cn("tabular-nums text-foreground", valueClassName)}>{value}</span>
    </span>
  );
}

/** Marqueur de visée « + » pour les repères de scène. */
export function HudCross({ className }: { className?: string }) {
  const { hud } = useSettings();

  if (!hud) return null;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute flex size-3 items-center justify-center font-mono text-[0.65rem] leading-none text-muted-foreground/50 select-none",
        className,
      )}
    >
      +
    </span>
  );
}

/** Voyant d'état clignotant (avec réduction de mouvement gérée globalement). */
export function HudStatusDot({
  className,
  tone = "primary",
}: {
  className?: string;
  tone?: "primary" | "ok";
}) {
  const { hud } = useSettings();

  if (!hud) return null;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative flex size-1.5 shrink-0",
        tone === "ok" ? "text-emerald-500" : "text-primary",
        className,
      )}
    >
      <span className="animate-blink absolute inset-0 rounded-full bg-current" />
      <span className="absolute inset-0 rounded-full bg-current opacity-30 blur-[3px]" />
    </span>
  );
}
