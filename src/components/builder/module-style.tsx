import { Palette, ShieldCheck } from "lucide-react";
import {
  ColorControl,
  ControlStack,
  GradientEditor,
  SegmentedControl,
  SelectableTile,
  SliderControl,
  SwatchRail,
  SwitchControl,
} from "@/components/ui/controls";
import { ModulePatternPreview } from "@/components/builder/previews";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  DOT_STYLES,
  ERROR_CORRECTION_LEVELS,
  GRADIENT_PRESETS,
  QR_BACKGROUNDS,
  QR_SWATCHES,
  type QrDesign,
} from "@/lib/qr-design";
import type { BarcodeDesign } from "@/lib/barcode";
import { useBuilder } from "@/lib/builder-store";
import { useT } from "@/lib/i18n";

/** Onglet « Style » : forme des modules, couleurs, fond, robustesse. */
export function ModuleStyle() {
  const { state, patchDesign, type } = useBuilder();
  const t = useT();
  const { design } = state;

  if (type.id === "barcode") {
    return <BarcodeStyle barcode={state.barcode} design={design} />;
  }

  return (
    <div className="space-y-5">
      <ControlStack
        label={t("style.dotShape.title")}
        hint={t("style.dotShape.hint")}
      >
        <div className="grid grid-cols-3 gap-2">
          {DOT_STYLES.map((style) => (
            <SelectableTile
              key={style.id}
              selected={design.dotsType === style.id}
              onSelect={() => patchDesign({ dotsType: style.id })}
              title={t(style.label)}
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-muted/60 p-1.5 text-foreground/80">
                <ModulePatternPreview dotType={style.id} />
              </span>
            </SelectableTile>
          ))}
        </div>
      </ControlStack>

      <Separator />

      <ControlStack label={t("style.bodyColor.title")}>
        <SegmentedControl
          value={design.dotsColorMode}
          onChange={(mode) => patchDesign({ dotsColorMode: mode })}
          options={[
            { value: "solid", label: t("style.colorMode.solid") },
            { value: "gradient", label: t("style.colorMode.gradient") },
          ]}
        />
        {design.dotsColorMode === "solid" ? (
          <div className="space-y-3 animate-fade-in">
            <ColorControl
              label={t("style.dotsColor.title")}
              value={design.dotsColor}
              onChange={(color) => patchDesign({ dotsColor: color })}
              swatches={QR_SWATCHES}
              className="w-full justify-between"
            />
            <SwatchRail
              value={design.dotsColor}
              onChange={(color) => patchDesign({ dotsColor: color })}
              swatches={QR_SWATCHES}
            />
          </div>
        ) : (
          <div className="animate-fade-in">
            <GradientEditor
              from={design.dotsGradientFrom}
              to={design.dotsGradientTo}
              rotation={design.dotsGradientRotation}
              presets={GRADIENT_PRESETS}
              swatches={QR_SWATCHES}
              onFromChange={(color) => patchDesign({ dotsGradientFrom: color })}
              onToChange={(color) => patchDesign({ dotsGradientTo: color })}
              onRotationChange={(angle) => patchDesign({ dotsGradientRotation: angle })}
            />
          </div>
        )}
      </ControlStack>

      <Separator />

      <ControlStack label={t("style.background.title")}>
        <div className="flex flex-wrap gap-2">
          {QR_BACKGROUNDS.map((background) => (
            <button
              key={background.value}
              type="button"
              title={t(background.name)}
              aria-label={t(background.name)}
              aria-pressed={
                !design.transparentBackground && design.background === background.value
              }
              onClick={() =>
                patchDesign({ background: background.value, transparentBackground: false })
              }
              style={{ background: background.value }}
              className="size-8 rounded-lg ring-1 ring-inset ring-black/12 transition-all duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:scale-105 aria-pressed:ring-2 aria-pressed:ring-ring aria-pressed:ring-offset-2 aria-pressed:ring-offset-card"
            />
          ))}
          <ColorControl
            label={t("style.background.custom")}
            compact
            value={design.background}
            onChange={(color) => patchDesign({ background: color, transparentBackground: false })}
            swatches={QR_SWATCHES}
            className="size-8 p-0"
          />
        </div>
        <SwitchControl
          label={t("style.background.transparent")}
          hint={t("style.background.transparent.hint")}
          checked={design.transparentBackground}
          onChange={(checked) => patchDesign({ transparentBackground: checked })}
        />
      </ControlStack>

      <Separator />

      <ControlStack
        label={t("style.errorCorrection.title")}
        hint={t("style.errorCorrection.hint")}
      >
        <Select
          items={ERROR_CORRECTION_LEVELS.map((level) => ({
            value: level.id,
            label: `${t(level.label)} — ${t(level.detail)}`,
          }))}
          value={design.errorCorrection}
          onValueChange={(next) =>
            patchDesign({
              errorCorrection: next as typeof design.errorCorrection,
            })
          }
        >
          <SelectTrigger className="w-full">
            <span className="flex items-center gap-2">
              <ShieldCheck className="size-3.5 text-muted-foreground" />
              <SelectValue />
            </span>
          </SelectTrigger>
          <SelectContent>
            {ERROR_CORRECTION_LEVELS.map((level) => (
              <SelectItem key={level.id} value={level.id}>
                <span className="flex items-center gap-2">
                  <span className="font-mono text-[0.65rem] text-muted-foreground">
                    {level.id}
                  </span>
                  {t(level.label)} — {t(level.detail)}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <SliderControl
          label={t("style.quietZone.title")}
          hint={t("style.quietZone.hint")}
          value={design.margin}
          min={0}
          max={40}
          suffix=" px"
          onChange={(margin) => patchDesign({ margin })}
        />
      </ControlStack>

      <div className="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/30 p-2.5 text-[0.68rem] text-muted-foreground">
        <Palette className="mt-0.5 size-3.5 shrink-0" />
        <p>
          {t("style.paletteNote")}
        </p>
      </div>
    </div>
  );
}

/** Panneau Style du code-barres 1D : barres, fond, géométrie et texte. */
function BarcodeStyle({
  barcode,
  design,
}: {
  barcode: BarcodeDesign;
  design: QrDesign;
}) {
  const { patchBarcode, patchDesign } = useBuilder();
  const t = useT();

  return (
    <div className="space-y-5">
      <ControlStack label={t("style.barColor.title")}>
        <div className="space-y-3">
          <ColorControl
            label={t("style.barColor.title")}
            value={barcode.barColor}
            onChange={(color) => patchBarcode({ barColor: color })}
            swatches={QR_SWATCHES}
            className="w-full justify-between"
          />
          <SwatchRail
            value={barcode.barColor}
            onChange={(color) => patchBarcode({ barColor: color })}
            swatches={QR_SWATCHES}
          />
        </div>
      </ControlStack>

      <Separator />

      <ControlStack label={t("style.background.title")}>
        <div className="flex flex-wrap gap-2">
          {QR_BACKGROUNDS.map((background) => (
            <button
              key={background.value}
              type="button"
              title={t(background.name)}
              aria-label={t(background.name)}
              aria-pressed={
                !design.transparentBackground && design.background === background.value
              }
              onClick={() =>
                patchDesign({ background: background.value, transparentBackground: false })
              }
              style={{ background: background.value }}
              className="size-8 rounded-lg ring-1 ring-inset ring-black/12 transition-all duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:scale-105 aria-pressed:ring-2 aria-pressed:ring-ring aria-pressed:ring-offset-2 aria-pressed:ring-offset-card"
            />
          ))}
          <ColorControl
            label={t("style.background.custom")}
            compact
            value={design.background}
            onChange={(color) => patchDesign({ background: color, transparentBackground: false })}
            swatches={QR_SWATCHES}
            className="size-8 p-0"
          />
        </div>
        <SwitchControl
          label={t("style.background.transparent")}
          hint={t("style.background.transparent.hintBarcode")}
          checked={design.transparentBackground}
          onChange={(checked) => patchDesign({ transparentBackground: checked })}
        />
      </ControlStack>

      <Separator />

      <ControlStack
        label={t("style.geometry.title")}
        hint={t("style.geometry.hint")}
      >
        <SliderControl
          label={t("style.barWidth.title")}
          value={barcode.barWidth}
          min={1}
          max={6}
          suffix=" px"
          onChange={(barWidth) => patchBarcode({ barWidth })}
        />
        <SliderControl
          label={t("style.barHeight.title")}
          value={barcode.barHeight}
          min={60}
          max={240}
          step={5}
          suffix=" px"
          onChange={(barHeight) => patchBarcode({ barHeight })}
        />
        <SliderControl
          label={t("style.quietZone.title")}
          hint={t("style.quietZone.hintBarcode")}
          value={barcode.margin}
          min={0}
          max={40}
          suffix=" px"
          onChange={(margin) => patchBarcode({ margin })}
        />
      </ControlStack>

      <Separator />

      <ControlStack label={t("style.text.title")}>
        <SwitchControl
          label={t("style.showValue.title")}
          hint={t("style.showValue.hint")}
          checked={barcode.showValue}
          onChange={(showValue) => patchBarcode({ showValue })}
        />
        {barcode.showValue ? (
          <div className="space-y-4 animate-fade-in">
            <SliderControl
              label={t("style.textSize.title")}
              value={barcode.fontSize}
              min={10}
              max={32}
              suffix=" px"
              onChange={(fontSize) => patchBarcode({ fontSize })}
            />
            <SliderControl
              label={t("style.textMargin.title")}
              value={barcode.textMargin}
              min={0}
              max={20}
              suffix=" px"
              onChange={(textMargin) => patchBarcode({ textMargin })}
            />
          </div>
        ) : null}
      </ControlStack>

      <div className="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/30 p-2.5 text-[0.68rem] text-muted-foreground">
        <Palette className="mt-0.5 size-3.5 shrink-0" />
        <p>
          {t("style.printNote")}
        </p>
      </div>
    </div>
  );
}
