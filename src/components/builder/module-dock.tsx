import type { LucideIcon } from "lucide-react";
import { Crop, Download, Frame, Image as ImageIcon, Shapes, Type } from "lucide-react";
import { HudCorners } from "@/components/builder/hud";
import { BUILDER_MODULES, type BuilderModule } from "@/lib/builder-store";
import { cn } from "@/lib/utils";

const MODULE_ICONS: Record<BuilderModule, LucideIcon> = {
  content: Type,
  style: Shapes,
  corners: Crop,
  logo: ImageIcon,
  frame: Frame,
  export: Download,
};

/** Dock flottant de sélection de module (piloté par `activeModule`). */
export function ModuleDock({
  activeModule,
  onSelect,
  className,
}: {
  activeModule: BuilderModule;
  onSelect: (module: BuilderModule) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label="Modules de création"
      className={cn(
        "no-scrollbar relative flex max-w-[calc(100vw-1.5rem)] items-stretch gap-1 overflow-x-auto rounded-sm border border-border/70 bg-popover/90 p-1.5 shadow-xl shadow-black/25 backdrop-blur-md",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-2 top-0 h-px bg-linear-to-r from-transparent via-primary/60 to-transparent"
      />
      {BUILDER_MODULES.map((module) => {
        const Icon = MODULE_ICONS[module.id];
        const active = module.id === activeModule;
        return (
          <button
            key={module.id}
            type="button"
            role="tab"
            aria-selected={active}
            data-active={active}
            onClick={() => onSelect(module.id)}
            className={cn(
              "group/dock relative flex min-w-14 shrink-0 flex-col items-center gap-1 rounded-sm px-2.5 py-1.5 text-[0.62rem] font-medium text-muted-foreground transition-all duration-300 ease-out",
              "hover:bg-accent/70 hover:text-foreground",
              "data-[active=true]:bg-primary/12 data-[active=true]:text-foreground",
            )}
          >
            <Icon
              className={cn(
                "size-4 transition-transform duration-300 ease-out",
                active ? "text-primary" : "group-hover/dock:scale-110",
              )}
            />
            <span className="leading-none">{module.label}</span>
            {active ? (
              <span className="pointer-events-none absolute inset-0.5">
                <HudCorners inset="0" size="0.35rem" thickness={1} />
              </span>
            ) : null}
            <span
              className={cn(
                "absolute -bottom-0.5 h-0.5 bg-primary transition-all duration-300 ease-out",
                active ? "w-5 opacity-100" : "w-0 opacity-0",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
