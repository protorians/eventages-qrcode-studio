import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Copy,
  FileDown,
  FolderOpen,
  ImageUp,
  Layers,
  Loader2,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
} from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { QrGlyph } from "@/components/builder/previews";
import { HudCorners, HudLabel, HudReadout, HudStatusDot } from "@/components/builder/hud";
import { getQrType } from "@/lib/qr-catalog";
import { useBuilder, type ProjectSummary } from "@/lib/builder-store";
import { useSettings } from "@/hooks/use-settings";
import { describeError } from "@/lib/qcp";
import { open as openFileDialog } from "@tauri-apps/plugin-dialog";
import { cn } from "@/lib/utils";

const QCP_FILTERS = [{ name: "Projet QR Code Studio", extensions: ["qcp"] }];
const QR_SOURCE_FILTERS = [
  {
    name: "QR code (image, SVG, PDF)",
    extensions: ["png", "jpg", "jpeg", "webp", "gif", "bmp", "svg", "pdf"],
  },
];

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Gestionnaire multi-projets, dans l'esprit de la fenêtre « Nouveau document »
 * de Photoshop : grande modale avec rail latéral, recherche et grille de cartes.
 */
export function ProjectDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const {
    state,
    projects,
    newProject,
    openProject,
    duplicateProject,
    deleteProject,
    saveProjectAsQcp,
    openProjectFromQcp,
    newProjectFromQr,
  } = useBuilder();
  const [query, setQuery] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busy, setBusy] = useState<"open" | "import" | "save" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const confirmTimer = useRef<number | null>(null);
  const { hud } = useSettings();

  // Réinitialise la recherche et la confirmation à chaque ouverture.
  useEffect(() => {
    if (open) {
      setQuery("");
      setConfirmDeleteId(null);
      setError(null);
      setNotice(null);
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (confirmTimer.current) window.clearTimeout(confirmTimer.current);
    };
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return projects;
    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(term) ||
        getQrType(project.typeId).label.toLowerCase().includes(term),
    );
  }, [projects, query]);

  const requestDelete = (id: string) => {
    setConfirmDeleteId(id);
    if (confirmTimer.current) window.clearTimeout(confirmTimer.current);
    confirmTimer.current = window.setTimeout(() => setConfirmDeleteId(null), 3000);
  };

  const handleDelete = (id: string) => {
    if (confirmTimer.current) window.clearTimeout(confirmTimer.current);
    setConfirmDeleteId(null);
    deleteProject(id);
  };

  const handleCreate = () => {
    newProject();
    onOpenChange(false);
  };

  const handleOpen = (id: string) => {
    openProject(id);
    onOpenChange(false);
  };

  /** Ouvre un fichier .qcp et l'ajoute au registre comme nouveau projet. */
  const handleOpenQcp = async () => {
    setError(null);
    setNotice(null);
    const selection = await openFileDialog({
      multiple: false,
      directory: false,
      filters: QCP_FILTERS,
    });
    if (typeof selection !== "string") return;
    setBusy("open");
    try {
      await openProjectFromQcp(selection);
      onOpenChange(false);
    } catch (cause) {
      setError(describeError(cause, "Ouverture du fichier projet impossible."));
    } finally {
      setBusy(null);
    }
  };

  /** Décode un QR existant (image, SVG, PDF) et crée un projet pré-rempli. */
  const handleImportQr = async () => {
    setError(null);
    setNotice(null);
    const selection = await openFileDialog({
      multiple: false,
      directory: false,
      filters: QR_SOURCE_FILTERS,
    });
    if (typeof selection !== "string") return;
    setBusy("import");
    try {
      await newProjectFromQr(selection);
      onOpenChange(false);
    } catch (cause) {
      setError(describeError(cause, "Import du QR code impossible."));
    } finally {
      setBusy(null);
    }
  };

  /** Écrit le projet actif dans une archive .qcp via le backend Rust. */
  const handleSaveQcp = async () => {
    setError(null);
    setNotice(null);
    setBusy("save");
    try {
      const path = await saveProjectAsQcp();
      if (path) setNotice(`Projet enregistré : ${path}`);
    } catch (cause) {
      setError(describeError(cause, "Enregistrement du projet impossible."));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[min(85dvh,44rem)] flex-col gap-0 overflow-hidden p-0 ring-primary/20 sm:max-w-5xl"
        showCloseButton={false}
      >
        <DialogHeader className="relative shrink-0 flex-row items-center justify-between gap-3 border-b border-border/60 bg-card/60 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="hud-clip-tr relative flex size-9 shrink-0 items-center justify-center bg-linear-to-br from-primary/30 to-primary/5 text-primary ring-1 ring-primary/25">
              <Layers className="size-4" />
            </span>
            <div className="space-y-1">
              <HudLabel className="block">REGISTRE — MOD.00</HudLabel>
              <DialogTitle>Projets</DialogTitle>
              <DialogDescription className="text-xs">
                Créez, rouvrez et partagez vos codes QR — y compris via des fichiers .qcp.
              </DialogDescription>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <HudReadout
              className="hidden md:inline-flex"
              label="N.ENTRY"
              value={String(projects.length).padStart(2, "0")}
            />
            <div className="flex items-center gap-0.5 sm:hidden">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={busy !== null}
                onClick={handleOpenQcp}
                aria-label="Ouvrir un fichier projet"
              >
                <FolderOpen />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={busy !== null}
                onClick={handleImportQr}
                aria-label="Importer un QR existant"
              >
                <ImageUp />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={busy !== null}
                onClick={handleSaveQcp}
                aria-label="Enregistrer le projet sous…"
              >
                <FileDown />
              </Button>
            </div>
            <div className="relative hidden sm:block">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                placeholder="Rechercher un projet…"
                onChange={(event) => setQuery(event.currentTarget.value)}
                className="h-8 w-52 rounded-sm pl-8 font-mono text-xs"
                aria-label="Rechercher un projet"
              />
            </div>
          </div>
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-primary/60 via-primary/20 to-transparent"
          />
        </DialogHeader>

        <div className="flex min-h-0 flex-1">
          <aside
            className="hidden w-52 shrink-0 flex-col gap-3 border-r border-border/60 bg-sidebar/50 p-3 sm:flex"
            aria-label="Filtres de projets"
          >
            <HudLabel className="block">ACTIONS — MOD.00</HudLabel>
            <Button
              type="button"
              size="lg"
              className="hud-clip-tr w-full justify-center gap-1.5"
              onClick={handleCreate}
            >
              <Plus />
              Nouveau projet
            </Button>

            <div className="space-y-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-start gap-1.5"
                disabled={busy !== null}
                onClick={handleOpenQcp}
              >
                {busy === "open" ? <Loader2 className="animate-spin" /> : <FolderOpen />}
                Ouvrir un fichier…
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-start gap-1.5"
                disabled={busy !== null}
                onClick={handleImportQr}
              >
                {busy === "import" ? <Loader2 className="animate-spin" /> : <ImageUp />}
                Importer un QR…
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-start gap-1.5"
                disabled={busy !== null}
                onClick={handleSaveQcp}
              >
                {busy === "save" ? <Loader2 className="animate-spin" /> : <FileDown />}
                Enregistrer sous…
              </Button>
            </div>

            {state.filePath ? (
              <p className="truncate px-1 font-mono text-[0.6rem] text-muted-foreground/80">
                Lié à {state.filePath}
              </p>
            ) : null}

            {error ? (
              <Alert variant="destructive" className="animate-fade-in">
                <TriangleAlert />
                <AlertDescription className="text-[0.66rem] leading-snug">
                  {error}
                </AlertDescription>
              </Alert>
            ) : null}
            {notice ? (
              <Alert className="animate-fade-in">
                <Check />
                <AlertDescription className="font-mono text-[0.62rem] leading-snug break-all">
                  {notice}
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-1.5">
              <HudLabel className="block">FILTRES — TYPE</HudLabel>
              <FilterRow icon={<Layers />} label="Tous les projets" count={projects.length} active />
            </div>

            <div className="hud-clip-tr mt-auto space-y-1.5 bg-muted/40 p-2.5 ring-1 ring-border/60">
              <p className="text-hud flex items-center gap-1.5 text-muted-foreground">
                <HudStatusDot tone="ok" />
                {hud ? "OFFLINE:OK — 100% LOCAL" : "Fonctionnement hors ligne"}
              </p>
              <p className="text-[0.62rem] leading-relaxed text-muted-foreground">
                Chaque projet est enregistré automatiquement sur cet appareil. Le format
                .qcp regroupe contenu, design et fichiers média dans un seul fichier
                partageable — ouvrable ici à tout moment.
              </p>
            </div>
          </aside>

          <ScrollArea className="min-h-0 flex-1">
            {filtered.length === 0 ? (
              <EmptyState query={query} count={projects.length} onCreate={handleCreate} />
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(11.5rem,1fr))] gap-3 p-4">
                <button
                  type="button"
                  onClick={handleCreate}
                  className={cn(
                    "group/new flex min-h-[11.5rem] flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-border/80 text-muted-foreground transition-all duration-300 ease-out",
                    "hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/5 hover:text-primary",
                    "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
                  )}
                >
                  <span className="hud-clip-tr flex size-9 items-center justify-center bg-muted/70 transition-colors duration-300 group-hover/new:bg-primary/15">
                    <Plus className="size-4" />
                  </span>
                  <span className="text-[0.72rem] font-medium">Nouveau projet</span>
                  {hud ? (
                    <span className="text-hud text-muted-foreground/60">NEW.ENTRY</span>
                  ) : null}
                </button>

                {filtered.map((project, index) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    index={index}
                    total={filtered.length}
                    active={project.id === state.projectId}
                    style={{ animationDelay: `${Math.min(index, 12) * 24}ms` }}
                    confirming={confirmDeleteId === project.id}
                    onOpen={() => handleOpen(project.id)}
                    onDuplicate={() => duplicateProject(project.id)}
                    onRequestDelete={() => requestDelete(project.id)}
                    onDelete={() => handleDelete(project.id)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border/60 bg-muted/30 px-4 py-2.5">
          <span className="flex min-w-0 items-center gap-2">
            <HudStatusDot tone="ok" />
            {hud ? (
              <span className="text-hud truncate text-muted-foreground">
                {projects.length} PROJET{projects.length > 1 ? "S" : ""} · STORAGE:LOCAL
              </span>
            ) : (
              <span className="truncate text-[0.68rem] text-muted-foreground">
                {projects.length} projet{projects.length > 1 ? "s" : ""} enregistré
                {projects.length > 1 ? "s" : ""} localement
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

function ProjectCard({
  project,
  index,
  total,
  active,
  confirming,
  style,
  onOpen,
  onDuplicate,
  onRequestDelete,
  onDelete,
}: {
  project: ProjectSummary;
  index: number;
  total: number;
  active: boolean;
  confirming: boolean;
  style: React.CSSProperties;
  onOpen: () => void;
  onDuplicate: () => void;
  onRequestDelete: () => void;
  onDelete: () => void;
}) {
  const type = getQrType(project.typeId);
  return (
    <div
      style={style}
      className={cn(
        "animate-rise group/card relative flex flex-col overflow-hidden rounded-sm border transition-all duration-300 ease-out",
        "hover:-translate-y-0.5 hover:shadow-md focus-within:ring-2 focus-within:ring-ring/40",
        active
          ? "glow-primary border-primary/50 ring-2 ring-primary/25"
          : "border-border/70 bg-card/40",
      )}
    >
      {active ? <HudCorners inset="0.2rem" size="0.55rem" /> : null}
      <button
        type="button"
        onClick={onOpen}
        className="flex flex-1 flex-col text-left focus-visible:outline-none"
        aria-label={`Ouvrir le projet ${project.name}`}
      >
        <span className="relative flex h-20 items-center justify-center border-b border-border/50 bg-muted/40 text-muted-foreground/80">
          <span className="size-11">
            <QrGlyph seed={project.id} size={44} />
          </span>
          <span
            aria-hidden="true"
            className="text-hud absolute top-1.5 left-2 text-muted-foreground/50"
          >
            {String(index + 1).padStart(2, "0")}/{String(total).padStart(2, "0")}
          </span>
          {active ? (
            <span className="hud-clip-tr text-hud absolute top-0 right-0 bg-primary px-1.5 py-1 text-primary-foreground">
              EN COURS
            </span>
          ) : null}
        </span>
        <span className="flex-1 space-y-1 p-2.5">
          <span className="block truncate text-[0.76rem] font-medium">{project.name}</span>
          <span className="flex items-center gap-1.5 text-[0.6rem] text-muted-foreground">
            <type.icon className="size-3 shrink-0" />
            <span className="truncate">{type.label}</span>
            <span className="ml-auto shrink-0 font-mono">{project.progress}%</span>
          </span>
          <span className="block h-1 overflow-hidden bg-muted">
            <span
              className="progress-ticks block h-full bg-primary transition-[width] duration-500 ease-out"
              style={{ width: `${project.progress}%` }}
            />
          </span>
          <span className="block truncate pt-0.5 text-[0.58rem] text-muted-foreground/80">
            Modifié le {dateFormatter.format(project.updatedAt)}
          </span>
        </span>
      </button>

      <div className="flex border-t border-border/60">
        <div className="flex-auto" />
        <CardAction onClick={onDuplicate} label="Dupliquer">
          <Copy size={12} />
        </CardAction>
        <CardAction
          onClick={confirming ? onDelete : onRequestDelete}
          destructive={confirming}
          label={confirming ? "Confirmer la suppression" : "Supprimer"}
        >
          <Trash2 size={12} />
          <span>{confirming ? "Confirmer ?" : "Supprimer"}</span>
        </CardAction>
      </div>
    </div>
  );
}

function CardAction({
  children,
  label,
  destructive,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  destructive?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex flex-1 items-center justify-center gap-1 py-2 px-2.5 text-[0.6rem] font-medium transition-colors duration-200",
        "hover:bg-accent/70 focus-visible:bg-accent/70 focus-visible:outline-none",
        destructive
          ? "text-destructive hover:bg-destructive/10 focus-visible:bg-destructive/10"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function FilterRow({
  icon,
  label,
  count,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  active?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex items-center gap-2 rounded-sm px-2 py-1.5 text-[0.72rem] font-medium",
        active
          ? "bg-primary/10 text-foreground shadow-[inset_2px_0_0_0_color-mix(in_oklch,_var(--primary)_85%,_transparent)]"
          : "text-muted-foreground",
      )}
    >
      <span className="[&_svg]:size-3.5">{icon}</span>
      {label}
      <span className="ml-auto rounded-none bg-muted px-1.5 font-mono text-[0.58rem]">
        {count}
      </span>
    </span>
  );
}

function EmptyState({
  query,
  count,
  onCreate,
}: {
  query: string;
  count: number;
  onCreate: () => void;
}) {
  const empty = count === 0;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="hud-clip-tr flex size-14 items-center justify-center bg-muted/50 text-muted-foreground ring-1 ring-border/60">
        <FolderOpen className="size-6" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium">
          {empty ? "Aucun projet pour l'instant" : "Aucun projet ne correspond"}
        </p>
        <p className="mx-auto max-w-64 text-[0.68rem] leading-relaxed text-muted-foreground">
          {empty
            ? "Créez votre premier code QR : contenu, style, logo et cadre restent modifiables à tout moment."
            : `Aucun résultat pour « ${query} ». Essayez un autre nom ou un autre type.`}
        </p>
      </div>
      {empty ? (
        <Button type="button" className="gap-1.5" onClick={onCreate}>
          <Plus />
          Nouveau projet
        </Button>
      ) : null}
    </div>
  );
}
