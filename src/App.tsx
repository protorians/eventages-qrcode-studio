import { useEffect, useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { applyPlatformDomFlags } from "@/lib/tauri";
import type { BuilderModule } from "@/lib/builder-store";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AppHeader } from "@/components/shell/app-header";
import { LibraryPanel } from "@/components/builder/library-panel";
import { MobileNav } from "@/components/shell/mobile-nav";
import { ModuleDock } from "@/components/builder/module-dock";
import { OptionsPanel } from "@/components/builder/options-panel";
import { Stage } from "@/components/builder/stage";
import { HomeView } from "@/components/builder/views/home-view";
import { ImportView } from "@/components/builder/views/import-view";
import { TitleBar } from "@/components/shell/title-bar";
import { NativeMenu } from "@/components/shell/native-menu";
import { BuilderProvider, useBuilder, modulesForType } from "@/lib/builder-store";
import {
  HOME_TAB_ID,
  IMPORT_TAB_ID,
  WorkspaceProvider,
  useWorkspace,
} from "@/lib/workspace-store";
import { SettingsDialog } from "@/components/shell/settings-dialog";
import { useIsDesktop, useIsTablet } from "@/hooks/use-media-query";
import { SettingsProvider, useSettings } from "@/hooks/use-settings";

function WorkspaceShell() {
  const { mode, toggleMode, hud } = useSettings();
  const { state, dispatch } = useBuilder();
  const { activeTabId, openHome } = useWorkspace();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [modulesOpen, setModulesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Fermer les feuilles quand la place disponible permet le panneau fixe.
  useEffect(() => {
    if (isDesktop) setLibraryOpen(false);
  }, [isDesktop]);

  useEffect(() => {
    if (isTablet) setModulesOpen(false);
  }, [isTablet]);

  const openModule = (module: BuilderModule) => {
    dispatch({ type: "setModule", module });
    if (!isTablet) setModulesOpen(true);
  };

  const exportModule = () => openModule("export");

  const isHome = activeTabId === HOME_TAB_ID;
  const isImport = activeTabId === IMPORT_TAB_ID;

  // Adaptations de la coque native selon l'OS (flag data-os pour le CSS).
  useEffect(() => applyPlatformDomFlags(), []);

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <div className="aurora pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
      {hud ? (
        <div className="hud-overlay pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
      ) : null}

      <TitleBar
        theme={mode}
        onToggleTheme={toggleMode}
        onOpenSettings={() => setSettingsOpen(true)}
        onExport={exportModule}
      />

      {isHome ? (
        <HomeView />
      ) : isImport ? (
        <ImportView />
      ) : (
        <>
          <AppHeader
            showLibraryButton={!isDesktop}
            onOpenLibrary={() => setLibraryOpen(true)}
            onOpenModules={() => setModulesOpen(true)}
          />

          <main className="relative flex min-h-0 flex-1">
            <LibraryPanel className="hidden w-72 shrink-0 lg:flex xl:w-80" />

            <Stage
              dock={
                isTablet ? (
                  <ModuleDock
                    activeModule={state.activeModule}
                    modules={modulesForType(state.typeId)}
                    onSelect={(module) => dispatch({ type: "setModule", module })}
                  />
                ) : undefined
              }
            />

            <OptionsPanel className="hidden w-80 shrink-0 md:flex xl:w-[22rem]" />
          </main>

          <MobileNav
            onOpenLibrary={() => setLibraryOpen(true)}
            onOpenModules={() => setModulesOpen(true)}
            onOpenProjects={openHome}
            onOpenSettings={() => setSettingsOpen(true)}
            onExport={exportModule}
          />

          <Sheet open={libraryOpen} onOpenChange={setLibraryOpen}>
            <SheetContent
              side="left"
              className="w-full max-w-[min(22rem,92vw)] gap-0 border-r border-border/70 bg-sidebar/95 p-0 backdrop-blur-xl"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>Bibliothèque</SheetTitle>
                <SheetDescription>Types de QR, mises en situation et modèles.</SheetDescription>
              </SheetHeader>
              <LibraryPanel className="h-full border-r-0 bg-transparent" />
            </SheetContent>
          </Sheet>

          <Sheet open={modulesOpen} onOpenChange={setModulesOpen}>
            <SheetContent
              side="right"
              className="w-full max-w-[min(24rem,94vw)] gap-0 border-l border-border/70 bg-sidebar/95 p-0 backdrop-blur-xl md:hidden"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>Options de création</SheetTitle>
                <SheetDescription>Contenu, style, logo, cadre et export.</SheetDescription>
              </SheetHeader>
              <OptionsPanel className="h-full border-l-0 bg-transparent" showRail />
            </SheetContent>
          </Sheet>
        </>
      )}

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

      {/* Menubar native (barre système) : Fichier, Édition, Affichage, Fenêtre, Aide. */}
      <NativeMenu onExport={exportModule} />
    </div>
  );
}

function App() {
  return (
    <SettingsProvider>
      <TooltipProvider delay={200}>
        <BuilderProvider>
          <WorkspaceProvider>
            <WorkspaceShell />
          </WorkspaceProvider>
        </BuilderProvider>
      </TooltipProvider>
    </SettingsProvider>
  );
}

export default App;
