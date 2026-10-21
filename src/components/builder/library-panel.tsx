import { useMemo, useState } from "react";
import {
  Check,
  CloudOff,
  LayoutGrid,
  Library,
  Save,
  Search,
  Shapes,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { QrGlyph } from "@/components/builder/previews";
import { HudLabel, HudStatusDot } from "@/components/shell/hud";
import { useSettings } from "@/hooks/use-settings";import {
  QR_FAMILIES,
  QR_TYPES,
  formProgress,
  type QrFamily,
} from "@/lib/qr-catalog";
import { DESIGN_TEMPLATES, MOCKUPS } from "@/lib/qr-design";
import { useBuilder } from "@/lib/builder-store";
import { cn } from "@/lib/utils";

type LibraryTab = "types" | "mockups" | "templates";

/** Dernier segment d'un chemin de fichier, pour un affichage compact. */
function fileName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

/**
 * Panneau de gauche (colonne de référence) : projet courant, galerie de types,
 * mises en situation et modèles de design.
 */
export function LibraryPanel({ className }: { className?: string }) {
  const { state, dispatch, type, values, savedLabel, dirty } = useBuilder();
  const { hud, autoSaveFile } = useSettings();
  const [tab, setTab] = useState<LibraryTab>("types");
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState<QrFamily | null>(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const matched = QR_TYPES.filter((candidate) => {
      if (family && candidate.family !== family) return false;
      if (!term) return true;
      return (
        candidate.label.toLowerCase().includes(term) ||
        candidate.tagline.toLowerCase().includes(term)
      );
    });
    // Types actifs d'abord, désactivés (« bientôt ») regroupés à la fin.
    return matched.sort((a, b) => Number(Boolean(a.comingSoon)) - Number(Boolean(b.comingSoon)));
  }, [query, family]);

  const completion = formProgress(type, values);

  return (
    <aside
      className={cn(
        "flex min-h-0 flex-col border-r border-border/60 bg-sidebar/60 backdrop-blur",
        className,
      )}
      aria-label="Bibliothèque"
    >
      <header className="space-y-3 border-b border-border/60 p-3.5">
        <HudLabel className="block">BIBLIO — PROJET</HudLabel>
        <div className="flex items-start gap-2.5">
          <span className="hud-clip-tr relative flex size-9 shrink-0 items-center justify-center bg-linear-to-br from-primary/30 to-primary/5 text-primary ring-1 ring-primary/25">
            <Library className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <Input
              value={state.projectName}
              aria-label="Nom du projet"
              onChange={(event) =>
                dispatch({ type: "setProjectName", name: event.currentTarget.value })
              }
              className="h-7 border-transparent bg-transparent px-1.5 font-mono text-[0.8rem] font-medium focus-visible:border-input"
            />
            <p className="mt-0.5 flex items-center gap-1.5 px-1.5 text-[0.64rem] text-muted-foreground">
              <CloudOff className="size-3" />
              {savedLabel
                ? `Brouillon local · enregistré à ${savedLabel}`
                : "Enregistrement local en cours…"}
            </p>
            {state.filePath ? (
              <p className="mt-0.5 flex items-center gap-1.5 px-1.5 text-[0.64rem] text-muted-foreground">
                <Save className={cn("size-3 shrink-0", dirty && autoSaveFile ? "animate-pulse" : "")} />
                <span className="truncate">
                  {dirty
                    ? autoSaveFile
                      ? `Fichier .qcp : enregistrement auto… (${fileName(state.filePath)})`
                      : `Fichier .qcp : non enregistré (${fileName(state.filePath)})`
                    : autoSaveFile
                      ? `Fichier .qcp lié · auto-enregistré (${fileName(state.filePath)})`
                      : `Fichier .qcp lié (${fileName(state.filePath)})`}
                </span>
              </p>
            ) : (
              <p className="mt-0.5 flex items-center gap-1.5 px-1.5 text-[0.64rem] text-muted-foreground/70">
                <Save className="size-3 shrink-0 opacity-60" />
                <span className="truncate">Aucun fichier lié · « Enregistrer » lie un .qcp</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="rounded-none text-[0.6rem]">
            <Shapes className="size-3" />
            {type.label}
          </Badge>
          <span className="ml-auto font-mono text-[0.62rem] text-muted-foreground">
            {completion}%
          </span>
        </div>
        <div className="h-1 overflow-hidden bg-muted">
          <div
            className="progress-ticks h-full bg-primary transition-[width] duration-500 ease-out"
            style={{ width: `${completion}%` }}
          />
        </div>
      </header>

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as LibraryTab)}
        className="min-h-0 flex-1 gap-0 pt-3"
      >
        <div className="px-3.5">
          <TabsList className="h-8 w-full">
            <TabsTrigger value="types" className="gap-1 text-[0.7rem]">
              <LayoutGrid className="size-3.5" />
              Types
            </TabsTrigger>
            <TabsTrigger value="mockups" className="gap-1 text-[0.7rem]">
              <Sparkles className="size-3.5" />
              Mockups
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-1 text-[0.7rem]">
              <Wand2 className="size-3.5" />
              Modèles
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="types" className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 space-y-2 px-3.5 pt-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                placeholder="Rechercher un type de QR…"
                onChange={(event) => setQuery(event.currentTarget.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
            <div className="no-scrollbar -mx-0.5 flex gap-1 overflow-x-auto px-0.5 pb-1">
              <FilterChip active={family === null} onClick={() => setFamily(null)}>
                Tous
              </FilterChip>
              {QR_FAMILIES.map((item) => (
                <FilterChip
                  key={item.id}
                  active={family === item.id}
                  onClick={() => setFamily(item.id)}
                >
                  {item.label}
                </FilterChip>
              ))}
            </div>
          </div>

          <ScrollArea className="mt-2 min-h-0 flex-1">
            <ul data-slot="list" className="space-y-1 px-3.5 pb-6">
              {filtered.map((candidate, index) => {
                const active = candidate.id === state.typeId;
                return (
                  <li key={candidate.id} style={{ animationDelay: `${Math.min(index, 12) * 18}ms` }}>
                    <button
                      type="button"
                      disabled={candidate.comingSoon}
                      onClick={() => {
                        dispatch({ type: "setType", typeId: candidate.id });
                        dispatch({ type: "setModule", module: "content" });
                      }}
                      aria-current={active}
                      aria-disabled={candidate.comingSoon || undefined}
                      className={cn(
                        "animate-rise group/row flex w-full items-center gap-2.5 rounded-sm border border-transparent p-2 text-left transition-all duration-300 ease-out",
                        "hover:-translate-y-px hover:border-border/70 hover:bg-accent/50",
                        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
                        "disabled:pointer-events-none",
                        active
                          ? "border-primary/40 bg-primary/10 shadow-[inset_2px_0_0_0_color-mix(in_oklch,_var(--primary)_85%,_transparent)]"
                          : "bg-card/40",
                        candidate.comingSoon && "opacity-[0.43] grayscale",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className="w-4 shrink-0 text-right font-mono text-[0.56rem] text-muted-foreground/60"
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-sm transition-colors duration-300",
                          active
                            ? "bg-primary/15 text-primary"
                            : "bg-muted/60 text-muted-foreground group-hover/row:text-foreground",
                        )}
                      >
                        <candidate.icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.78rem] font-medium">
                          {candidate.label}
                        </span>
                        <span className="block truncate text-[0.64rem] text-muted-foreground">
                          {candidate.tagline}
                        </span>
                      </span>
                      {active ? (
                        <Check className="size-3.5 shrink-0 text-primary" />
                      ) : candidate.comingSoon ? (
                        <span className="shrink-0 font-mono text-[0.58rem] text-muted-foreground/70">
                          bientôt
                        </span>
                      ) : (
                        <span className="shrink-0 font-mono text-[0.58rem] text-muted-foreground/70">
                          {candidate.encoding === "direct" ? "direct" : "page"}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
              {filtered.length === 0 ? (
                <li className="px-2 py-8 text-center text-xs text-muted-foreground">
                  Aucun type ne correspond à cette recherche.
                </li>
              ) : null}
            </ul>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="mockups" className="flex min-h-0 flex-1 flex-col">
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-2 px-3.5 py-3">
              <p className="text-[0.68rem] leading-relaxed text-muted-foreground">
                Visualisez le rendu dans un contexte réel. Le décor est décoratif ; le code
                reste identique.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {MOCKUPS.map((mockup) => {
                  const active = mockup.id === state.mockupId;
                  return (
                    <button
                      key={mockup.id}
                      type="button"
                      onClick={() => dispatch({ type: "setMockup", mockupId: mockup.id })}
                      aria-pressed={active}
                      className={cn(
                        "group/mock animate-rise overflow-hidden rounded-sm border text-left transition-all duration-300 ease-out",
                        "hover:-translate-y-0.5 hover:shadow-md",
                        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
                        active
                          ? "border-primary/50 shadow-[inset_0_2px_0_0_color-mix(in_oklch,_var(--primary)_85%,_transparent)] ring-2 ring-primary/25"
                          : "border-border/70",
                      )}
                    >
                      <span
                        className="relative flex h-20 items-center justify-center"
                        style={{ background: mockup.surface }}
                      >
                        <span
                          className="size-9 opacity-90 transition-transform duration-500 group-hover/mock:scale-110"
                          style={{ color: mockup.accent }}
                        >
                          <QrGlyph seed={mockup.id} />
                        </span>
                      </span>
                      <span className="block space-y-0.5 bg-card/70 p-2">
                        <span className="block truncate text-[0.72rem] font-medium">
                          {mockup.name}
                        </span>
                        <span className="block truncate text-[0.6rem] text-muted-foreground">
                          {mockup.detail}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="templates" className="flex min-h-0 flex-1 flex-col">
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-2 px-3.5 py-3">
              <p className="text-[0.68rem] leading-relaxed text-muted-foreground">
                Appliquez un modèle complet (formes, couleurs, coins, cadre) puis ajustez-le
                librement.
              </p>
              {DESIGN_TEMPLATES.map((template) => {
                const active =
                  state.design.frameId === template.design.frameId &&
                  state.design.dotsType === template.design.dotsType;
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => {
                      dispatch({ type: "patchDesign", patch: template.design });
                      dispatch({ type: "setModule", module: "style" });
                    }}
                    className={cn(
                      "group/tpl animate-rise flex w-full items-center gap-3 rounded-sm border p-2.5 text-left transition-all duration-300 ease-out",
                      "hover:-translate-y-0.5 hover:border-border hover:shadow-md",
                      "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
                      active
                        ? "border-primary/50 bg-primary/8 shadow-[inset_2px_0_0_0_color-mix(in_oklch,_var(--primary)_85%,_transparent)]"
                        : "border-border/70 bg-card/40",
                    )}
                  >
                    <span
                      className="flex size-12 shrink-0 items-center justify-center rounded-sm ring-1 ring-inset ring-black/10"
                      style={{
                        background: `linear-gradient(135deg, ${template.preview[0]}, ${template.preview[1]})`,
                      }}
                    >
                      <span className="size-6 text-white/90 transition-transform duration-500 group-hover/tpl:scale-110">
                        <QrGlyph seed={template.id} />
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.78rem] font-medium">
                        {template.name}
                      </span>
                      <span className="block truncate text-[0.64rem] text-muted-foreground">
                        {template.hint}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <footer className="border-t border-border/60 p-3">
        <div className="flex items-center justify-between font-mono text-[0.62rem] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <HudStatusDot tone="ok" />
            {hud ? (
              <span className="text-hud">OFFLINE:OK</span>
            ) : (
              <span>Hors ligne</span>
            )}
          </span>
          <span>
            {QR_TYPES.filter((candidate) => !candidate.comingSoon).length} types actifs
          </span>
        </div>
      </footer>
    </aside>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 rounded-full border px-2.5 py-1 text-[0.65rem] font-medium whitespace-nowrap transition-all duration-200",
        active
          ? "border-primary/40 bg-primary/12 text-foreground"
          : "border-border text-muted-foreground hover:border-border hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}
