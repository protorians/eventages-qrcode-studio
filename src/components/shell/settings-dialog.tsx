import { useEffect, useState } from "react";
import {
  Check,
  Moon,
  Palette,
  RefreshCw,
  ScanLine,
  Settings2,
  ShieldCheck,
  Sun,
  Terminal,
  TriangleAlert,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { HudLabel, HudReadout, HudStatusDot } from "@/components/shell/hud";
import {
  COLOR_THEMES,
  useSettings,
  type ColorThemePalette,
} from "@/hooks/use-settings";
import { useBuilder } from "@/lib/builder-store";
import { fetchCliStatus, installCli, uninstallCli, type CliStatus } from "@/lib/cli-desktop";
import { cn } from "@/lib/utils";

/** Sections de la fenêtre de paramètres (rail à gauche, contenu à droite). */
type SettingsSectionId = "appearance" | "interface" | "project" | "data" | "cli";

const SETTINGS_SECTIONS: {
  id: SettingsSectionId;
  label: string;
  detail: string;
  code: string;
  icon: LucideIcon;
}[] = [
  {
    id: "appearance",
    label: "Apparence",
    detail: "Thème sombre et couleurs de l'interface",
    code: "MOD.01",
    icon: Palette,
  },
  {
    id: "interface",
    label: "Interface",
    detail: "Mode HUD et animations",
    code: "MOD.02",
    icon: ScanLine,
  },
  {
    id: "project",
    label: "Projet",
    detail: "Enregistrement du fichier lié",
    code: "MOD.03",
    icon: RefreshCw,
  },
  {
    id: "data",
    label: "Données",
    detail: "Registre local et confidentialité",
    code: "MOD.04",
    icon: ShieldCheck,
  },
  {
    id: "cli",
    label: "CLI",
    detail: "Commandes eventages-qr du terminal",
    code: "MOD.05",
    icon: Terminal,
  },
];

/**
 * Réglages de l'application : fenêtre élargie, sections en rail à gauche et
 * contenu à droite — apparence, interface, enregistrement, données. Les
 * préférences sont persistées localement par le SettingsProvider
 * (use-settings.tsx).
 */
export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { hud } = useSettings();
  const { projects } = useBuilder();
  const [section, setSection] = useState<SettingsSectionId>("appearance");
  const active = SETTINGS_SECTIONS.find((item) => item.id === section) ?? SETTINGS_SECTIONS[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[min(85dvh,40rem)] w-full flex-col gap-0 overflow-hidden p-0 ring-primary/20 sm:max-w-2xl"
        showCloseButton={false}
      >
        <DialogHeader className="relative shrink-0 flex-row items-center justify-between gap-3 border-b border-border/60 bg-card/60 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="hud-clip-tr relative flex size-9 shrink-0 items-center justify-center bg-linear-to-br from-primary/30 to-primary/5 text-primary ring-1 ring-primary/25">
              <Settings2 className="size-4" />
            </span>
            <div className="space-y-1">
              <HudLabel className="block">SYSTÈME — {active.code}</HudLabel>
              <DialogTitle>Paramètres</DialogTitle>
              <DialogDescription className="text-xs">
                {active.detail} — enregistré sur cet appareil.
              </DialogDescription>
            </div>
          </div>
          <HudReadout className="hidden sm:inline-flex" label="PREFS" value="LOCAL" />
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-primary/60 via-primary/20 to-transparent"
          />
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          {/* Rail de navigation : sections verticales à gauche (≥ sm). */}
          <nav
            aria-label="Sections des paramètres"
            className="hidden w-48 shrink-0 flex-col gap-1 border-r border-border/60 bg-muted/20 p-2 sm:flex"
          >
            {SETTINGS_SECTIONS.map((item) => (
              <SectionButton
                key={item.id}
                active={item.id === section}
                onClick={() => setSection(item.id)}
                icon={item.icon}
                label={item.label}
                detail={item.detail}
              />
            ))}
          </nav>

          {/* Rail horizontal de secours (< sm) : mêmes sections en puces. */}
          <div className="no-scrollbar flex shrink-0 gap-1 overflow-x-auto border-b border-border/60 p-2 sm:hidden">
            {SETTINGS_SECTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                aria-pressed={item.id === section}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-[0.7rem] font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                  item.id === section
                    ? "border-primary/40 bg-primary/12 text-foreground"
                    : "border-border text-muted-foreground hover:bg-accent/60",
                )}
              >
                <item.icon className="size-3.5" />
                {item.label}
              </button>
            ))}
          </div>

          <div
            key={section}
            className="panel-scroll min-h-0 flex-1 animate-fade-in overflow-y-auto p-4"
          >
            {section === "appearance" ? <AppearanceSection /> : null}
            {section === "interface" ? <InterfaceSection /> : null}
            {section === "project" ? <ProjectSection /> : null}
            {section === "data" ? <DataSection entries={projects.length} /> : null}
            {section === "cli" ? <CliSection /> : null}
          </div>
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

