import {Check, Download, Loader2, Save, TriangleAlert} from "lucide-react";
import {Button} from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {useProjectSave} from "@/hooks/use-project-save";
import {useT} from "@/lib/i18n";
import {cn} from "@/lib/utils";

/**
 * Actions d'enregistrement (⌘S) et d'export du brouillon affiché, hébergées
 * dans la barre de titre. La logique de sauvegarde vit dans useProjectSave
 * (partagée avec le menu Fichier) ; ce composant en détient les raccourcis
 * clavier et l'afficheur d'état (busy, confirmation, erreur).
 */
export function ProjectActions({onExport}: {onExport: () => void}) {
    const {dirty, busy, flash, error, runSave} = useProjectSave({shortcuts: true});
    const t = useT();

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
                            aria-label={t("actions.enregistrerAria")}
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
                            ? t("actions.enregistrerTooltip")
                            : t("actions.projetEnregistreTooltip")}
                </TooltipContent>
            </Tooltip>

            <Button
                type="button"
                size="sm"
                className="glow-primary gap-1.5 "
                onClick={onExport}
            >
                <Download/>
                <span className="hidden sm:inline">{t("actions.exporter")}</span>
            </Button>
        </>
    );
}
