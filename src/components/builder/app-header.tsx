import {
  CloudOff,
  Download,
  FolderOpen,
  Library,
  Moon,
  QrCode,
  SlidersHorizontal,
  Sun,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useBuilder } from "@/lib/builder-store";
import { cn } from "@/lib/utils";

export function AppHeader({
  theme,
  onToggleTheme,
  onOpenLibrary,
  onOpenModules,
  onOpenProjects,
  onExport,
  showLibraryButton,
}: {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onOpenLibrary: () => void;
  onOpenModules: () => void;
  onOpenProjects: () => void;
  onExport: () => void;
  showLibraryButton: boolean;
}) {
  const { state, type, progress } = useBuilder();

  return (
    <header className="relative z-20 flex shrink-0 items-center gap-2 border-b border-border/60 bg-background/70 px-2.5 py-2 backdrop-blur-xl sm:px-3.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="relative flex size-8 items-center justify-center rounded-xl bg-linear-to-br from-primary/30 via-primary/15 to-transparent text-primary ring-1 ring-primary/25">
          <QrCode className="size-4" />
          <span className="absolute inset-0 rounded-xl bg-primary/10 blur-md" />
        </span>
        <div className="min-w-0">
          <p className="font-heading truncate text-[0.85rem] leading-tight font-semibold">
            QR Code Studio
          </p>
          <p className="flex items-center gap-1.5 truncate text-[0.65rem] leading-tight text-muted-foreground">
            <CloudOff className="size-2.5 shrink-0" />
            <span className="truncate">{state.projectName}</span>
          </p>
        </div>
      </div>

      <div className="mx-1 hidden h-6 items-center gap-1.5 md:flex">
        <Separator orientation="vertical" className="mr-2 h-5" />
        <Badge variant="outline" className="text-[0.62rem]">
          {type.label}
        </Badge>
        <span className="hidden font-mono text-[0.62rem] text-muted-foreground lg:inline">
          {progress}% complété
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
                  className="hidden gap-1.5 md:inline-flex"
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
                className="text-muted-foreground"
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
                onClick={onOpenModules}
                aria-label="Options de création"
                className="text-muted-foreground md:hidden"
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
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={onOpenProjects}
              />
            }
          >
            <FolderOpen />
            <span className="hidden sm:inline">Projet</span>
          </TooltipTrigger>
          <TooltipContent>Gestionnaire de projets</TooltipContent>
        </Tooltip>

        <Button type="button" size="sm" className="gap-1.5" onClick={onExport}>
          <Download />
          <span className="hidden sm:inline">Exporter</span>
        </Button>
      </div>
    </header>
  );
}
