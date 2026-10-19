import { Download, FolderOpen, Library, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

/** Barre de navigation mobile (< 768 px) : accès aux panneaux en feuille. */
export function MobileNav({
  onOpenLibrary,
  onOpenModules,
  onOpenProjects,
  onExport,
}: {
  onOpenLibrary: () => void;
  onOpenModules: () => void;
  onOpenProjects: () => void;
  onExport: () => void;
}) {
  return (
    <nav className="relative z-20 grid shrink-0 grid-cols-4 gap-1 border-t border-border/60 bg-background/80 px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] backdrop-blur-xl md:hidden">
      <NavButton label="Bibliothèque" icon={<Library />} onClick={onOpenLibrary} />
      <NavButton label="Options" icon={<SlidersHorizontal />} onClick={onOpenModules} />
      <NavButton label="Projets" icon={<FolderOpen />} onClick={onOpenProjects} />
      <NavButton label="Exporter" icon={<Download />} onClick={onExport} primary />
    </nav>
  );
}

function NavButton({
  label,
  icon,
  onClick,
  primary,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[0.62rem] font-medium transition-all duration-300 ease-out active:scale-95",
        primary
          ? "bg-primary/12 text-primary"
          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
      )}
    >
      <span className="[&_svg]:size-4">{icon}</span>
      {label}
    </button>
  );
}
