import {getCurrentWindow} from "@tauri-apps/api/window";
import type {LucideIcon} from "lucide-react";
import {House, Loader2, Minus, Moon, Plus, ScanLine, Settings2, Square, SquareDashedBottom, Sun, X} from "lucide-react";
import type {ReactNode} from "react";
import {Button} from "@/components/ui/button";
import {Separator} from "@/components/ui/separator";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {HudStatusDot} from "@/components/shell/hud";
import {ProjectActions} from "@/components/builder/project-actions";
import {getQrType} from "@/lib/qr-catalog";
import {useBuilder} from "@/lib/builder-store";
import {HOME_TAB_ID, IMPORT_TAB_ID, useWorkspace} from "@/lib/workspace-store";
import {isTauriRuntime, detectOS} from "@/lib/tauri";
import {useWindowState} from "@/hooks/use-window-state";
import {useSettings} from "@/hooks/use-settings";
import {cn} from "@/lib/utils";

/**
 * Barre de titre façon Figma : marque, ruban d'onglets (l'accueil plus un
 * onglet par projet ouvert), actions globales (thème, paramètres), actions
 * d'enregistrement et d'export du projet actif et contrôles de fenêtre. La
 * barre est une zone de déplacement native (`data-tauri-drag-region`) ; seuls
 * les éléments interactifs en sortent. Hors shell Tauri (dev navigateur), les
 * contrôles de fenêtre disparaissent et la barre devient un simple bandeau.
 */
