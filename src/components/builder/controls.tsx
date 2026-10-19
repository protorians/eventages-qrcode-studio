import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { CircleHelp, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { PALETTES } from "@/lib/qr-design";

const HEX_PATTERN = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

export function InfoTip({ children }: { children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className="text-muted-foreground/70 transition-colors hover:text-foreground"
            aria-label="Aide"
          />
        }
      >
        <CircleHelp className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent className="max-w-56 text-balance">{children}</TooltipContent>
    </Tooltip>
  );
}

export function SectionTitle({
  children,
  hint,
  className,
}: {
  children: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span className="text-[0.7rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        {children}
      </span>
      {hint ? <InfoTip>{hint}</InfoTip> : null}
    </div>
  );
}

export function FieldRow({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <div className="flex min-w-0 items-center gap-1.5">
        <Label htmlFor={htmlFor} className="truncate text-[0.8rem] font-medium">
          {label}
        </Label>
        {hint ? <InfoTip>{hint}</InfoTip> : null}
      </div>
      {children}
    </div>
  );
}

export function ControlStack({
  label,
  hint,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Label className="text-[0.8rem] font-medium text-foreground">{label}</Label>
        {hint ? <InfoTip>{hint}</InfoTip> : null}
      </div>
      {children}
    </div>
  );
}

export function SwatchRail({
  value,
  onChange,
  columns = 8,
  className,
}: {
  value: string;
  onChange: (color: string) => void;
  columns?: number;
  className?: string;
}) {
  const swatches = PALETTES.flatMap((palette) => palette.colors);
  return (
    <div
      className={cn("grid gap-1.5", className)}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {swatches.map((swatch, index) => (
        <button
          key={`${swatch.value}-${index}`}
          type="button"
          title={`${swatch.name} · ${swatch.value}`}
          onClick={() => onChange(swatch.value)}
          style={{ background: swatch.value }}
          className={cn(
            "aspect-square rounded-md ring-1 ring-inset ring-black/10 transition-all duration-200 hover:scale-110 hover:ring-2 hover:ring-ring/60 focus-visible:scale-110 focus-visible:outline-none",
            value.toLowerCase() === swatch.value.toLowerCase() &&
              "scale-110 ring-2 ring-ring",
          )}
        />
      ))}
    </div>
  );
}

export function ColorControl({
  value,
  onChange,
  label,
  className,
  compact = false,
}: {
  value: string;
  onChange: (color: string) => void;
  label: string;
  className?: string;
  compact?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const valid = HEX_PATTERN.test(draft);

  useEffect(() => setDraft(value), [value]);

  const commit = () => {
    if (HEX_PATTERN.test(draft)) onChange(draft.toLowerCase());
    else setDraft(value);
  };

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn("h-8 gap-2 font-mono text-[0.7rem] uppercase", className)}
          />
        }
      >
        <span
          className="size-4 shrink-0 rounded-[5px] ring-1 ring-inset ring-black/15"
          style={{ background: value }}
        />
        {!compact && <span className="truncate">{value}</span>}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 gap-3 p-3">
        <div className="flex items-center gap-2">
          <label className="relative size-11 shrink-0 cursor-pointer overflow-hidden rounded-lg ring-1 ring-inset ring-black/15">
            <span className="absolute inset-0" style={{ background: value }} />
            <input
              type="color"
              aria-label={label}
              value={value}
              onChange={(event) => onChange(event.currentTarget.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
          <Input
            value={draft}
            spellCheck={false}
            aria-label={`${label} (hex)`}
            onChange={(event) => setDraft(event.currentTarget.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commit();
              }
            }}
            aria-invalid={!valid}
            className="h-9 font-mono text-xs uppercase"
          />
        </div>
        <Separator />
        <SwatchRail value={value} onChange={onChange} />
      </PopoverContent>
    </Popover>
  );
}

export function SliderControl({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
  hint,
  className,
}: {
  label: ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Label className="text-[0.8rem] font-medium">{label}</Label>
          {hint ? <InfoTip>{hint}</InfoTip> : null}
        </div>
        <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.7rem] text-muted-foreground tabular-nums">
          {value}
          {suffix}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(next) => onChange(typeof next === "number" ? next : next[0])}
      />
    </div>
  );
}

