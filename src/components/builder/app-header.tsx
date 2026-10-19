import { useCallback, useEffect, useState } from "react";
import {
  Check,
  CloudOff,
  Download,
  FolderOpen,
  Library,
  Loader2,
  Moon,
  QrCode,
  Save,
  Settings2,
  SlidersHorizontal,
  Sun,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HudReadout, HudStatusDot } from "@/components/builder/hud";
import { useBuilder } from "@/lib/builder-store";
import { useSettings } from "@/hooks/use-settings";
import { describeError } from "@/lib/qcp";
import { cn } from "@/lib/utils";

/** Bandeau supérieur façon console de contrôle : marque, télémétrie, actions. */
export function AppHeader({
  theme,
  onToggleTheme,
  onOpenSettings,
  onOpenLibrary,
  onOpenModules,
  onOpenProjects,
  onExport,
  showLibraryButton,
}: {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onOpenLibrary: () => void;
  onOpenModules: () => void;
  onOpenProjects: () => void;
  onExport: () => void;
  showLibraryButton: boolean;
}) {
  const { state, type, progress, dirty, saveProject, saveProjectAsQcp } = useBuilder();
  const { hud } = useSettings();
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Sauvegarde manuelle (fichier lié, sinon boîte de dialogue). */
  const runSave = useCallback(
    async (mode: "save" | "saveAs") => {
      if (busy) return;
      setBusy(true);
      setError(null);
      try {
        if (mode === "save") await saveProject();
        else await saveProjectAsQcp();
        setFlash(true);
        window.setTimeout(() => setFlash(false), 2000);
      } catch (cause) {
        setError(describeError(cause, "Enregistrement du projet impossible."));
        window.setTimeout(() => setError(null), 6000);
      } finally {
        setBusy(false);
      }
    },
    [busy, saveProject, saveProjectAsQcp],
  );

  // Raccourcis clavier : ⌘S enregistre, ⌘⇧S propose « Enregistrer sous… ».
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "s") return;
      event.preventDefault();
      event.stopPropagation();
      void runSave(event.shiftKey ? "saveAs" : "save");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [runSave]);

  return (
    <header className="relative z-20 flex shrink-0 items-center gap-2 border-b border-border/60 bg-background/75 px-2.5 py-2 backdrop-blur-xl sm:px-3.5">
      {/* Ligne d'énergie sous le bandeau + doublé technique. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-linear-to-r from-primary/70 via-primary/20 to-transparent"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -bottom-[4px] h-px bg-primary/15"
      />

      <div className="flex min-w-0 items-center gap-2.5">
        <span className="hud-clip-tr relative flex size-8 shrink-0 items-center justify-center bg-linear-to-br from-primary to-primary/55 text-primary-foreground">
          <QrCode className="size-4" />
          <span className="animate-glow absolute inset-0 -z-10 bg-primary/50 blur-md" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[0.8rem] leading-tight font-bold tracking-[0.18em] uppercase">
            QR Code Studio
          </p>
          <p className="flex items-center gap-1.5 truncate text-[0.62rem] leading-tight text-muted-foreground">
            <HudStatusDot tone="ok" />
            <CloudOff className="size-2.5 shrink-0" />
            {hud ? <span className="text-hud text-muted-foreground/70">SYS:LOCAL</span> : null}
            <span className="truncate font-mono">{state.projectName}</span>
          </p>
        </div>
      </div>

      <div className="mx-1 hidden h-6 items-center gap-1.5 md:flex">
        <Separator orientation="vertical" className="mr-2 h-5" />
        <Badge
          variant="outline"
          className="rounded-none border-primary/35 bg-primary/8 px-1.5 font-mono text-[0.6rem] tracking-[0.1em] text-primary"
        >
          {type.label}
        </Badge>
        <HudReadout label="PRG" value={`${progress}%`} className="hidden lg:inline-flex" />
        <span
          aria-hidden="true"
          className="hidden h-1 w-14 overflow-hidden bg-muted lg:block"
        >
          <span
            className="progress-ticks block h-full bg-primary transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </span>
      </div>

      <div className="ml-auto flex items-center gap-1">
        {showLibraryButton ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="hidden gap-1.5 rounded-sm md:inline-flex"
                  onClick={onOpenLibrary}
                />
              }
            >
              <Library />
              <span className="hidden sm:inline">Bibliothèque</span>
            </TooltipTrigger>
            <TooltipContent>Types, mockups et modèles</TooltipContent>
          </Tooltip>
        ) : null}

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onToggleTheme}
                aria-label="Changer de thème"
                className="rounded-sm text-muted-foreground"
              />
            }
          >
            <span className="relative block size-4">
              <Sun
                className={cn(
                  "absolute inset-0 transition-all duration-500",
                  theme === "dark" ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100",
                )}
              />
              <Moon
                className={cn(
                  "absolute inset-0 transition-all duration-500",
                  theme === "dark" ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0",
                )}
              />
            </span>
          </TooltipTrigger>
          <TooltipContent>Thème clair / sombre</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onOpenSettings}
                aria-label="Paramètres"
                className="rounded-sm text-muted-foreground"
              />
            }
          >
            <Settings2 />
          </TooltipTrigger>
          <TooltipContent>Paramètres, thèmes et HUD</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onOpenModules}
                aria-label="Options de création"
                className="rounded-sm text-muted-foreground md:hidden"
              />
            }
          >
            <SlidersHorizontal />
          </TooltipTrigger>
          <TooltipContent>Options de création</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => void runSave("save")}
                disabled={busy}
                aria-label="Enregistrer le projet courant"
                className={cn(
                  "rounded-sm",
                  error ? "text-destructive" : dirty ? "text-foreground" : "text-muted-foreground",
                )}
              />
            }
          >
            {busy ? (
              <Loader2 className="animate-spin" />
            ) : error ? (
              <TriangleAlert />
            ) : flash ? (
              <Check className="text-primary" />
            ) : (
              <Save />
            )}
          </TooltipTrigger>
          <TooltipContent className="max-w-72">
            {error
              ? error
              : dirty
                ? "Enregistrer le projet · ⌘S"
                : "Projet enregistré · ⌘S pour réenregistrer"}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-sm"
                onClick={onOpenProjects}
              />
            }
          >
            <FolderOpen />
            <span className="hidden sm:inline">Projet</span>
          </TooltipTrigger>
          <TooltipContent>Gestionnaire de projets</TooltipContent>
        </Tooltip>

        <Button
          type="button"
          size="sm"
          className="glow-primary gap-1.5 rounded-sm"
          onClick={onExport}
        >
          <Download />
          <span className="hidden sm:inline">Exporter</span>
        </Button>
      </div>
    </header>
  );
}
