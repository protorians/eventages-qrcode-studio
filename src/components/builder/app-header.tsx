import {Library, SlidersHorizontal} from "lucide-react";
import {Button} from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {useSettings} from "@/hooks/use-settings";

/**
 * Barre d'outils de l'atelier, affichée sous la barre de titre sur un onglet
 * projet : télémétrie du brouillon actif, bibliothèque (mobile) et modules
 * (mobile). L'enregistrement (⌘S), l'export et les actions globales (thème,
 * paramètres) vivent désormais dans la barre de titre.
 */
export function AppHeader(
    {
        onOpenLibrary,
        onOpenModules,
        showLibraryButton,
    }: {
        onOpenLibrary: () => void;
        onOpenModules: () => void;
        showLibraryButton: boolean;
    }) {
    const {hud} = useSettings();

    return (
        <header
            className="relative z-20 flex shrink-0 items-center gap-2 border-b border-border/60 bg-background/75 px-2.5 py-2 backdrop-blur-xl sm:px-3.5 md:hidden">
            {/* Ligne d'énergie sous le bandeau + doublé technique. */}
            {hud && (
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-linear-to-r from-primary/70 via-primary/20 to-transparent"
                />
            )}
            <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 -bottom-[4px] h-px bg-primary/15"
            />

            {/*<div className="flex min-w-0 items-center gap-1.5">*/}
            {/*    <HudReadout label="MOD" value={type.label} className="min-w-0"/>*/}
            {/*</div>*/}

            {/*<div className="mx-1 hidden h-6 items-center gap-1.5 md:flex">*/}
            {/*    <Separator orientation="vertical" className="mr-2 h-5"/>*/}
            {/*    <HudReadout label="PRG" value={`${progress}%`} className="hidden lg:inline-flex"/>*/}
            {/*    <span*/}
            {/*        aria-hidden="true"*/}
            {/*        className="hidden h-1 w-14 overflow-hidden bg-muted lg:block"*/}
            {/*    >*/}
            {/*        <span*/}
            {/*          className="progress-ticks block h-full bg-primary transition-[width] duration-500 ease-out"*/}
            {/*          style={{width: `${progress}%`}}*/}
            {/*      />*/}
            {/*    </span>*/}
            {/*</div>*/}

            <div className="ml-auto flex items-center gap-1">
                {showLibraryButton ? (
                    <Tooltip>
                        <TooltipTrigger
                            render={
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="hidden gap-1.5 rounded-sm md:inline-flex"
                                    onClick={onOpenLibrary}
                                />
                            }
                        >
                            <Library/>
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
                                onClick={onOpenModules}
                                aria-label="Options de création"
                                className="rounded-sm text-muted-foreground md:hidden"
                            />
                        }
                    >
                        <SlidersHorizontal/>
                    </TooltipTrigger>
                    <TooltipContent>Options de création</TooltipContent>
                </Tooltip>
            </div>
        </header>
    );
}
