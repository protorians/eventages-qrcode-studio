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
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { QrGlyph } from "@/components/builder/previews";
import { HudCorners, HudLabel, HudReadout, HudStatusDot } from "@/components/builder/hud";
import { getQrType } from "@/lib/qr-catalog";
import { useBuilder, type ProjectSummary } from "@/lib/builder-store";
import { useWorkspace } from "@/lib/workspace-store";
import { useSettings } from "@/hooks/use-settings";
import { describeError } from "@/lib/qcp";
import { open as openFileDialog } from "@tauri-apps/plugin-dialog";
import { cn } from "@/lib/utils";

const QCP_FILTERS = [{ name: "Projet Eventages Lite", extensions: ["qcp"] }];
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
 * Onglet « Accueil » de l'espace de travail : gestionnaire de projets à
 * part entière (ancienne modale « Projet », promue page permanente non
 * fermable). Chaque carte ouvre le projet dans son propre onglet.
 */
export function HomeView() {
  const {
    projects,
    duplicateProject,
    deleteProject,
    saveProjectAsQcp,
    openProjectFromQcp,
    newProjectFromQr,
  } = useBuilder();
  const { activeTabId, openProjectIds, openProjectTab, createProjectTab, closeProjectTab } =
    useWorkspace();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busy, setBusy] = useState<"open" | "import" | "save" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const confirmTimer = useRef<number | null>(null);
  const { hud } = useSettings();

  useEffect(() => {
    return () => {
      if (confirmTimer.current) window.clearTimeout(confirmTimer.current);
    };
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return projects.filter((project) => {
      if (typeFilter && project.typeId !== typeFilter) return false;
      if (!term) return true;
      return (
        project.name.toLowerCase().includes(term) ||
        getQrType(project.typeId).label.toLowerCase().includes(term)
      );
    });
  }, [projects, query, typeFilter]);

  /** Filtres par type de code, déduits du registre, avec leur effectif. */
  const typeOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const project of projects) {
      counts.set(project.typeId, (counts.get(project.typeId) ?? 0) + 1);
    }
    return [...counts.entries()].map(([typeId, count]) => ({ typeId, count }));
  }, [projects]);

  const lastActivity = projects[0]?.updatedAt ?? null;

  const requestDelete = (id: string) => {
    setConfirmDeleteId(id);
    if (confirmTimer.current) window.clearTimeout(confirmTimer.current);
    confirmTimer.current = window.setTimeout(() => setConfirmDeleteId(null), 3000);
  };

  const handleDelete = (id: string) => {
    if (confirmTimer.current) window.clearTimeout(confirmTimer.current);
    setConfirmDeleteId(null);
    deleteProject(id);
    // Le projet disparaît du registre : son onglet, s'il existait, se ferme.
    closeProjectTab(id);
  };

  const handleCreate = () => createProjectTab();

  const handleOpen = (id: string) => openProjectTab(id);

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
      const id = await openProjectFromQcp(selection);
      openProjectTab(id);
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
      const id = await newProjectFromQr(selection);
      openProjectTab(id);
    } catch (cause) {
      setError(describeError(cause, "Import du QR code impossible."));
    } finally {
      setBusy(null);
    }
  };

  /** Écrit le brouillon actif dans une archive .qcp via le backend Rust. */
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
    <section aria-label="Gestionnaire de projets" className="flex min-h-0 flex-1 flex-col">
      {/* Bandeau d'en-tête : titre, statistiques et actions principales. */}
      <div className="relative shrink-0 border-b border-border/60 px-4 pt-5 pb-4 sm:px-6">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-linear-to-r from-primary/60 via-primary/20 to-transparent"
        />
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="min-w-0 space-y-1.5">
            <HudLabel className="block">REGISTRE — MOD.00</HudLabel>
            <h1 className="hud-heading text-2xl leading-none font-bold tracking-wide uppercase">
              Projets
            </h1>
            <p className="max-w-prose text-[0.8rem] leading-snug text-muted-foreground">
              Créez, rouvrez et partagez vos codes QR. Ouvrir un projet lui
              dédie un onglet dans la barre de titre — l'accueil reste toujours
              à portée de clic.
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
              <HudReadout label="ENTRIES" value={String(projects.length).padStart(2, "0")} />
              <HudReadout
                label="ONGLETS"
                value={String(openProjectIds.length).padStart(2, "0")}
              />
              <HudReadout
                label="DERNIÈRE"
                value={lastActivity ? dateFormatter.format(lastActivity) : "—"}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="lg"
              className="hud-clip-tr gap-1.5"
              onClick={handleCreate}
            >
              <Plus />
              Nouveau projet
            </Button>
            <div className="flex items-center gap-1">
              <IconAction
                label="Ouvrir un fichier projet (.qcp)"
                disabled={busy !== null}
                onClick={() => void handleOpenQcp()}
              >
                {busy === "open" ? <Loader2 className="animate-spin" /> : <FolderOpen />}
              </IconAction>
              <IconAction
                label="Importer un QR existant"
                disabled={busy !== null}
                onClick={() => void handleImportQr()}
              >
                {busy === "import" ? <Loader2 className="animate-spin" /> : <ImageUp />}
              </IconAction>
              <IconAction
                label="Enregistrer le brouillon actif sous…"
                disabled={busy !== null}
                onClick={() => void handleSaveQcp()}
              >
                {busy === "save" ? <Loader2 className="animate-spin" /> : <FileDown />}
              </IconAction>
            </div>
          </div>
        </div>
      </div>

      {/* Barre d'outils : recherche puis filtres par type de code. */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            placeholder="Rechercher un projet…"
            onChange={(event) => setQuery(event.currentTarget.value)}
            className="h-8 w-52 rounded-sm pl-8 font-mono text-xs"
            aria-label="Rechercher un projet"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrer par type">
          <FilterChip
            icon={<Layers />}
            label="Tous"
            count={projects.length}
            active={typeFilter === null}
            onClick={() => setTypeFilter(null)}
          />
          {typeOptions.map(({ typeId, count }) => {
            const type = getQrType(typeId);
            return (
              <FilterChip
                key={typeId}
                icon={<type.icon />}
                label={type.label}
                count={count}
                active={typeFilter === typeId}
                onClick={() => setTypeFilter(typeFilter === typeId ? null : typeId)}
              />
            );
          })}
        </div>
      </div>

      {error || notice ? (
        <div className="shrink-0 space-y-2 px-4 pb-3 sm:px-6">
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
        </div>
      ) : null}

      {/* Grille des projets. */}
      <ScrollArea className="min-h-0 flex-1">
        {filtered.length === 0 ? (
          <EmptyState
            query={query}
            count={projects.length}
            onCreate={handleCreate}
            onReset={() => {
              setQuery("");
              setTypeFilter(null);
            }}
          />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-3 px-4 pt-1 pb-6 sm:px-6">
            <NewProjectCard onCreate={handleCreate} hud={hud} />
            {filtered.map((project, index) => (
              <ProjectCard
                key={project.id}
                project={project}
                index={index}
                total={filtered.length}
                active={activeTabId === project.id}
                open={openProjectIds.includes(project.id)}
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

      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-muted/30 px-4 py-2.5 sm:px-6">
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
        <span className="truncate text-[0.62rem] text-muted-foreground/80">
          {hud ? "OFFLINE:OK — 100% LOCAL" : "Tout fonctionne hors ligne, sur cet appareil."}
        </span>
      </footer>
    </section>
  );
}

/** Bouton d'action icône (actions fichiers de l'en-tête). */
function IconAction({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      title={label}
      className="rounded-sm"
    >
      {children}
    </Button>
  );
}

/** Puce de filtre par type de code, avec effectif. */
function FilterChip({
  icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-7 gap-1.5 rounded-sm px-2.5 font-mono text-[0.62rem] tracking-[0.08em] uppercase",
        active
          ? "border-primary/50 bg-primary/10 text-foreground"
          : "text-muted-foreground",
      )}
    >
      <span className="[&_svg]:size-3">{icon}</span>
      {label}
      <span className="rounded-none bg-muted px-1 font-mono text-[0.58rem]">{count}</span>
    </Button>
  );
}

/** Carte d'ajout en tête de grille. */
function NewProjectCard({
  onCreate,
  hud,
}: {
  onCreate: () => void;
  hud: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onCreate}
      className={cn(
        "group/new flex min-h-[12rem] flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-border/80 text-muted-foreground transition-all duration-300 ease-out",
        "hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/5 hover:text-primary",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
      )}
    >
      <span className="hud-clip-tr flex size-9 items-center justify-center bg-muted/70 transition-colors duration-300 group-hover/new:bg-primary/15">
        <Plus className="size-4" />
      </span>
      <span className="text-[0.72rem] font-medium">Nouveau projet</span>
      {hud ? <span className="text-hud text-muted-foreground/60">NEW.ENTRY</span> : null}
    </button>
  );
}

function ProjectCard({
  project,
  index,
  total,
  active,
  open,
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
  open: boolean;
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
        aria-label={`Ouvrir le projet ${project.name} dans un onglet`}
      >
        <span className="relative flex h-24 items-center justify-center border-b border-border/50 bg-muted/40 text-muted-foreground/80">
          <span className="size-12">
            <QrGlyph seed={project.id} size={48} />
          </span>
          <span
            aria-hidden="true"
            className="text-hud absolute top-1.5 left-2 text-muted-foreground/50"
          >
            {String(index + 1).padStart(2, "0")}/{String(total).padStart(2, "0")}
          </span>
          {active || open ? (
            <span
              className={cn(
                "hud-clip-tr text-hud absolute top-0 right-0 px-1.5 py-1",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {active ? "EN COURS" : "OUVERT"}
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

function EmptyState({
  query,
  count,
  onCreate,
  onReset,
}: {
  query: string;
  count: number;
  onCreate: () => void;
  onReset: () => void;
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
            : `Aucun résultat pour « ${query} ». Essayez un autre nom, un autre type, ou réinitialisez les filtres.`}
        </p>
      </div>
      {empty ? (
        <Button type="button" className="gap-1.5" onClick={onCreate}>
          <Plus />
          Nouveau projet
        </Button>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={onReset}>
          Réinitialiser les filtres
        </Button>
      )}
    </div>
  );
}
