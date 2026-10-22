import { useMemo, useState } from "react";
import {
  Check,
  ClipboardCopy,
  Download,
  FileArchive,
  FileCode2,
  HardDriveDownload,
  Loader2,
  Printer,
  Share,
  Share2,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ControlStack,
  InfoTip,
  SectionTitle,
} from "@/components/ui/controls";
import { EXPORT_FORMATS, EXPORT_SIZES, type ExportFormat } from "@/lib/qr-design";
import { exportQr } from "@/lib/qr-export";
import { isShareSupported, ShareError, shareQrImage } from "@/lib/qr-share";
import { useBuilder } from "@/lib/builder-store";
import { payloadSize } from "@/lib/qr-payload";
import { scanLabel } from "@/lib/qr-analysis";
import { describeError } from "@/lib/qcp";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Onglet « Export » : formats, résolution et téléchargement local (spec 005). */
export function ModuleExport() {
  const { state, dispatch, type, values, debouncedPayload, missingField, progress, saveProjectAsQcp } =
    useBuilder();
  const t = useT();
  const [busy, setBusy] = useState<ExportFormat | "clipboard" | "share" | "qcp" | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Feuille de partage disponible ? (Tauri natif, ou Web Share côté navigateur.)
  const shareSupported = useMemo(() => isShareSupported(), []);

  // Rendu 1D : symbologie + habillage du code-barres, transmis au pipeline
  // d'export (le rendu QR reste inchangé).
  const barcode = useMemo(
    () =>
      type.id === "barcode"
        ? { symbology: values.symbology || "CODE128", design: state.barcode }
        : undefined,
    [type.id, values.symbology, state.barcode],
  );

  const run = async (format: ExportFormat) => {
    if (type.comingSoon) {
      setError(t("exportUi.error.typeComingSoon"));
      return;
    }
    if (missingField) {
      setError(t("exportUi.error.missingField", { field: t(missingField.label) }));
      return;
    }
    setBusy(format);
    setError(null);
    setDone(null);
    try {
      const filename = await exportQr({
        design: state.design,
        payload: debouncedPayload,
        qrSize: state.saveSize,
        format,
        fileName: state.projectName,
        barcode,
      });
      // Dialogue natif annulé sous Tauri : rien à annoncer.
      if (filename) setDone(filename);
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message
          ? cause.message
          : t("exportUi.error.downloadFailed"),
      );
    } finally {
      setBusy(null);
    }
  };

  const copyPayload = async () => {
    setBusy("clipboard");
    setError(null);
    try {
      await navigator.clipboard.writeText(debouncedPayload);
      setDone(t("exportUi.done.clipboardCopied"));
    } catch {
      setError(t("exportUi.error.clipboardDenied"));
    } finally {
      setBusy(null);
    }
  };

  /** Partage natif : menu de partage de l'OS sur l'image rendue, sans serveur. */
  const shareNative = async () => {
    if (type.comingSoon) {
      setError(t("exportUi.error.typeComingSoon"));
      return;
    }
    if (missingField) {
      setError(t("exportUi.error.missingField", { field: t(missingField.label) }));
      return;
    }
    setBusy("share");
    setError(null);
    setDone(null);
    try {
      const outcome = await shareQrImage({
        design: state.design,
        payload: debouncedPayload,
        qrSize: state.saveSize,
        fileName: state.projectName,
        barcode,
      });
      if (outcome.kind === "shared") setDone(outcome.message);
    } catch (shareError) {
      setError(
        shareError instanceof ShareError
          ? shareError.message
          : t("exportUi.error.shareFailed"),
      );
    } finally {
      setBusy(null);
    }
  };

  /** Export du projet complet (contenu, design, médias) en archive .qrd. */
  const exportProjectQcp = async () => {
    setBusy("qcp");
    setError(null);
    setDone(null);
    try {
      const path = await saveProjectAsQcp();
      if (path) setDone(t("exportUi.done.projectExported", { path }));
    } catch (cause) {
      setError(describeError(cause, t("exportUi.error.projectSaveFailed")));
    } finally {
      setBusy(null);
    }
  };

  const quality = scanLabel(state.design, debouncedPayload);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge
          variant={quality.level === "ok" ? "secondary" : "destructive"}
          className="text-[0.62rem]"
        >
          {quality.level === "ok" ? <Check /> : <FileCode2 />}
          {quality.label}
        </Badge>
        <Badge variant="outline" className="font-mono text-[0.62rem]">
          {payloadSize(debouncedPayload)} {t("exportUi.sizeUnit")}
        </Badge>
        <Badge variant="outline" className="text-[0.62rem]">
          {t(type.label)}
        </Badge>
      </div>

      <ControlStack
        label={t("exportUi.format.label")}
        hint={t("exportUi.format.description")}
      >
        <div className="grid grid-cols-2 gap-2">
          {EXPORT_FORMATS.map((format) => (
            <button
              key={format.id}
              type="button"
              data-slot="export-format-tile"
              disabled={busy !== null}
              onClick={() => run(format.id)}
              className={cn(
                "group/tile flex flex-col items-start gap-2 rounded-xl border border-border/70 bg-card/50 p-2.5 text-start transition-all duration-300 ease-out",
                "hover:-translate-y-0.5 hover:border-border hover:bg-accent/60 hover:shadow-sm",
                "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
                "disabled:pointer-events-none disabled:opacity-60",
              )}
            >
              <span className="flex w-full items-center justify-between">
                <span
                  data-slot="export-format-icon"
                  className="flex size-8 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground transition-transform duration-300 group-hover/tile:scale-110"
                >
                  {format.id === "svg" ? (
                    <FileCode2 className="size-4" />
                  ) : (
                    <Download className="size-4" />
                  )}
                </span>
                {busy === format.id ? (
                  <Loader2 className="size-3.5 animate-spin text-primary" />
                ) : null}
              </span>
              <span className="space-y-0.5">
                <span data-slot="export-format-label" className="block text-[0.72rem] font-medium">
                  {format.label}
                </span>
                <span
                  data-slot="export-format-detail"
                  className="block text-[0.62rem] text-muted-foreground"
                >
                  {t(format.detail)}
                </span>
              </span>
            </button>
          ))}
        </div>
      </ControlStack>

      <Separator />

      <ControlStack
        label={t("exportUi.resolution.label")}
        hint={t("exportUi.resolution.description")}
      >
        <Select
          items={EXPORT_SIZES.map((size) => ({
            value: String(size),
            label: `${size} × ${size} px`,
          }))}
          value={String(state.saveSize)}
          onValueChange={(next) => dispatch({ type: "setSaveSize", size: Number(next) })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EXPORT_SIZES.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size} × {size} px
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </ControlStack>

      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="export-name" className="text-[0.8rem]">
            {t("exportUi.file.label")}
          </Label>
          <InfoTip>{t("exportUi.file.hint")}</InfoTip>
        </div>
        <Input
          id="export-name"
          value={state.projectName}
          onChange={(event) => dispatch({ type: "setProjectName", name: event.currentTarget.value })}
          className="font-mono text-[0.75rem]"
        />
      </div>

      <div className="space-y-2">
        <SectionTitle hint={t("exportUi.quick.description")}>
          {t("exportUi.quick.title")}
        </SectionTitle>
        <Button
          type="button"
          className="w-full"
          disabled={busy !== null}
          onClick={() => run("png")}
        >
          {busy === "png" ? <Loader2 className="animate-spin" /> : <HardDriveDownload />}
          {t("exportUi.action.downloadPng")}
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={busy !== null}
            onClick={() => run("svg")}
          >
            {busy === "svg" ? <Loader2 className="animate-spin" /> : <Printer />}
            {t("exportUi.action.svg")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy !== null}
            onClick={() => run("jpeg")}
          >
            {busy === "jpeg" ? <Loader2 className="animate-spin" /> : <Share />}
            {t("exportUi.action.jpeg")}
          </Button>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={busy !== null}
          onClick={exportProjectQcp}
        >
          {busy === "qcp" ? <Loader2 className="animate-spin" /> : <FileArchive />}
          {t("exportUi.action.project")}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={busy !== null || !shareSupported}
          onClick={shareNative}
        >
          {busy === "share" ? <Loader2 className="animate-spin" /> : <Share2 />}
          {t("exportUi.action.share")}
        </Button>
        {!shareSupported ? (
          <p className="text-[0.62rem] leading-relaxed text-muted-foreground">
            {t("exportUi.shareUnsupported")}
          </p>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          disabled={busy !== null}
          onClick={copyPayload}
        >
          {busy === "clipboard" ? <Loader2 className="animate-spin" /> : <ClipboardCopy />}
          {t("exportUi.action.copyContent")}
        </Button>
      </div>

      {done ? (
        <Alert className="animate-fade-in">
          <Check />
          <AlertDescription className="font-mono text-[0.7rem] break-all">
            {done}
          </AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive" className="animate-fade-in">
          <FileCode2 />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
        <p className="text-[0.68rem] leading-relaxed text-muted-foreground">
          {progress === 100
            ? t("exportUi.status.contentComplete")
            : t("exportUi.status.contentIncomplete")}
        </p>
      </div>
    </div>
  );
}
