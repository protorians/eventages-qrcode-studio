import { useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronsUpDown,
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
import { FileControl, SectionTitle, SwitchControl } from "@/components/builder/controls";
import {
  QR_FAMILIES,
  QR_TYPES,
  defaultValuesFor,
  sampleValuesFor,
  type QrField,
} from "@/lib/qr-catalog";
import { useBuilder } from "@/lib/builder-store";
import { cn } from "@/lib/utils";

/** Onglet « Contenu » : galerie + formulaire du type courant (spec 001). */
export function ModuleContent() {
  const { state, dispatch, type, values, missingField, progress, setValue } = useBuilder();
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return QR_TYPES.filter((candidate) => {
      if (family && candidate.family !== family) return false;
      if (!term) return true;
      return (
        candidate.label.toLowerCase().includes(term) ||
        candidate.tagline.toLowerCase().includes(term) ||
        candidate.id.includes(term)
      );
    });
  }, [query, family]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <SectionTitle hint="Le type détermine les champs de contenu et le mode d'encodage.">
          Type de QR
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
              <span className="min-w-0 text-left">
                <span className="block truncate text-[0.8rem] font-medium">
                  {type.label}
                </span>
                <span className="block truncate text-[0.68rem] font-normal text-muted-foreground">
                  {type.tagline}
                </span>
              </span>
            </span>
            <ChevronsUpDown className="text-muted-foreground" />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[min(22rem,calc(100vw-2rem))] gap-2 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
                placeholder="Rechercher un type…"
                className="h-8 pl-8 text-xs"
              />
            </div>
            <div className="no-scrollbar flex gap-1 overflow-x-auto pb-1">
              <FilterChip active={family === null} onClick={() => setFamily(null)}>
                Tous
              </FilterChip>
              {QR_FAMILIES.map((item) => (
                <FilterChip
                  key={item.id}
                  active={family === item.id}
                  onClick={() => setFamily(item.id)}
                >
                  {item.label}
                </FilterChip>
              ))}
            </div>
            <ScrollArea className="h-64">
              <div className="space-y-0.5 pr-2">
                {filtered.map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => {
                      dispatch({ type: "setType", typeId: candidate.id });
                      setQuery("");
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors",
                      "hover:bg-accent focus-visible:bg-accent focus-visible:outline-none",
                      candidate.id === state.typeId && "bg-primary/10",
                    )}
                  >
                    <candidate.icon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium">
                        {candidate.label}
                      </span>
                      <span className="block truncate text-[0.65rem] text-muted-foreground">
                        {candidate.tagline}
                      </span>
                    </span>
                    {candidate.id === state.typeId ? (
                      <Check className="size-3.5 text-primary" />
                    ) : null}
                  </button>
                ))}
                {filtered.length === 0 ? (
                  <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                    Aucun type ne correspond.
                  </p>
                ) : null}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="text-[0.62rem]">
            {type.encoding === "direct" ? "Encodage direct" : "Page autonome"}
          </Badge>
          <Badge variant="outline" className="text-[0.62rem]">
            {type.fields.length} champs
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

      {missingField ? (
        <Alert variant="destructive" className="animate-fade-in">
          <AlertCircle />
          <AlertTitle>Champ obligatoire manquant</AlertTitle>
          <AlertDescription>
            « {missingField.label} » est nécessaire pour générer ce QR code.
          </AlertDescription>
        </Alert>
      ) : null}

      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        {type.fields.map((field) => (
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
          Exemple
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
          Vider
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
  const id = `field-${field.name}`;

  if (field.type === "switch") {
    return (
      <div className="rounded-xl border border-border/60 bg-card/40 px-3 py-2.5">
        <SwitchControl
          label={field.label}
          hint={field.help}
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
          {field.label}
        </Label>
        <FileControl
          id={id}
          value={value}
          accept={field.accept ?? "*/*"}
          label={field.label}
          hint={field.help}
          preview={field.accept?.startsWith("image")}
          onChange={onChange}
        />
      </div>
    );
  }

  if (field.type === "select") {
    const options = field.options ?? [];
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id} className="text-[0.8rem]">
          {field.label}
        </Label>
        <Select
          items={options}
          value={value}
          onValueChange={(next) => onChange(String(next ?? ""))}
        >
          <SelectTrigger id={id} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {field.help ? (
          <p className="text-[0.68rem] text-muted-foreground">{field.help}</p>
        ) : null}
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id} className="text-[0.8rem]">
          {field.label}
          {field.required ? <span className="text-destructive">*</span> : null}
        </Label>
        <Textarea
          id={id}
          value={value}
          required={field.required}
          aria-invalid={invalid}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.currentTarget.value)}
          className="min-h-20 text-[0.8rem]"
        />
        {field.help ? (
          <p className="text-[0.68rem] text-muted-foreground">{field.help}</p>
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
        {field.label}
        {field.required ? <span className="text-destructive">*</span> : null}
      </Label>
      <Input
        id={id}
        type={inputType}
        value={value}
        required={field.required}
        aria-invalid={invalid}
        placeholder={field.placeholder}
        onChange={(event) => onChange(event.currentTarget.value)}
        className={cn(
          "text-[0.8rem]",
          (field.type === "url" || field.type === "password" || field.type === "tel") &&
            "font-mono text-[0.75rem]",
        )}
      />
      {field.help ? (
        <p className="text-[0.68rem] text-muted-foreground">{field.help}</p>
      ) : null}
    </div>
  );
}
