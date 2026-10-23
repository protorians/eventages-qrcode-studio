import { useEffect, useState } from "react";
import {
  Check,
  Globe,
  Loader2,
  MonitorDown,
  Moon,
  Palette,
  RefreshCw,
  ScanLine,
  Settings2,
  ShieldCheck,
  Sun,
  Terminal,
  TriangleAlert,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { HudLabel, HudReadout, HudStatusDot } from "@/components/shell/hud";
import {
  COLOR_THEMES,
  useSettings,
  type ColorThemePalette,
} from "@/hooks/use-settings";
import { useUpdater } from "@/hooks/use-updater";
import { GITHUB_REPO } from "@/lib/updater";
import { useLocale, useT, type TranslationKey } from "@/lib/i18n";
import { LOCALES, type LocaleId } from "@/lib/i18n/locales";
import { useBuilder } from "@/lib/builder-store";
import { fetchCliStatus, installCli, uninstallCli, type CliStatus } from "@/lib/cli-desktop";
import { cn } from "@/lib/utils";

/** Sections de la fenêtre de paramètres (rail à gauche, contenu à droite). */
type SettingsSectionId =
  | "appearance"
  | "interface"
  | "language"
  | "project"
  | "data"
  | "cli"
  | "updates";

const SETTINGS_SECTIONS: {
  id: SettingsSectionId;
  labelKey: TranslationKey;
  detailKey: TranslationKey;
  code: string;
  icon: LucideIcon;
}[] = [
  {
    id: "appearance",
    labelKey: "settings.section.appearance.label",
    detailKey: "settings.section.appearance.detail",
    code: "MOD.01",
    icon: Palette,
  },
  {
    id: "interface",
    labelKey: "settings.section.interface.label",
    detailKey: "settings.section.interface.detail",
    code: "MOD.02",
    icon: ScanLine,
  },
  {
    id: "language",
    labelKey: "settings.section.language.label",
    detailKey: "settings.section.language.detail",
    code: "MOD.03",
    icon: Globe,
  },
  {
    id: "project",
    labelKey: "settings.section.project.label",
    detailKey: "settings.section.project.detail",
    code: "MOD.04",
    icon: RefreshCw,
  },
  {
    id: "data",
    labelKey: "settings.section.data.label",
    detailKey: "settings.section.data.detail",
    code: "MOD.05",
    icon: ShieldCheck,
  },
  {
    id: "cli",
    labelKey: "settings.section.cli.label",
    detailKey: "settings.section.cli.detail",
    code: "MOD.06",
    icon: Terminal,
  },
  {
    id: "updates",
    labelKey: "settings.section.updates.label",
    detailKey: "settings.section.updates.detail",
    code: "MOD.07",
    icon: MonitorDown,
  },
];

/**
 * Réglages de l'application : fenêtre élargie, sections en rail à gauche et
 * contenu à droite — apparence, interface, enregistrement, données. Les
 * préférences sont persistées localement par le SettingsProvider
 * (use-settings.tsx).
 */
export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { hud } = useSettings();
  const { projects } = useBuilder();
  const t = useT();
  const [section, setSection] = useState<SettingsSectionId>("appearance");
  const active = SETTINGS_SECTIONS.find((item) => item.id === section) ?? SETTINGS_SECTIONS[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[min(85dvh,50rem)] w-full flex-col gap-0 overflow-hidden p-0 ring-primary/20 sm:max-w-4xl"
        showCloseButton={false}
      >
        <DialogHeader className="relative shrink-0 flex-row items-center justify-between gap-3 border-b border-border/60 bg-card/60 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="hud-clip-tr relative flex size-9 shrink-0 items-center justify-center bg-linear-to-br from-primary/30 to-primary/5 text-primary ring-1 ring-primary/25">
              <Settings2 className="size-4" />
            </span>
            <div className="space-y-1">
              <HudLabel className="block">SYSTÈME — {active.code}</HudLabel>
              <DialogTitle>{t("settings.title")}</DialogTitle>
              <DialogDescription className="text-xs">
                {t("settings.header.description", { section: t(active.detailKey) })}
              </DialogDescription>
            </div>
          </div>
          <HudReadout className="hidden sm:inline-flex" label="PREFS" value="LOCAL" />
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-primary/60 via-primary/20 to-transparent"
          />
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          {/* Rail de navigation : sections verticales à gauche (≥ sm). */}
          <nav
            aria-label={t("settings.sections.aria")}
            className="hidden w-48 shrink-0 flex-col gap-1 border-e border-border/60 bg-muted/20 p-2 sm:flex"
          >
            {SETTINGS_SECTIONS.map((item) => (
              <SectionButton
                key={item.id}
                active={item.id === section}
                onClick={() => setSection(item.id)}
                icon={item.icon}
                labelKey={item.labelKey}
                detailKey={item.detailKey}
              />
            ))}
          </nav>

          {/* Rail horizontal de secours (< sm) : mêmes sections en puces. */}
          <div className="no-scrollbar flex shrink-0 gap-1 overflow-x-auto border-b border-border/60 p-2 sm:hidden">
            {SETTINGS_SECTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                aria-pressed={item.id === section}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-[0.7rem] font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                  item.id === section
                    ? "border-primary/40 bg-primary/12 text-foreground"
                    : "border-border text-muted-foreground hover:bg-accent/60",
                )}
              >
                <item.icon className="size-3.5" />
                {t(item.labelKey)}
              </button>
            ))}
          </div>

          <div
            key={section}
            className="panel-scroll min-h-0 flex-1 animate-fade-in overflow-y-auto p-4"
          >
            {section === "appearance" ? <AppearanceSection /> : null}
            {section === "interface" ? <InterfaceSection /> : null}
            {section === "language" ? <LanguageSection /> : null}
            {section === "project" ? <ProjectSection /> : null}
            {section === "data" ? <DataSection entries={projects.length} /> : null}
            {section === "cli" ? <CliSection /> : null}
            {section === "updates" ? <UpdatesSection /> : null}
          </div>
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border/60 bg-muted/30 px-4 py-2.5">
          <span className="flex min-w-0 items-center gap-2">
            <HudStatusDot tone="ok" />
            {hud ? (
              <span className="text-hud truncate text-muted-foreground">
                PREFS:SAVED · STORAGE:LOCAL
              </span>
            ) : (
              <span className="truncate text-[0.68rem] text-muted-foreground">
                {t("settings.footer.saved")}
              </span>
            )}
          </span>
          <DialogClose render={<Button type="button" variant="ghost" size="sm" />}>
            {t("settings.footer.close")}
          </DialogClose>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