export function SwitchControl({
  label,
  checked,
  onChange,
  hint,
  disabled,
}: {
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <FieldRow label={label} hint={hint}>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={(next) => onChange(Boolean(next))}
      />
    </FieldRow>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  size = "default",
}: {
  options: { value: T; label: ReactNode; icon?: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: "sm" | "default";
}) {
  return (
    <div
      role="tablist"
      data-slot="segmented-control"
      className={cn(
        "flex items-center gap-0.5 rounded-lg border border-border/70 bg-muted/40 p-0.5",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            data-active={active}
            data-slot="segmented-trigger"
            onClick={() => onChange(option.value)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-[7px] font-medium whitespace-nowrap transition-all duration-300 ease-out",
              size === "sm" ? "px-1.5 py-0.5 text-[0.65rem]" : "px-2 py-1 text-[0.7rem]",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/50 hover:text-foreground",
            )}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function SelectableTile({
  selected,
  onSelect,
  children,
  title,
  subtitle,
  className,
}: {
  selected: boolean;
  onSelect: () => void;
  children?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      data-selected={selected}
      onClick={onSelect}
      className={cn(
        "group/tile relative flex flex-col items-center gap-1.5 rounded-xl border border-border/70 bg-card/50 px-2 py-2.5 text-[0.68rem] font-medium text-muted-foreground transition-all duration-300 ease-out",
        "hover:-translate-y-0.5 hover:border-border hover:bg-accent/60 hover:text-foreground hover:shadow-sm",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
        "data-[selected=true]:border-primary/50 data-[selected=true]:bg-primary/10 data-[selected=true]:text-foreground data-[selected=true]:ring-2 data-[selected=true]:ring-primary/25",
        className,
      )}
    >
      {children}
      {title ? <span className="leading-tight">{title}</span> : null}
      {subtitle ? (
        <span className="text-[0.62rem] font-normal text-muted-foreground/80">{subtitle}</span>
      ) : null}
    </button>
  );
}

export function SwatchButton({
  color,
  selected,
  onSelect,
  label,
}: {
  color: string;
  selected: boolean;
  onSelect: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={selected}
      onClick={onSelect}
      style={{ background: color }}
      className={cn(
        "size-7 rounded-full ring-1 ring-inset ring-black/10 transition-all duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected && "scale-110 ring-2 ring-ring ring-offset-2 ring-offset-card",
      )}
    />
  );
}

export function GradientEditor({
  from,
  to,
  rotation,
  onFromChange,
  onToChange,
  onRotationChange,
  presets,
}: {
  from: string;
  to: string;
  rotation: number;
  onFromChange: (color: string) => void;
  onToChange: (color: string) => void;
  onRotationChange: (angle: number) => void;
  presets: { id: string; name: string; from: string; to: string }[];
}) {
  return (
    <div className="space-y-3">
      <div
        className="h-9 rounded-lg ring-1 ring-inset ring-black/10"
        style={{ background: `linear-gradient(${rotation}deg, ${from}, ${to})` }}
      />
      <div className="grid grid-cols-2 gap-2">
        <ColorControl label="Couleur de départ" value={from} onChange={onFromChange} />
        <ColorControl label="Couleur d'arrivée" value={to} onChange={onToChange} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            title={preset.name}
            aria-label={preset.name}
            onClick={() => {
              onFromChange(preset.from);
              onToChange(preset.to);
            }}
            style={{
              background: `linear-gradient(135deg, ${preset.from}, ${preset.to})`,
            }}
            className={cn(
              "h-6 w-10 rounded-md ring-1 ring-inset ring-black/10 transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              from.toLowerCase() === preset.from.toLowerCase() &&
                to.toLowerCase() === preset.to.toLowerCase() &&
                "ring-2 ring-ring",
            )}
          />
        ))}
      </div>
      <SliderControl
        label="Angle"
        value={rotation}
        min={0}
        max={360}
        step={5}
        suffix="°"
        onChange={onRotationChange}
      />
    </div>
  );
}

export function FileControl({
  id,
  value,
  onChange,
  accept,
  label,
  hint,
  preview = false,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  accept: string;
  label: string;
  hint?: ReactNode;
  preview?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const isImage = accept.startsWith("image") && value.startsWith("data:");
  const heading = value && !isImage ? value.split("/").pop() : null;

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onChange(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={cn(
          "group/drop relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-5 text-center transition-all duration-300",
          "hover:border-primary/50 hover:bg-primary/5 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
        )}
      >
        {isImage && preview ? (
          <span className="relative">
            <img
              src={value}
              alt=""
              className="size-16 rounded-lg object-contain ring-1 ring-inset ring-black/10"
            />
          </span>
        ) : (
          <span className="flex size-9 items-center justify-center rounded-full bg-background text-muted-foreground ring-1 ring-border transition-transform duration-300 group-hover/drop:scale-110 group-hover/drop:text-foreground">
            <ImagePlus className="size-4" />
          </span>
        )}
        <span className="space-y-0.5">
          <span className="block text-xs font-medium">
            {heading ?? label}
          </span>
          <span className="block text-[0.68rem] text-muted-foreground">
            {heading ? "Cliquer pour remplacer" : "Déposer un fichier ou parcourir"}
          </span>
        </span>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) readFile(file);
            event.currentTarget.value = "";
          }}
        />
      </div>
      {value && !isImage ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => onChange("")}
        >
          <X />
          Retirer le fichier
        </Button>
      ) : null}
      {hint ? <p className="text-[0.68rem] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function OptionRow({
  icon,
  title,
  detail,
  action,
}: {
  icon?: ReactNode;
  title: ReactNode;
  detail?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/40 p-2.5 transition-colors duration-200 hover:border-border hover:bg-accent/40">
      {icon ? (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          {icon}
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.8rem] font-medium">{title}</p>
        {detail ? (
          <p className="truncate text-[0.68rem] text-muted-foreground">{detail}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
