import { useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronsUpDown,
  Clock,
  RotateCcw,
  Search,
  WandSparkles,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FileControl, SectionTitle, SwitchControl } from "@/components/ui/controls";
import { barcodeFormat } from "@/lib/barcode";
import {
  QR_FAMILIES,
  QR_TYPES,
  defaultValuesFor,
  sampleValuesFor,
  type QrField,
} from "@/lib/qr-catalog";
import { useBuilder } from "@/lib/builder-store";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Onglet « Contenu » : galerie + formulaire du type courant (spec 001). */
export function ModuleContent() {
  const { state, dispatch, type, values, missingField, progress, setValue } = useBuilder();
  const t = useT();
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState<string | null>(null);

  // Aide du champ « valeur » du code-barres : adaptée à la symbologie choisie.
  const fields = useMemo<QrField[]>(() => {
    if (type.id !== "barcode") return type.fields;
    return type.fields.map((field) =>
      field.name === "data"
        ? {
            ...field,
            // Hint et exemple de la symbologie : valeurs neutres non traduites.
            helpRaw: barcodeFormat(values.symbology).hint,
            placeholder: barcodeFormat(values.symbology).sample,
          }
        : field,
    );
  }, [type, values.symbology]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const matched = QR_TYPES.filter((candidate) => {
      if (family && candidate.family !== family) return false;
      if (!term) return true;
      return (
        t(candidate.label).toLowerCase().includes(term) ||
        t(candidate.tagline).toLowerCase().includes(term) ||
        candidate.id.includes(term)
      );
    });
    // Types actifs d'abord, désactivés (« bientôt ») regroupés à la fin.
    return matched.sort((a, b) => Number(Boolean(a.comingSoon)) - Number(Boolean(b.comingSoon)));
  }, [query, family, t]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <SectionTitle hint={t("content.typeHint")}>
          {t("content.typeHeading")}
        </SectionTitle>
        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                className="h-auto w-full justify-between gap-3 py-2"
              />
            }
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                <type.icon className="size-4" />
              </span>
              <span className="min-w-0 text-start">
                <span className="block truncate text-[0.8rem] font-medium">
                  {t(type.label)}
                </span>
                <span className="block truncate text-[0.68rem] font-normal text-muted-foreground">
                  {t(type.tagline)}
                </span>
              </span>
            </span>
            <ChevronsUpDown className="text-muted-foreground" />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[min(22rem,calc(100vw-2rem))] gap-2 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 start-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
                placeholder={t("content.searchPlaceholder")}
                className="h-8 ps-8 text-xs"
              />
            </div>
            <div className="no-scrollbar flex gap-1 overflow-x-auto pb-1">
              <FilterChip active={family === null} onClick={() => setFamily(null)}>
                {t("content.all")}
              </FilterChip>
              {QR_FAMILIES.map((item) => (
                <FilterChip
                  key={item.id}
                  active={family === item.id}
                  onClick={() => setFamily(item.id)}
                >
                  {t(item.label)}
                </FilterChip>
              ))}
            </div>
            <ScrollArea className="h-64">
              <div className="space-y-0.5 pe-2">
                {filtered.map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    disabled={candidate.comingSoon}
                    onClick={() => {
                      dispatch({ type: "setType", typeId: candidate.id });
                      setQuery("");
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start transition-colors",
                      "hover:bg-accent focus-visible:bg-accent focus-visible:outline-none",
                      candidate.id === state.typeId && "bg-primary/10",
                      candidate.comingSoon &&
                        "cursor-not-allowed opacity-[0.43] grayscale hover:bg-transparent",
                    )}
                  >
                    <candidate.icon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium">
                        {t(candidate.label)}
                      </span>
                      <span className="block truncate text-[0.65rem] text-muted-foreground">
                        {t(candidate.tagline)}
                      </span>
                    </span>
                    {candidate.comingSoon ? (
                      <span className="shrink-0 rounded-full border border-border px-1.5 py-0.5 text-[0.55rem] font-medium tracking-wide text-muted-foreground uppercase">
                        {t("content.comingSoon")}
                      </span>
                    ) : candidate.id === state.typeId ? (
                      <Check className="size-3.5 text-primary" />
                    ) : null}
                  </button>
                ))}
                {filtered.length === 0 ? (
                  <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                    {t("content.noMatch")}
                  </p>
                ) : null}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="text-[0.62rem]">
            {type.encoding === "direct" ? t("content.encoding.direct") : t("content.encoding.page")}
          </Badge>
          {type.comingSoon ? (
            <Badge variant="outline" className="text-[0.62rem]">
              {t("content.comingSoon")}
            </Badge>
          ) : null}
          <Badge variant="outline" className="text-[0.62rem]">
            {t("content.fieldCount", { count: type.fields.length })}
          </Badge>
          <span className="ml-auto font-mono text-[0.62rem] text-muted-foreground">
            {progress}%
          </span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {type.comingSoon ? (
        <Alert className="animate-fade-in">
          <Clock />
          <AlertTitle>{t("content.comingSoonTitle")}</AlertTitle>
          <AlertDescription>
            {t("content.comingSoonDescription", { label: t(type.label) })}
          </AlertDescription>
        </Alert>
      ) : missingField ? (
        <Alert variant="destructive" className="animate-fade-in">
          <AlertCircle />
          <AlertTitle>{t("content.missingFieldTitle")}</AlertTitle>
          <AlertDescription>
            {t("content.missingFieldDescription", { label: t(missingField.label) })}
          </AlertDescription>
        </Alert>
      ) : null}

      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        {fields.map((field) => (
          <FieldInput
            key={field.name}
            field={field}
            value={values[field.name] ?? ""}
            invalid={missingField?.name === field.name}
            onChange={(value) => setValue(field.name, value)}
          />
        ))}
      </form>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => {
            const sample = sampleValuesFor(type);
            for (const [name, value] of Object.entries(sample)) setValue(name, value);
          }}
        >
          <WandSparkles />
          {t("content.sample")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="flex-1"
          onClick={() => {
            const fresh = defaultValuesFor(type);
            for (const [name, value] of Object.entries(fresh)) setValue(name, value);
          }}
        >
          <RotateCcw />
          {t("content.reset")}
        </Button>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 rounded-full border px-2.5 py-1 text-[0.65rem] font-medium whitespace-nowrap transition-all duration-200",
        active
          ? "border-primary/40 bg-primary/12 text-foreground"
          : "border-border text-muted-foreground hover:border-border hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}

function FieldInput({
  field,
  value,
  invalid,
  onChange,
}: {
  field: QrField;
  value: string;
  invalid: boolean;
  onChange: (value: string) => void;
}) {
  const t = useT();
  const id = `field-${field.name}`;

  if (field.type === "switch") {
    return (
      <div className="rounded-xl border border-border/60 bg-card/40 px-3 py-2.5">
        <SwitchControl
          label={t(field.label)}
          hint={field.helpRaw ?? (field.help ? t(field.help) : undefined)}
          checked={value === "true"}
          onChange={(next) => onChange(String(next))}
        />
      </div>
    );
  }

  if (field.type === "file") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id} className="text-[0.8rem]">
          {t(field.label)}
        </Label>
        <FileControl
          id={id}
          value={value}
          accept={field.accept ?? "*/*"}
          label={t(field.label)}
          hint={field.helpRaw ?? (field.help ? t(field.help) : undefined)}
          preview={field.accept?.startsWith("image")}
          onChange={onChange}
        />
      </div>
    );
  }

  if (field.type === "select") {
    const options = field.options ?? [];
    // Étiquettes traduites pour le rendu (valeur sélectionnée incluse).
    const items = options.map((option) => ({
      value: option.value,
      label: t(option.label),
    }));
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id} className="text-[0.8rem]">
          {t(field.label)}
        </Label>
        <Select
          items={items}
          value={value}
          onValueChange={(next) => onChange(String(next ?? ""))}
        >
          <SelectTrigger id={id} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {items.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {field.helpRaw ? (
          <p className="text-[0.68rem] text-muted-foreground">{field.helpRaw}</p>
        ) : field.help ? (
          <p className="text-[0.68rem] text-muted-foreground">{t(field.help)}</p>
        ) : null}
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id} className="text-[0.8rem]">
          {t(field.label)}
          {field.required ? <span className="text-destructive">*</span> : null}
        </Label>
        <Textarea
          id={id}
          value={value}
          required={field.required}
          aria-invalid={invalid}
          placeholder={field.placeholderKey ? t(field.placeholderKey) : field.placeholder}
          onChange={(event) => onChange(event.currentTarget.value)}
          className="min-h-20 text-[0.8rem]"
        />
        {field.helpRaw ? (
          <p className="text-[0.68rem] text-muted-foreground">{field.helpRaw}</p>
        ) : field.help ? (
          <p className="text-[0.68rem] text-muted-foreground">{t(field.help)}</p>
        ) : null}
      </div>
    );
  }

  const inputType =
    field.type === "tel"
      ? "tel"
      : field.type === "email"
        ? "email"
        : field.type === "url"
          ? "url"
          : field.type === "password"
            ? "password"
            : field.type === "date"
              ? "date"
              : field.type === "time"
                ? "time"
                : field.type === "number"
                  ? "number"
                  : "text";

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[0.8rem]">
        {t(field.label)}
        {field.required ? <span className="text-destructive">*</span> : null}
      </Label>
      <Input
        id={id}
        type={inputType}
        value={value}
        required={field.required}
        aria-invalid={invalid}
        placeholder={field.placeholderKey ? t(field.placeholderKey) : field.placeholder}
        onChange={(event) => onChange(event.currentTarget.value)}
        className={cn(
          "text-[0.8rem]",
          (field.type === "url" || field.type === "password" || field.type === "tel") &&
            "font-mono text-[0.75rem]",
        )}
      />
      {field.helpRaw ? (
        <p className="text-[0.68rem] text-muted-foreground">{field.helpRaw}</p>
      ) : field.help ? (
        <p className="text-[0.68rem] text-muted-foreground">{t(field.help)}</p>
      ) : null}
    </div>
  );
}
