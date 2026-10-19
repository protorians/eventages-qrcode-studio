import {
  Check,
  Moon,
  RefreshCw,
  ScanLine,
  Settings2,
  ShieldCheck,
  Sun,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { HudLabel, HudReadout, HudStatusDot } from "@/components/builder/hud";
import {
  COLOR_THEMES,
  useSettings,
  type ColorThemePalette,
} from "@/hooks/use-settings";
import { useBuilder } from "@/lib/builder-store";
import { cn } from "@/lib/utils";

/**
 * Réglages de l'application : mode clair / sombre, thème de couleurs
 * (src/themes.css), mode HUD et animations. Les préférences sont
 * persistées localement par le SettingsProvider (use-settings.tsx).
 */
export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const {
    mode,
    setMode,
    colorTheme,
    setColorTheme,
    hud,
    setHud,
    animations,
    setAnimations,
    autoSaveFile,
    setAutoSaveFile,
  } = useSettings();
  const { projects } = useBuilder();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(85dvh,40rem)] flex-col gap-0 overflow-hidden p-0 ring-primary/20 sm:max-w-lg"
        showCloseButton={false}
      >
        <DialogHeader className="relative shrink-0 flex-row items-center justify-between gap-3 border-b border-border/60 bg-card/60 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="hud-clip-tr relative flex size-9 shrink-0 items-center justify-center bg-linear-to-br from-primary/30 to-primary/5 text-primary ring-1 ring-primary/25">
              <Settings2 className="size-4" />
            </span>
            <div className="space-y-1">
              <HudLabel className="block">SYSTÈME — MOD.09</HudLabel>
              <DialogTitle>Paramètres</DialogTitle>
              <DialogDescription className="text-xs">
                Apparence, interface et enregistrement — enregistrées sur cet appareil.
              </DialogDescription>
            </div>
          </div>
          {hud ? (
            <HudReadout className="hidden sm:inline-flex" label="PREFS" value="LOCAL" />
          ) : null}
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-primary/60 via-primary/20 to-transparent"
          />
        </DialogHeader>

        <div className="panel-scroll min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
          {/* — Apparence : mode + thème de couleurs — */}
          <section className="space-y-3">
            <HudLabel className="block">APPARENCE — MODE</HudLabel>

            <SettingRow
              icon={mode === "dark" ? Moon : Sun}
              title="Thème sombre"
              description="Coque anthracite et accents lumineux ; le thème clair joue la version « blueprint »."
            >
              <Switch
                checked={mode === "dark"}
                onCheckedChange={(checked) => setMode(checked ? "dark" : "light")}
                aria-label="Thème sombre"
              />
            </SettingRow>

            <Separator className="bg-border/60" />

            <div className="space-y-2">
              <p className="text-[0.78rem] leading-tight font-medium">Thème de couleurs</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {COLOR_THEMES.map((theme) => (
                  <ThemeSwatch
                    key={theme.id}
                    label={theme.label}
                    palette={theme.palettes[mode]}
                    active={theme.id === colorTheme}
                    onSelect={() => setColorTheme(theme.id)}
                  />
                ))}
              </div>
            </div>
          </section>

          <Separator />

          {/* — Interface : HUD + animations — */}
          <section className="space-y-3">
            <HudLabel className="block">INTERFACE — EFFETS</HudLabel>

            <SettingRow
              icon={ScanLine}
              title="Mode HUD"
              description="Ornements futuristes : coins coupés, brackets, scanlines et readouts mono — sur les panneaux comme sur les contrôles."
            >
              <Switch checked={hud} onCheckedChange={setHud} aria-label="Mode HUD" />
            </SettingRow>

            <Separator className="bg-border/60" />

            <SettingRow
              icon={Zap}
              title="Animations"
              description="Déplacements doux, balayages de scan et pulsations des voyants."
            >
              <Switch
                checked={animations}
                onCheckedChange={setAnimations}
                aria-label="Animations"
              />
            </SettingRow>
          </section>

          <Separator />

          {/* — Projet : enregistrement du fichier lié — */}
          <section className="space-y-3">
            <HudLabel className="block">PROJET — ENREGISTREMENT</HudLabel>

            <SettingRow
              icon={RefreshCw}
              title="Enregistrement automatique"
              description="Réécrit le fichier .qcp lié après chaque modification stabilisée. Désactivé, seul « Enregistrer » (⌘S) écrit le fichier."
            >
              <Switch
                checked={autoSaveFile}
                onCheckedChange={setAutoSaveFile}
                aria-label="Enregistrement automatique du fichier lié"
              />
            </SettingRow>
          </section>

          <Separator />

          {/* — Données : rappel du fonctionnement local — */}
          <section className="space-y-3">
            <HudLabel className="block">DONNÉES — REGISTRE</HudLabel>
            <div className="hud-clip-tr space-y-2 bg-muted/40 p-3 ring-1 ring-border/60">
              <p className="flex items-center gap-1.5 text-[0.72rem] font-medium">
                <ShieldCheck className="size-3.5 shrink-0 text-primary" />
                100 % local, aucun réseau
              </p>
              <p className="text-[0.68rem] leading-relaxed text-muted-foreground">
                Projets, préférences et médias restent sur cet appareil. Le registre est
                enregistré automatiquement, sans compte ni synchronisation.
              </p>
              <HudReadout
                label="N.ENTRY"
                value={String(projects.length).padStart(2, "0")}
              />
            </div>
          </section>
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border/60 bg-muted/30 px-4 py-2.5">
          <span className="flex min-w-0 items-center gap-2">
            <HudStatusDot tone="ok" />
            {hud ? (
              <span className="text-hud truncate text-muted-foreground">
                PREFS:SAVED · STORAGE:LOCAL
              </span>
            ) : (
              <span className="truncate text-[0.68rem] text-muted-foreground">
                Préférences enregistrées localement
              </span>
            )}
          </span>
          <DialogClose render={<Button type="button" variant="ghost" size="sm" />}>
            Fermer
          </DialogClose>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