/** Bouton du rail : icône, libellé, détail et marqueur d'activation. */
function SectionButton({
  active,
  onClick,
  icon: Icon,
  label,
  detail,
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  detail: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active || undefined}
      className={cn(
        "group/rail relative flex items-start gap-2.5 rounded-sm px-2.5 py-2 text-left transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        active
          ? "bg-primary/12 text-foreground"
          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
      )}
    >
      {active ? (
        <span className="absolute inset-y-1.5 left-0 w-0.5 bg-primary" aria-hidden="true" />
      ) : null}
      <Icon
        className={cn(
          "mt-0.5 size-4 shrink-0 transition-colors",
          active ? "text-primary" : "",
        )}
      />
      <span className="min-w-0">
        <span className="block text-[0.78rem] leading-tight font-medium">{label}</span>
        <span className="block text-[0.62rem] leading-snug text-muted-foreground">
          {detail}
        </span>
      </span>
    </button>
  );
}

/** Apparence : mode clair / sombre + thème de couleurs. */
function AppearanceSection() {
  const { mode, setMode, colorTheme, setColorTheme } = useSettings();

  return (
    <div className="space-y-5">
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
      </section>

      <Separator />

      <section className="space-y-3">
        <HudLabel className="block">APPARENCE — COULEURS</HudLabel>
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
    </div>
  );
}

/** Interface : ornements HUD et animations. */
function InterfaceSection() {
  const { hud, setHud, animations, setAnimations } = useSettings();

  return (
    <div className="space-y-5">
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
    </div>
  );
}

/** Projet : enregistrement automatique du fichier .qrd lié. */
function ProjectSection() {
  const { autoSaveFile, setAutoSaveFile } = useSettings();

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <HudLabel className="block">PROJET — ENREGISTREMENT</HudLabel>
        <SettingRow
          icon={RefreshCw}
          title="Enregistrement automatique"
          description="Réécrit le fichier .qrd lié après chaque modification stabilisée. Désactivé, seul « Enregistrer » (⌘S) écrit le fichier."
        >
          <Switch
            checked={autoSaveFile}
            onCheckedChange={setAutoSaveFile}
            aria-label="Enregistrement automatique du fichier lié"
          />
        </SettingRow>
      </section>

      <Separator />

      <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
        <p className="text-[0.68rem] leading-relaxed text-muted-foreground">
          Sans fichier lié, le projet reste un brouillon local : « Enregistrer »
          (⌘S) propose alors un emplacement et lie l'archive .qrd au projet.
        </p>
      </div>
    </div>
  );
}

/** Données : rappel du fonctionnement 100 % local. */
function DataSection({ entries }: { entries: number }) {
  return (
    <div className="space-y-5">
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
          <HudReadout label="N.ENTRY" value={String(entries).padStart(2, "0")} />
        </div>
      </section>
    </div>
  );
}