export function TitleBar(
    {
        theme,
        onToggleTheme,
        onOpenSettings,
        onExport,
    }: {
        theme: "light" | "dark";
        onToggleTheme: () => void;
        onOpenSettings: () => void;
        onExport: () => void;
    }) {
    const {projects} = useBuilder();
    const {activeTabId, openProjectIds, importTask, openHome, openProjectTab, closeProjectTab, createProjectTab} =
        useWorkspace();
    const {hud} = useSettings();
    const tauri = isTauriRuntime();
    const isMac = detectOS() === "macos";
    const {fullscreen, maximized} = useWindowState();
    const isHome = activeTabId === HOME_TAB_ID;
    const isImportTab = activeTabId === IMPORT_TAB_ID;

    return (
        <header
            data-slot="title-bar"
            data-tauri-drag-region={tauri ? "" : undefined}
            className={cn(
                "relative z-30 flex h-11 shrink-0 items-stretch gap-1 border-b-0! border-border/60 bg-background/80 select-none backdrop-blur-xl",
                // macOS : les traffic lights natifs (`titleBarStyle: Overlay`, conf
                // tauri.macos.conf.json) se superposent en haut à gauche — on réserve
                // leur zone (~70px) et on laisse le système gérer leurs états.
                isMac && tauri ? "pl-[80px]" : "pl-2",
                (isMac && fullscreen) ? 'pl-0!' : ''
            )}
        >
            {/* Ligne d'énergie sous la barre, en écho du bandeau d'atelier. */}
            {hud && (
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-linear-to-r from-primary/70 via-primary/20 to-transparent"
                />
            )}

            {/* Marque — zone de déplacement. */}
            <div data-tauri-drag-region className="flex items-center gap-2.5 pr-1">
                {/*<span className="hud-clip-tr relative flex size-7 shrink-0 items-center justify-center bg-linear-to-br from-primary to-primary/55 text-primary-foreground">*/}
                {/*  <QrCode className="size-3.5" />*/}
                {/*  <span className="animate-glow absolute inset-0 -z-10 bg-primary/50 blur-md" />*/}
                {/*</span>*/}
                <div className="w-8 h-8">
                    <img
                        src={`./assets/images/${theme === 'light' ? 'app-icon' : 'app-icon-white'}.png`}
                        alt="Eventages Lite"
                    />
                </div>
                <p className="hud-heading hidden truncate text-[0.78rem] leading-tight font-bold sm:block">
                    Eventages Lite
                </p>
                <HudStatusDot tone="ok" className="hidden sm:flex"/>
                {hud ? (
                    <span aria-hidden="true" className="text-hud hidden text-muted-foreground/60 lg:block">
                    SYS:LOCAL
                  </span>
                ) : null}
            </div>

            <Separator orientation="vertical" className="my-2.5"/>

            {/* Ruban d'onglets : accueil + bouton « nouveau projet » (épinglés,
                hors défilement), puis un onglet par projet ouvert qui défile. */}
            <div
                role="tablist"
                aria-label="Onglets de l'espace de travail"
                className="flex min-w-0 flex-1 items-center gap-0.5"
            >
                {/* Zone épinglée : jamais recouverte par le défilement des onglets. */}
                <div className="flex h-full shrink-0 items-center gap-1 pl-1">
                    <HomeTab
                        selected={activeTabId === HOME_TAB_ID}
                        onSelect={openHome}
                    />
                    <Tooltip>
                        <TooltipTrigger
                            render={
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={createProjectTab}
                                    aria-label="Nouveau projet"
                                    className="rounded-sm text-muted-foreground"
                                />
                            }
                        >
                            <Plus className="size-4"/>
                        </TooltipTrigger>
                        <TooltipContent>Nouveau projet</TooltipContent>
                    </Tooltip>
                </div>

                {/* Zone défilante : un onglet par projet ouvert. */}
                <div className="flex h-full min-w-0 flex-1 items-center overflow-x-auto no-scrollbar">
                    <div data-tauri-drag-region
                         className="flex h-full w-max min-w-full items-center gap-1 px-1">
                        {openProjectIds.map((projectId) => {
                            if (projectId === IMPORT_TAB_ID) {
                                return (
                                    <ImportTab
                                        key={projectId}
                                        name={importTask?.fileName ?? "Import…"}
                                        running={importTask?.status !== "error"}
                                        selected={activeTabId === IMPORT_TAB_ID}
                                        onSelect={() => openProjectTab(IMPORT_TAB_ID)}
                                        onClose={() => closeProjectTab(IMPORT_TAB_ID)}
                                    />
                                );
                            }
                            const project = projects.find((item) => item.id === projectId);
                            if (!project) return null;
                            return (
                                <ProjectTab
                                    key={projectId}
                                    name={project.name}
                                    typeId={project.typeId}
                                    selected={activeTabId === projectId}
                                    onSelect={() => openProjectTab(projectId)}
                                    onClose={() => closeProjectTab(projectId)}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Actions globales puis contrôles de fenêtre (shell natif uniquement). */}
            <div className="flex items-center gap-0.5 px-2">
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
                      theme !== "dark" ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100",
                  )}
              />
              <Moon
                  className={cn(
                      "absolute inset-0 transition-all duration-500",
                      theme !== "dark" ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0",
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
                        <Settings2/>
                    </TooltipTrigger>
                    <TooltipContent>Paramètres, thèmes et HUD</TooltipContent>
                </Tooltip>

                {/* Enregistrement et export : agissent sur le brouillon de
                    l'onglet actif uniquement (masqués sur l'accueil et
                    pendant un import). */}
                {!isHome && !isImportTab ? <ProjectActions onExport={onExport}/> : null}
            </div>

            <Separator orientation="vertical" className="my-2.5"/>

            {!isMac ? <WindowControls fullscreen={fullscreen} maximized={maximized}/> : null}
        </header>
    );
}

/** Onglet Accueil : permanent, jamais fermable. */
function HomeTab({selected, onSelect}: { selected: boolean; onSelect: () => void }) {
    return (
        <button
            type="button"
            role="tab"
            aria-selected={selected}
            data-slot="workspace-tab"
            data-active={selected}
            onClick={onSelect}
            className={cn(
                "flex h-7 shrink-0 items-center gap-1.5 rounded-sm border px-2.5 text-[0.68rem] font-medium transition-colors duration-200",
                "focus-visible:outline-none",
                selected
                    ? "border-border/60 bg-accent/70 text-foreground"
                    : "border-transparent text-muted-foreground hover:bg-accent/40 hover:text-foreground",
            )}
        >
            <House className="size-3.5 shrink-0 opacity-70"/>
            <span className="sr-only">Accueil</span>
        </button>
    );
}

/** Onglet d'import : transitoire, le temps d'une conversion image → projet. */
function ImportTab({
                       name,
                       running,
                       selected,
                       onSelect,
                       onClose,
                   }: {
    name: string;
    running: boolean;
    selected: boolean;
    onSelect: () => void;
    onClose: () => void;
}) {
    return (
        <div
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            title={`Import en cours : ${name}`}
            data-slot="workspace-tab"
            data-active={selected}
            onClick={onSelect}
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect();
                }
            }}
            onAuxClick={(event) => {
                if (event.button === 1) onClose();
            }}
            className={cn(
                "group/tab flex h-7 shrink-0 cursor-default items-center gap-1.5 rounded-sm border px-2.5 text-[0.68rem] font-medium transition-colors duration-200",
                "focus-visible:outline-none pr-1!",
                selected
                    ? "border-border/60 bg-accent/70 text-foreground"
                    : "border-transparent text-muted-foreground hover:bg-accent/40 hover:text-foreground",
            )}
        >
            {running ? (
                <Loader2 className="size-3.5 shrink-0 animate-spin opacity-70"/>
            ) : (
                <ScanLine className="size-3.5 shrink-0 opacity-70"/>
            )}
            <span className="max-w-28 truncate sm:max-w-40">{name}</span>
            <button
                type="button"
                onClick={(event) => {
                    event.stopPropagation();
                    onClose();
                }}
                aria-label={`Annuler l'import de ${name}`}
                className="flex size-4 shrink-0 items-center justify-center rounded-[2px] text-muted-foreground/70 transition-colors duration-150 hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none md:opacity-50 md:group-hover/tab:opacity-100 md:focus-visible:opacity-100"
            >
                <X className="size-3"/>
            </button>
        </div>
    );
}