/** Bouton du rail : icône, libellé, détail et marqueur d'activation. */
function SectionButton({
  active,
  onClick,
  icon: Icon,
  labelKey,
  detailKey,
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  labelKey: TranslationKey;
  detailKey: TranslationKey;
}) {
  const t = useT();

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active || undefined}
      className={cn(
        "group/rail relative flex items-start gap-2.5 rounded-sm px-2.5 py-2 text-start transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        active
          ? "bg-primary/12 text-foreground"
          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
      )}
    >
      {active ? (
        <span className="absolute inset-y-1.5 left-0 w-0.5 bg-primary" aria-hidden="true" />
      ) : null}
      <Icon
        className={cn(
          "mt-0.5 size-4 shrink-0 transition-colors",
          active ? "text-primary" : "",
        )}
      />
      <span className="min-w-0">
        <span className="block text-[0.78rem] leading-tight font-medium">{t(labelKey)}</span>
        <span className="block text-[0.62rem] leading-snug text-muted-foreground">
          {t(detailKey)}
        </span>
      </span>
    </button>
  );
}

/** Apparence : mode clair / sombre + thème de couleurs. */
function AppearanceSection() {
  const { mode, setMode, colorTheme, setColorTheme } = useSettings();
  const t = useT();

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <HudLabel className="block">{t("settings.appearance.mode.heading")}</HudLabel>
        <SettingRow
          icon={mode === "dark" ? Moon : Sun}
          title={t("settings.appearance.darkTheme.title")}
          description={t("settings.appearance.darkTheme.description")}
        >
          <Switch
            checked={mode === "dark"}
            onCheckedChange={(checked) => setMode(checked ? "dark" : "light")}
            aria-label={t("settings.appearance.darkTheme.title")}
          />
        </SettingRow>
      </section>

      <Separator />

      <section className="space-y-3">
        <HudLabel className="block">{t("settings.appearance.colors.heading")}</HudLabel>
        <div className="space-y-2">
          <p className="text-[0.78rem] leading-tight font-medium">
            {t("settings.appearance.colorTheme.title")}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {COLOR_THEMES.map((theme) => (
              <ThemeSwatch
                key={theme.id}
                label={theme.label}
                palette={theme.palettes[mode]}
                active={theme.id === colorTheme}
                onSelect={() => setColorTheme(theme.id)}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

/** Langue : sélecteur des langues de l'interface (noms d'origine). */
function LanguageSection() {
  const { language, setLanguage } = useSettings();
  const t = useT();

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <HudLabel className="block">{t("settings.language.heading")}</HudLabel>
        <SettingRow
          icon={Globe}
          title={t("settings.language.title")}
          description={t("settings.language.description")}
        >
          <Select
            items={LOCALES.map((locale) => ({ value: locale.id, label: locale.label }))}
            value={language}
            onValueChange={(next) => setLanguage(next as LocaleId)}
          >
            <SelectTrigger className="w-36" aria-label={t("settings.language.aria")}>
              <span className="flex items-center gap-2">
                <Globe className="size-3.5 text-muted-foreground" />
                <SelectValue />
              </span>
            </SelectTrigger>
            <SelectContent>
              {LOCALES.map((locale) => (
                <SelectItem key={locale.id} value={locale.id}>
                  {locale.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
      </section>

      <Separator />

      <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
        <p className="text-[0.68rem] leading-relaxed text-muted-foreground">
          <span className="font-mono">en</span> · {LOCALES.length}{" "}
          {t("settings.language.available", { count: LOCALES.length })}
        </p>
      </div>
    </div>
  );
}

/** Interface : ornements HUD et animations. */
function InterfaceSection() {
  const { hud, setHud, animations, setAnimations } = useSettings();
  const t = useT();

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <HudLabel className="block">{t("settings.interface.effects.heading")}</HudLabel>
        <SettingRow
          icon={ScanLine}
          title={t("settings.interface.hud.title")}
          description={t("settings.interface.hud.description")}
        >
          <Switch checked={hud} onCheckedChange={setHud} aria-label={t("settings.interface.hud.aria")} />
        </SettingRow>

        <Separator className="bg-border/60" />

        <SettingRow
          icon={Zap}
          title={t("settings.interface.animations.title")}
          description={t("settings.interface.animations.description")}
        >
          <Switch
            checked={animations}
            onCheckedChange={setAnimations}
            aria-label={t("settings.interface.animations.aria")}
          />
        </SettingRow>
      </section>
    </div>
  );
}

/** Projet : enregistrement automatique du fichier .qrd lié. */
function ProjectSection() {
  const { autoSaveFile, setAutoSaveFile } = useSettings();
  const t = useT();

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <HudLabel className="block">{t("settings.project.saving.heading")}</HudLabel>
        <SettingRow
          icon={RefreshCw}
          title={t("settings.project.autoSave.title")}
          description={t("settings.project.autoSave.description")}
        >
          <Switch
            checked={autoSaveFile}
            onCheckedChange={setAutoSaveFile}
            aria-label={t("settings.project.autoSave.aria")}
          />
        </SettingRow>
      </section>

      <Separator />

      <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
        <p className="text-[0.68rem] leading-relaxed text-muted-foreground">
          {t("settings.project.draftNote")}
        </p>
      </div>
    </div>
  );
}

/** Données : rappel du fonctionnement 100 % local. */
function DataSection({ entries }: { entries: number }) {
  const t = useT();

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <HudLabel className="block">{t("settings.data.registry.heading")}</HudLabel>
        <div className="hud-clip-tr space-y-2 bg-muted/40 p-3 ring-1 ring-border/60">
          <p className="flex items-center gap-1.5 text-[0.72rem] font-medium">
            <ShieldCheck className="size-3.5 shrink-0 text-primary" />
            {t("settings.data.local.title")}
          </p>
          <p className="text-[0.68rem] leading-relaxed text-muted-foreground">
            {t("settings.data.local.description")}
          </p>
          <HudReadout label="N.ENTRY" value={String(entries).padStart(2, "0")} />
        </div>
      </section>
    </div>
  );
}

/**
 * CLI : mise à disposition des commandes `eventages-qr` et `eqr` dans le
 * terminal (liens symboliques posés dans le PATH par le backend natif). L'état
 * est relu à l'ouverture de la section ; le retrait reste possible même si le
 * script source a depuis disparu, pour nettoyer la machine.
 */
function CliSection() {
  const [status, setStatus] = useState<CliStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useT();
  const locale = useLocale();

  // Le message de l'état est traduit côté backend (src-tauri/src/i18n.rs) :
  // relu quand la langue change, pour refléter l'interface immédiatement.
  useEffect(() => {
    let cancelled = false;
    fetchCliStatus()
      .then((next) => {
        if (!cancelled) setStatus(next);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const toggle = async (checked: boolean): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      setStatus(checked ? await installCli() : await uninstallCli());
    } catch (failure) {
      setError(
        failure instanceof Error && failure.message
          ? failure.message
          : t("settings.cli.expose.failure"),
      );
    } finally {
      setBusy(false);
    }
  };

  // Hors shell Tauri (simple navigateur) ou backend indisponible : pas de contrôle.
  if (!status) {
    return (
      <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
        <p className="text-[0.68rem] leading-relaxed text-muted-foreground">
          {t("settings.cli.unavailable")}
        </p>
      </div>
    );
  }

  const disabled = busy || status.binDir === null || (!status.available && !status.installed);

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <HudLabel className="block">{t("settings.cli.terminal.heading")}</HudLabel>
        <SettingRow
          icon={Terminal}
          title={t("settings.cli.expose.title")}
          description={t("settings.cli.expose.description", {
            cmd1: "eventages-qr",
            cmd2: "eqr",
          })}
        >
          <Switch
            checked={status.installed}
            disabled={disabled}
            onCheckedChange={toggle}
            aria-label={t("settings.cli.expose.aria")}
          />
        </SettingRow>
      </section>

      {error ? (
        <Alert variant="destructive" className="border-destructive/40">
          <TriangleAlert className="size-4" />
          <AlertDescription className="text-[0.7rem] leading-snug">{error}</AlertDescription>
        </Alert>
      ) : (
        <p className="flex items-center gap-2 text-[0.68rem] leading-snug text-muted-foreground">
          <HudStatusDot tone={status.installed ? "ok" : "primary"} />
          {status.message}
        </p>
      )}

      <Separator />

      <section className="space-y-3">
        <HudLabel className="block">{t("settings.cli.detail.heading")}</HudLabel>
        <div className="hud-clip-tr space-y-2 bg-muted/40 p-3 ring-1 ring-border/60">
          <p className="flex items-center gap-1.5 text-[0.72rem] font-medium">
            <Terminal className="size-3.5 shrink-0 text-primary" />
            {t("settings.cli.twoNames.title")}
          </p>
          <p className="text-[0.68rem] leading-relaxed text-muted-foreground">
            {t("settings.cli.twoNames.description", {
              cmd1: "eventages-qr",
              cmd2: "eqr",
            })}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <HudReadout label="CMD" value={status.commands.join(" · ")} />
            <HudReadout label="BIN" value={status.binDir ?? "—"} />
            <HudReadout label="SCRIPT" value={scriptTail(status.scriptPath)} />
          </div>
        </div>
      </section>

      <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
        <p className="text-[0.68rem] leading-relaxed text-muted-foreground">
          {t("settings.cli.workspaceNote", { dir: "--dir", env: "EVENTAGES_QR_DIR" })}
        </p>
      </div>
    </div>
  );
}

/** Chemin du script résumé à ses deux derniers segments (cli/eventages-qr.ts). */
function scriptTail(path: string | null): string {
  if (!path) return "—";
  const parts = path.split(/[\\/]/);
  return parts.slice(-2).join("/");
}

/** Version lissée à trois décimales pour la ritournelle HUD (0.12.2). */
function versionText(tag: string | null | undefined, fallback: string): string {
  const stripped = (tag ?? "").replace(/^v/, "").trim();
  return stripped || fallback;
}

/**
 * Mises à jour : réglage d'installation automatique (désactivé par défaut)
 * et vérification manuelle depuis les releases GitHub du dépôt. Le statut
 * est partagé avec la barre de titre via le UpdaterProvider (use-updater.tsx)
 * : vérifier ici met aussi à jour la pastille là-bas, et réciproquement.
 */
function UpdatesSection() {
  const { autoUpdate, setAutoUpdate } = useSettings();
  const { status, info, error, progress, checkForUpdate } = useUpdater();
  const t = useT();
  const busy = status === "checking" || status === "downloading";

  // Ligne de statut unique, recyclée par tous les états du système.
  const statusLine = (() => {
    switch (status) {
      case "checking":
        return t("settings.updates.status.checking");
      case "downloading":
        return t("settings.updates.status.downloading", {
          version: info?.latestVersion ?? "",
          percent: progress ?? 0,
        });
      case "available":
        return t("settings.updates.status.available", {
          version: info?.latestVersion ?? "",
          file: info?.assetName ?? "",
        });
      case "ready":
        return t("settings.updates.status.ready", { file: info?.assetName ?? "" });
      case "error":
        return t("settings.updates.status.error", { error: error ?? "" });
      case "uptodate":
        return t("settings.updates.status.uptodate", {
          version: info?.currentVersion ?? "",
        });
      default:
        return t("settings.updates.status.idle");
    }
  })();

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <HudLabel className="block">{t("settings.updates.heading")}</HudLabel>
        <SettingRow
          icon={MonitorDown}
          title={t("settings.updates.auto.title")}
          description={t("settings.updates.auto.description")}
        >
          <Switch
            checked={autoUpdate}
            onCheckedChange={setAutoUpdate}
            aria-label={t("settings.updates.auto.aria")}
          />
        </SettingRow>
      </section>

      <Separator />

      <section className="space-y-3">
        <HudLabel className="block">{t("settings.updates.check.heading")}</HudLabel>
        <SettingRow
          icon={status === "downloading" ? Loader2 : RefreshCw}
          title={t("settings.updates.check.title")}
          description={t("settings.updates.check.description")}
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy || status === "ready"}
            onClick={() => void checkForUpdate()}
          >
            {status === "downloading" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            {t("settings.updates.action.check")}
          </Button>
        </SettingRow>

        {status === "downloading" && progress !== null ? (
          <Progress value={progress} aria-label={t("settings.updates.status.downloading", { version: info?.latestVersion ?? "", percent: progress })} />
        ) : null}

        {error ? (
          <Alert variant="destructive" className="border-destructive/40">
            <TriangleAlert className="size-4" />
            <AlertDescription className="text-[0.7rem] leading-snug">{statusLine}</AlertDescription>
          </Alert>
        ) : (
          <p className="flex items-center gap-2 text-[0.68rem] leading-snug text-muted-foreground">
            <HudStatusDot tone={status === "available" || status === "ready" ? "primary" : "ok"} />
            <span className="min-w-0">{statusLine}</span>
          </p>
        )}
      </section>

      <Separator />

      <section className="space-y-3">
        <HudLabel className="block">{t("settings.updates.detail.heading")}</HudLabel>
        <div className="hud-clip-tr space-y-2 bg-muted/40 p-3 ring-1 ring-border/60">
          <p className="flex items-center gap-1.5 text-[0.72rem] font-medium">
            <MonitorDown className="size-3.5 shrink-0 text-primary" />
            {t("settings.updates.source.title")}
          </p>
          <p className="text-[0.68rem] leading-relaxed text-muted-foreground">
            {t("settings.updates.sourceNote", { repo: GITHUB_REPO })}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <HudReadout label="INSTALLED" value={versionText(info?.tag, info?.currentVersion ?? "—")} />
            <HudReadout label="LATEST" value={versionText(info?.tag, info?.latestVersion ?? "—")} />
            <HudReadout label="ARTIFACT" value={info?.assetName ?? "—"} />
          </div>
        </div>
        <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
          <p className="text-[0.68rem] leading-relaxed text-muted-foreground">
            {t("settings.updates.autoHint")}
          </p>
        </div>
      </section>
    </div>
  );
}

/** Ligne de réglage : icône crantée + intitulé + description + contrôle. */
function SettingRow({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-start gap-2.5">
        <span className="hud-clip-tr mt-0.5 flex size-7 shrink-0 items-center justify-center bg-primary/10 text-primary">
          <Icon className="size-3.5" />
        </span>
        <div className="min-w-0 space-y-0.5">
          <p className="text-[0.8rem] leading-tight font-medium">{title}</p>
          <p className="text-[0.68rem] leading-snug text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="shrink-0 pt-1">{children}</div>
    </div>
  );
}

/** Aperçu d'un thème : fond + bandes d'accent, sélection persistée. */
function ThemeSwatch({
  label,
  palette,
  active,
  onSelect,
}: {
  label: string;
  palette: ColorThemePalette;
  active: boolean;
  onSelect: () => void;
}) {
  const { mode } = useSettings();
  const t = useT();

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      aria-label={t("settings.appearance.themeSwatch.aria", { label })}
      className={cn(
        "group flex flex-col gap-1.5 rounded-sm border p-1.5 text-start transition-all duration-200",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
        active
          ? "border-primary/60 bg-primary/8 ring-1 ring-primary/30"
          : "border-border/70 hover:border-primary/40 hover:bg-accent/40",
      )}
    >
      <span
        className="relative block h-9 overflow-hidden rounded-[3px] ring-1 ring-border/60"
        style={{ backgroundColor: palette.bg }}
      >
        <span className="absolute inset-x-0 bottom-0 flex h-2.5">
          <span className="h-full flex-1" style={{ backgroundColor: palette.primary }} />
          <span className="h-full flex-1" style={{ backgroundColor: palette.accent }} />
        </span>
        {active ? (
          <Check
            className={cn(
              "absolute top-1 left-1 size-3",
              mode === "dark" ? "text-white" : "text-neutral-900",
            )}
          />
        ) : null}
      </span>
      <span className="truncate text-[0.66rem] font-medium">{label}</span>
    </button>
  );
}
