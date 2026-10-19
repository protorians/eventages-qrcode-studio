import { useEffect, useMemo, useRef, useState } from "react";
import {
  CloudOff,
  Copy,
  FolderOpen,
  Layers,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
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
import { getQrType } from "@/lib/qr-catalog";
import { useBuilder, type ProjectSummary } from "@/lib/builder-store";
import { cn } from "@/lib/utils";

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
  const { state, projects, newProject, openProject, duplicateProject, deleteProject } =
    useBuilder();
  const [query, setQuery] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const confirmTimer = useRef<number | null>(null);

  // Réinitialise la recherche et la confirmation à chaque ouverture.
  useEffect(() => {
    if (open) {
      setQuery("");
      setConfirmDeleteId(null);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[min(85dvh,44rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
        showCloseButton={false}
      >
        <DialogHeader className="shrink-0 flex-row items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
          <div className="space-y-0.5">
            <DialogTitle>Projets</DialogTitle>
            <DialogDescription>
              Créez, dupliquez et rouvrez vos codes QR, enregistrés localement.
            </DialogDescription>
          </div>
          <div className="relative hidden sm:block">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              placeholder="Rechercher un projet…"
              onChange={(event) => setQuery(event.currentTarget.value)}
              className="h-8 w-52 pl-8 text-xs"
              aria-label="Rechercher un projet"
            />
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1">
          <aside
            className="hidden w-52 shrink-0 flex-col gap-3 border-r border-border/60 bg-sidebar/50 p-3 sm:flex"
            aria-label="Filtres de projets"
          >
            <Button type="button" size="lg" className="w-full justify-center gap-1.5" onClick={handleCreate}>
              <Plus />
              Nouveau projet
            </Button>

            <div className="space-y-1">
              <FilterRow icon={<Layers />} label="Tous les projets" count={projects.length} active />
            </div>

            <div className="mt-auto space-y-1.5 rounded-lg bg-muted/40 p-2.5">
              <p className="flex items-center gap-1.5 text-[0.66rem] font-medium">
                <CloudOff className="size-3 text-emerald-600 dark:text-emerald-400" />
                100 % hors ligne
              </p>
              <p className="text-[0.62rem] leading-relaxed text-muted-foreground">
                Chaque projet (contenu et design) est enregistré automatiquement sur cet
                appareil. Dupliquez un projet pour décliner un design.
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
                    "flex min-h-[11.5rem] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 text-muted-foreground transition-all duration-300 ease-out",
                    "hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/5 hover:text-primary",
                    "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
                  )}
                >
                  <span className="flex size-9 items-center justify-center rounded-xl bg-muted/70">
                    <Plus className="size-4" />
                  </span>
                  <span className="text-[0.72rem] font-medium">Nouveau projet</span>
                </button>

                {filtered.map((project, index) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
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
          <p className="truncate text-[0.66rem] text-muted-foreground">
            {projects.length} projet{projects.length > 1 ? "s" : ""} · enregistré
            {projects.length > 1 ? "s" : ""} localement
          </p>
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
  active,
  confirming,
  style,
  onOpen,
  onDuplicate,
  onRequestDelete,
  onDelete,
}: {
  project: ProjectSummary;
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
        "animate-rise group/card flex flex-col overflow-hidden rounded-xl border transition-all duration-300 ease-out",
        "hover:-translate-y-0.5 hover:shadow-md focus-within:ring-2 focus-within:ring-ring/40",
        active ? "border-primary/50 ring-2 ring-primary/25" : "border-border/70 bg-card/40",
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex flex-1 flex-col text-left focus-visible:outline-none"
        aria-label={`Ouvrir le projet ${project.name}`}
      >
        <span className="relative flex h-20 items-center justify-center bg-muted/40 text-muted-foreground/80">
          <span className="size-11">
            <QrGlyph seed={project.id} size={44} />
          </span>
          {active ? (
            <span className="absolute top-1.5 right-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[0.55rem] font-medium text-primary-foreground">
              En cours
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
          <span className="block h-1 overflow-hidden rounded-full bg-muted">
            <span
              className="block h-full rounded-full bg-linear-to-r from-primary to-primary/60 transition-[width] duration-500 ease-out"
              style={{ width: `${project.progress}%` }}
            />
          </span>
          <span className="block truncate pt-0.5 text-[0.58rem] text-muted-foreground/80">
            Modifié le {dateFormatter.format(project.updatedAt)}
          </span>
        </span>
      </button>

      <div className="flex border-t border-border/60">
        <CardAction onClick={onDuplicate} label="Dupliquer">
          <Copy />
        </CardAction>
        <CardAction
          onClick={confirming ? onDelete : onRequestDelete}
          destructive={confirming}
          label={confirming ? "Confirmer la suppression" : "Supprimer"}
        >
          <Trash2 />
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
        "flex flex-1 items-center justify-center gap-1 py-1.5 text-[0.6rem] font-medium transition-colors duration-200",
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
        "flex items-center gap-2 rounded-lg px-2 py-1.5 text-[0.72rem] font-medium",
        active ? "bg-primary/10 text-foreground" : "text-muted-foreground",
      )}
    >
      <span className="[&_svg]:size-3.5">{icon}</span>
      {label}
      <span className="ml-auto rounded-full bg-muted px-1.5 font-mono text-[0.58rem]">
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
      <span className="flex size-14 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground">
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