/** Ligne de réglage : icône crantée + intitulé + description + contrôle. */
function SettingRow({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-start gap-2.5">
        <span className="hud-clip-tr mt-0.5 flex size-7 shrink-0 items-center justify-center bg-primary/10 text-primary">
          <Icon className="size-3.5" />
        </span>
        <div className="min-w-0 space-y-0.5">
          <p className="text-[0.8rem] leading-tight font-medium">{title}</p>
          <p className="text-[0.68rem] leading-snug text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="shrink-0 pt-1">{children}</div>
    </div>
  );
}

/** Aperçu d'un thème : fond + bandes d'accent, sélection persistée. */
function ThemeSwatch({
  label,
  palette,
  active,
  onSelect,
}: {
  label: string;
  palette: ColorThemePalette;
  active: boolean;
  onSelect: () => void;
}) {
  const { mode } = useSettings();

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      aria-label={`Thème ${label}`}
      className={cn(
        "group flex flex-col gap-1.5 rounded-sm border p-1.5 text-left transition-all duration-200",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
        active
          ? "border-primary/60 bg-primary/8 ring-1 ring-primary/30"
          : "border-border/70 hover:border-primary/40 hover:bg-accent/40",
      )}
    >
      <span
        className="relative block h-9 overflow-hidden rounded-[3px] ring-1 ring-border/60"
        style={{ backgroundColor: palette.bg }}
      >
        <span className="absolute inset-x-0 bottom-0 flex h-2.5">
          <span className="h-full flex-1" style={{ backgroundColor: palette.primary }} />
          <span className="h-full flex-1" style={{ backgroundColor: palette.accent }} />
        </span>
        {active ? (
          <Check
            className={cn(
              "absolute top-1 left-1 size-3",
              mode === "dark" ? "text-white" : "text-neutral-900",
            )}
          />
        ) : null}
      </span>
      <span className="truncate text-[0.66rem] font-medium">{label}</span>
    </button>
  );
}