/**
 * CLI : mise à disposition des commandes `eventages-qr` et `eqr` dans le
 * terminal (liens symboliques posés dans le PATH par le backend natif). L'état
 * est relu à l'ouverture de la section ; le retrait reste possible même si le
 * script source a depuis disparu, pour nettoyer la machine.
 */
function CliSection() {
  const [status, setStatus] = useState<CliStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCliStatus()
      .then((next) => {
        if (!cancelled) setStatus(next);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = async (checked: boolean): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      setStatus(checked ? await installCli() : await uninstallCli());
    } catch (failure) {
      setError(
        failure instanceof Error && failure.message
          ? failure.message
          : "La mise à disposition du CLI a échoué.",
      );
    } finally {
      setBusy(false);
    }
  };

  // Hors shell Tauri (simple navigateur) ou backend indisponible : pas de contrôle.
  if (!status) {
    return (
      <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
        <p className="text-[0.68rem] leading-relaxed text-muted-foreground">
          La section CLI n'est disponible que dans l'application desktop : elle pose
          les commandes <span className="font-mono">eventages-qr</span> et{" "}
          <span className="font-mono">eqr</span> dans le terminal.
        </p>
      </div>
    );
  }

  const disabled = busy || status.binDir === null || (!status.available && !status.installed);

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <HudLabel className="block">CLI — TERMINAL</HudLabel>
        <SettingRow
          icon={Terminal}
          title="Disponible dans le terminal"
          description="Pose les commandes eventages-qr et eqr dans le PATH — liens symboliques vers le script du dépôt, exécuté avec bun. Rien d'autre n'est modifié."
        >
          <Switch
            checked={status.installed}
            disabled={disabled}
            onCheckedChange={toggle}
            aria-label="Commandes du CLI dans le terminal"
          />
        </SettingRow>
      </section>

      {error ? (
        <Alert variant="destructive" className="border-destructive/40">
          <TriangleAlert className="size-4" />
          <AlertDescription className="text-[0.7rem] leading-snug">{error}</AlertDescription>
        </Alert>
      ) : (
        <p className="flex items-center gap-2 text-[0.68rem] leading-snug text-muted-foreground">
          <HudStatusDot tone={status.installed ? "ok" : "primary"} />
          {status.message}
        </p>
      )}

      <Separator />

      <section className="space-y-3">
        <HudLabel className="block">CLI — DÉTAIL</HudLabel>
        <div className="hud-clip-tr space-y-2 bg-muted/40 p-3 ring-1 ring-border/60">
          <p className="flex items-center gap-1.5 text-[0.72rem] font-medium">
            <Terminal className="size-3.5 shrink-0 text-primary" />
            Deux noms, un seul script
          </p>
          <p className="text-[0.68rem] leading-relaxed text-muted-foreground">
            <span className="font-mono">eventages-qr</span> est le nom complet,{" "}
            <span className="font-mono">eqr</span> l'alias court. Les deux pilotent
            les mêmes projets que l'app : création, rendu SVG/PNG et échange .qrd,
            sans interface ni réseau.
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <HudReadout label="CMD" value={status.commands.join(" · ")} />
            <HudReadout label="BIN" value={status.binDir ?? "—"} />
            <HudReadout label="SCRIPT" value={scriptTail(status.scriptPath)} />
          </div>
        </div>
      </section>

      <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
        <p className="text-[0.68rem] leading-relaxed text-muted-foreground">
          L'espace de travail du CLI (un dossier, un fichier JSON par projet) se
          règle par commande avec <span className="font-mono">--dir</span>, ou une
          fois pour toutes avec la variable{" "}
          <span className="font-mono">EVENTAGES_QR_DIR</span>.
        </p>
      </div>
    </div>
  );
}

/** Chemin du script résumé à ses deux derniers segments (cli/eventages-qr.ts). */
function scriptTail(path: string | null): string {
  if (!path) return "—";
  const parts = path.split(/[\\/]/);
  return parts.slice(-2).join("/");
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
