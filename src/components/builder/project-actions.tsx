import {useCallback, useEffect, useState} from "react";
import {Check, Download, Loader2, Save, TriangleAlert} from "lucide-react";
import {Button} from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {useBuilder} from "@/lib/builder-store";
import {describeError} from "@/lib/qcp";
import {cn} from "@/lib/utils";

/**
 * Actions d'enregistrement (⌘S) et d'export du brouillon affiché, hébergées
 * dans la barre de titre. Le store d'éditeur ne porte qu'un brouillon à la
 * fois (celui de l'onglet actif, hydraté à chaque changement d'onglet) :
 * ces actions n'impactent donc que l'onglet courant, jamais les autres.
 */
export function ProjectActions({onExport}: {onExport: () => void}) {
    const {dirty, saveProject, saveProjectAsQcp} = useBuilder();
    const [busy, setBusy] = useState(false);
    const [flash, setFlash] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /** Sauvegarde manuelle (fichier lié, sinon boîte de dialogue). */
    const runSave = useCallback(
        async (mode: "save" | "saveAs") => {
            if (busy) return;
            setBusy(true);
            setError(null);
            try {
                if (mode === "save") await saveProject();
                else await saveProjectAsQcp();
                setFlash(true);
                window.setTimeout(() => setFlash(false), 2000);
            } catch (cause) {
                setError(describeError(cause, "Enregistrement du projet impossible."));
                window.setTimeout(() => setError(null), 6000);
            } finally {
                setBusy(false);
            }
        },
        [busy, saveProject, saveProjectAsQcp],
    );

    // Raccourcis clavier : ⌘S enregistre, ⌘⇧S propose « Enregistrer sous… ».
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "s") return;
            event.preventDefault();
            event.stopPropagation();
            void runSave(event.shiftKey ? "saveAs" : "save");
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [runSave]);

    return (
        <>
            <Tooltip>
                <TooltipTrigger
                    render={
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => void runSave("save")}
                            disabled={busy}
                            aria-label="Enregistrer le projet courant"
                            className={cn(
                                "rounded-sm",
                                error ? "text-destructive" : dirty ? "text-foreground" : "text-muted-foreground",
                            )}
                        />
                    }
                >
                    {busy ? (
                        <Loader2 className="animate-spin"/>
                    ) : error ? (
                        <TriangleAlert/>
                    ) : flash ? (
                        <Check className="text-primary"/>
                    ) : (
                        <Save/>
                    )}
                </TooltipTrigger>
                <TooltipContent className="max-w-72">
                    {error
                        ? error
                        : dirty
                            ? "Enregistrer le projet · ⌘S"
                            : "Projet enregistré · ⌘S pour réenregistrer"}
                </TooltipContent>
            </Tooltip>

            <Button
                type="button"
                size="sm"
                className="glow-primary gap-1.5 "
                onClick={onExport}
            >
                <Download/>
                <span className="hidden sm:inline">Exporter</span>
            </Button>
        </>
    );
}