/** Onglet de projet : clic pour activer, croix pour fermer, clic milieu aussi. */
function ProjectTab({
                        name,
                        typeId,
                        selected,
                        onSelect,
                        onClose,
                    }: {
    name: string;
    typeId: string;
    selected: boolean;
    onSelect: () => void;
    onClose: () => void;
}) {
    const type = getQrType(typeId);
    return (
        <div
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            title={name}
            data-slot="workspace-tab"
            data-active={selected}
            onClick={onSelect}
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect();
                }
            }}
            onAuxClick={(event) => {
                if (event.button === 1) onClose();
            }}
            className={cn(
                "group/tab flex h-7 shrink-0 cursor-default items-center gap-1.5 rounded-sm border px-2.5 text-[0.68rem] font-medium transition-colors duration-200",
                "focus-visible:outline-none pr-1! ",
                selected
                    ? "border-border/60 bg-accent/70 text-foreground"
                    : "border-transparent text-muted-foreground hover:bg-accent/40 hover:text-foreground",
            )}
        >
            <type.icon className="size-3.5 shrink-0 opacity-70"/>
            <span className="max-w-28 truncate sm:max-w-40">{name}</span>
            <button
                type="button"
                onClick={(event) => {
                    event.stopPropagation();
                    onClose();
                }}
                aria-label={`Fermer l'onglet ${name}`}
                className="flex size-4 shrink-0 items-center justify-center rounded-[2px] text-muted-foreground/70 transition-colors duration-150 hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none md:opacity-50 md:group-hover/tab:opacity-100 md:focus-visible:opacity-100"
            >
                <X className="size-3"/>
            </button>
        </div>
    );
}

/**
 * Contrôles de fenêtre Windows/Linux : réplication fidèle des captions
 * natives (comme Figma/Firefox le font en frameless). Les métriques suivent
 * l'Aero standard (boutons ~46px, glyphes fins, rouge système au survol de
 * la croix sous Windows, `destructive` du thème sous Linux) et l'icône de
 * maximisation reflète l'état réel de la fenêtre.
 */
function WindowControls({
                            fullscreen,
                            maximized,
                        }: {
    fullscreen: boolean;
    maximized: boolean;
}) {
    const os = detectOS();
    if (!isTauriRuntime() || fullscreen || os === "web") return null;
    const appWindow = getCurrentWindow();
    const isWindows = os === "windows";
    const restHover = isWindows ? "hover:bg-foreground/[0.06]" : "hover:bg-accent/70";
    return (
        <div className="flex items-stretch self-stretch rounded-tl-sm">
            <ControlButton
                label="Réduire la fenêtre"
                glyph={<Glyph glyph={Minus}/>}
                onClick={() => void appWindow.minimize()}
                hoverClass={restHover}
            />
            <ControlButton
                label={maximized ? "Restaurer la fenêtre" : "Agrandir la fenêtre"}
                glyph={<Glyph glyph={maximized ? SquareDashedBottom : Square}/>}
                onClick={() => void appWindow.toggleMaximize()}
                hoverClass={restHover}
            />
            <ControlButton
                label="Fermer la fenêtre"
                glyph={<Glyph glyph={X}/>}
                onClick={() => void appWindow.close()}
                hoverClass={
                    isWindows
                        ? "hover:bg-[#c42b1c] hover:text-white"
                        : "hover:bg-destructive hover:text-destructive-foreground"
                }
            />
        </div>
    );
}

/** Glyphe Aero : 10px nominal, trait fin (1.5) comme les captionswin32. */
function Glyph({glyph: Icon}: { glyph: LucideIcon }) {
    return <Icon className="size-3" strokeWidth={1.5}/>;
}

function ControlButton({
                           label,
                           glyph,
                           hoverClass,
                           onClick,
                       }: {
    label: string;
    glyph: ReactNode;
    hoverClass: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            title={label}
            className={cn(
                "flex w-11 items-center justify-center text-muted-foreground transition-colors duration-75",
                "focus-visible:outline-none",
                hoverClass,
            )}
        >
            {glyph}
        </button>
    );
}
