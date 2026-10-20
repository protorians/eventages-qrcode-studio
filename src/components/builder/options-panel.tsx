import type { LucideIcon } from "lucide-react";
import { Crop, Download, Frame, Image as ImageIcon, Shapes, Type } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HudCorners, HudLabel } from "@/components/builder/hud";
import { ModuleContent } from "@/components/builder/module-content";
import { ModuleCorners } from "@/components/builder/module-corners";
import { ModuleExport } from "@/components/builder/module-export";
import { ModuleFrame } from "@/components/builder/module-frame";
import { ModuleLogo } from "@/components/builder/module-logo";
import { ModuleStyle } from "@/components/builder/module-style";
import { TipsCard } from "@/components/builder/tips-card";
import { BUILDER_MODULES, modulesForType, useBuilder, type BuilderModule } from "@/lib/builder-store";
import { cn } from "@/lib/utils";

const MODULE_ICONS: Record<BuilderModule, LucideIcon> = {
  content: Type,
  style: Shapes,
  corners: Crop,
  logo: ImageIcon,
  frame: Frame,
  export: Download,
};

const MODULE_TITLES: Record<BuilderModule, { title: string; detail: string }> = {
  content: { title: "Contenu", detail: "Type de QR et données encodées" },
  style: { title: "Style du code", detail: "Modules, couleurs et robustesse" },
  corners: { title: "Coins", detail: "Marqueurs de position" },
  logo: { title: "Logo", detail: "Image centrale et protection" },
  frame: { title: "Cadre", detail: "Habillage et libellé" },
  export: { title: "Export", detail: "Formats et téléchargement local" },
};

const RENDERERS: Record<BuilderModule, () => React.JSX.Element> = {
  content: ModuleContent,
  style: ModuleStyle,
  corners: ModuleCorners,
  logo: ModuleLogo,
  frame: ModuleFrame,
  export: ModuleExport,
};

/**
 * Panneau des fonctionnalités et options de création (colonne de droite).
 * `showRail` affiche la navigation verticale par module (feuille mobile).
 */
export function OptionsPanel({
  showRail = false,
  className,
}: {
  showRail?: boolean;
  className?: string;
}) {
  const { state, dispatch, type } = useBuilder();
  const modules = modulesForType(state.typeId);
  const active = modules.some((module) => module.id === state.activeModule)
    ? state.activeModule
    : "content";
  const Module = RENDERERS[active];
  const meta = MODULE_TITLES[active];
  const moduleCode = `0${BUILDER_MODULES.findIndex((m) => m.id === active) + 1}`;

  return (
    <aside
      className={cn(
        "flex min-h-0 flex-col border-l border-border/60 bg-sidebar/60 backdrop-blur",
        className,
      )}
      aria-label="Options de création"
    >
      <header className="relative space-y-3 border-b border-border/60 px-3.5 py-3">
        <HudCorners
          inset="0.4rem"
          size="0.4rem"
          thickness={1}
          className="text-primary/50"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-linear-to-r from-primary/60 via-primary/15 to-transparent"
        />
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="hud-clip-tr flex size-7 shrink-0 items-center justify-center bg-primary/15 font-mono text-[0.58rem] text-primary"
          >
            {moduleCode}
          </span>
          <div className="min-w-0">
            <HudLabel className="block">MOD — {meta.title}</HudLabel>
            <h2 className="truncate text-[0.68rem] text-muted-foreground">{meta.detail}</h2>
          </div>
        </div>

        {showRail ? (
          <Tabs
            value={active}
            onValueChange={(value) => dispatch({ type: "setModule", module: value as BuilderModule })}
            className="gap-0"
          >
            <TabsList className="no-scrollbar h-auto w-full justify-start gap-0.5 overflow-x-auto bg-muted/60 p-0.5">
              {modules.map((module) => {
                const Icon = MODULE_ICONS[module.id];
                return (
                  <TabsTrigger key={module.id} value={module.id} className="gap-1 px-2 py-1 text-[0.68rem]">
                    <Icon className="size-3.5" />
                    <span className="hidden sm:inline">{module.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        ) : null}
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <div key={active} className="animate-module-in space-y-4 p-3.5 pb-6">
          <Module />
          {/* Les conseils de scan QR ne s'appliquent pas au code-barres 1D. */}
          {type.id !== "barcode" ? <TipsCard /> : null}
        </div>
      </ScrollArea>
    </aside>
  );
}
