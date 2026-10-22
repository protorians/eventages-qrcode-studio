import { FileScan, Loader2, RotateCcw, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { HudCorners, HudLabel, HudStatusDot } from "@/components/shell/hud";
import { useWorkspace } from "@/lib/workspace-store";
import { useT } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/dictionaries/en";
import type { ImportStage } from "@/lib/qr-import";
import { cn } from "@/lib/utils";

/** Étapes affichées de la conversion image → projet, dans l'ordre d'exécution. */
const IMPORT_STAGES: { id: ImportStage; label: TranslationKey }[] = [
  { id: "open", label: "importView.stage.open" },
  { id: "decode", label: "importView.stage.decode" },
  { id: "content", label: "importView.stage.content" },
  { id: "create", label: "importView.stage.create" },
];

/**
 * Onglet d'import transitoire : pendant qu'une image (QR ou code-barres) est
 * convertie en projet, cet onglet affiche un panneau façon modale avec la
 * progression du traitement — l'application reste entièrement réactive, le
 * décodage s'exécute hors du thread principal. À la fin, l'onglet devient
 * celui du projet créé ; en cas d'échec, il propose de réessayer.
 */
export function ImportView() {
  const { importTask, cancelImport, retryImport } = useWorkspace();
  const t = useT();

  // La tâche peut avoir disparu entre la bascule d'onglet et ce rendu.
  if (!importTask) return null;

  const running = importTask.status === "running";
  const failed = importTask.status === "error";
  const stageLabel =
    IMPORT_STAGES.find((stage) => stage.id === importTask.stage)?.label ??
    "importView.stage.open";

  return (
    <section
      aria-label={t("importView.conversionAria")}
      className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-8"
    >
      {/* Voile façon modale, contenu dans l'onglet : le reste de l'atelier
          reste visible et actif autour. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-background/70 backdrop-blur-[2px]"
      />

      <Card className="relative w-full max-w-md gap-4 py-5 shadow-lg">
        <HudCorners inset="0.35rem" size="0.6rem" />

        <CardHeader className="gap-2">
          <HudLabel>{t("importView.heading")}</HudLabel>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "hud-clip-tr flex size-10 shrink-0 items-center justify-center",
                importTask.status === "error"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-primary/10 text-primary",
              )}
            >
              {importTask.status === "error" ? (
                <TriangleAlert className="size-5" />
              ) : (
                <FileScan className="size-5" />
              )}
            </span>
            <div className="min-w-0 space-y-0.5">
              <h1 className="hud-heading truncate text-lg leading-tight font-bold uppercase">
                {running ? t("importView.conversionEnCours") : t("importView.conversionEchec")}
              </h1>
              <p
                className="truncate font-mono text-[0.68rem] text-muted-foreground"
                title={importTask.path}
              >
                {importTask.fileName}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {running ? (
            <div role="status" aria-live="polite" className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[0.72rem] text-muted-foreground">
                  {t("importView.traitementEnCours")}
                </span>
                <HudReadoutPercent percent={importTask.percent} />
              </div>
              <Progress value={importTask.percent} aria-label={t("importView.progressionAria")} />
            </div>
          ) : (
            <div className="space-y-1.5" role="alert">
              <p className="text-[0.72rem] leading-snug text-muted-foreground">
                {importTask.error ??
                  t("importView.erreurDefaut")}
              </p>
            </div>
          )}

          {/* Tâche en cours uniquement : le libellé de l'étape active, ou de
              celle qui a interrompu la conversion en cas d'échec. */}
          <div
            role="status"
            aria-live="polite"
            className={cn(
              "flex items-center gap-2 rounded-sm px-1.5 py-1 text-[0.72rem]",
              failed ? "bg-destructive/10 text-destructive" : "text-foreground",
            )}
          >
            {failed ? (
              <TriangleAlert className="size-3.5 shrink-0" />
            ) : (
              <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" />
            )}
            {t(stageLabel)}
          </div>
        </CardContent>

        <CardFooter className="justify-end gap-2">
          {running ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={cancelImport}
              className="gap-1.5"
            >
              <X />
              {t("importView.annuler")}
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={cancelImport}
              >
                {t("importView.fermer")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={retryImport}
                className="gap-1.5"
              >
                <RotateCcw />
                {t("importView.ressayer")}
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </section>
  );
}

/** Pourcentage en lecture HUD, avec voyant d'activité. */
function HudReadoutPercent({ percent }: { percent: number }) {
  return (
    <span className="flex shrink-0 items-center gap-2">
      <HudStatusDot />
      <span className="font-mono text-xs tabular-nums">{Math.round(percent)}%</span>
    </span>
  );
}
