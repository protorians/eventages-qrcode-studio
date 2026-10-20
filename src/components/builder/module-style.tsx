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
} from "@/components/builder/controls";
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
  type QrDesign,
} from "@/lib/qr-design";
import type { BarcodeDesign } from "@/lib/barcode";
import { useBuilder } from "@/lib/builder-store";

/** Onglet « Style » : forme des modules, couleurs, fond, robustesse. */
export function ModuleStyle() {
  const { state, patchDesign, type } = useBuilder();
  const { design } = state;

  if (type.id === "barcode") {
    return <BarcodeStyle barcode={state.barcode} design={design} />;
  }

  return (
    <div className="space-y-5">
      <ControlStack
        label="Forme des modules"
        hint="Chaque forme reste lisible : le moteur conserve les zones de silence et les marqueurs."
      >
        <div className="grid grid-cols-3 gap-2">
          {DOT_STYLES.map((style) => (
            <SelectableTile
              key={style.id}
              selected={design.dotsType === style.id}
              onSelect={() => patchDesign({ dotsType: style.id })}
              title={style.label}
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-muted/60 p-1.5 text-foreground/80">
                <ModulePatternPreview dotType={style.id} />
              </span>
            </SelectableTile>
          ))}
        </div>
      </ControlStack>

      <Separator />

      <ControlStack label="Couleur du corps">
        <SegmentedControl
          value={design.dotsColorMode}
          onChange={(mode) => patchDesign({ dotsColorMode: mode })}
          options={[
            { value: "solid", label: "Uni" },
            { value: "gradient", label: "Dégradé" },
          ]}
        />
        {design.dotsColorMode === "solid" ? (
          <div className="space-y-3 animate-fade-in">
            <ColorControl
              label="Couleur des modules"
              value={design.dotsColor}
              onChange={(color) => patchDesign({ dotsColor: color })}
              className="w-full justify-between"
            />
            <SwatchRail
              value={design.dotsColor}
              onChange={(color) => patchDesign({ dotsColor: color })}
            />
          </div>
        ) : (
          <div className="animate-fade-in">
            <GradientEditor
              from={design.dotsGradientFrom}
              to={design.dotsGradientTo}
              rotation={design.dotsGradientRotation}
              presets={GRADIENT_PRESETS}
              onFromChange={(color) => patchDesign({ dotsGradientFrom: color })}
              onToChange={(color) => patchDesign({ dotsGradientTo: color })}
              onRotationChange={(angle) => patchDesign({ dotsGradientRotation: angle })}
            />
          </div>
        )}
      </ControlStack>

      <Separator />

      <ControlStack label="Fond">
        <div className="flex flex-wrap gap-2">
          {QR_BACKGROUNDS.map((background) => (
            <button
              key={background.value}
              type="button"
              title={background.name}
              aria-label={background.name}
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
            label="Fond personnalisé"
            compact
            value={design.background}
            onChange={(color) => patchDesign({ background: color, transparentBackground: false })}
            className="size-8 p-0"
          />
        </div>
        <SwitchControl
          label="Fond transparent"
          hint="Le QR sans fond s'adapte au support, mais le contraste dépend alors de l'impression."
          checked={design.transparentBackground}
          onChange={(checked) => patchDesign({ transparentBackground: checked })}
        />
      </ControlStack>

      <Separator />

      <ControlStack
        label="Robustesse"
        hint="Le niveau de correction détermine la part de modules récupérables si le code est abîmé."
      >
        <Select
          items={ERROR_CORRECTION_LEVELS.map((level) => ({
            value: level.id,
            label: `${level.label} — ${level.detail}`,
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
                  {level.label} — {level.detail}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <SliderControl
          label="Zone de silence"
          hint="Marge blanche autour du code : indispensable pour un scan fiable en impression."
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
          Les couleurs appliquées ici restent dans la palette du studio ; ajustez-les au
          besoin depuis le sélecteur hexadécimal.
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

  return (
    <div className="space-y-5">
      <ControlStack label="Couleur des barres">
        <div className="space-y-3">
          <ColorControl
            label="Couleur des barres"
            value={barcode.barColor}
            onChange={(color) => patchBarcode({ barColor: color })}
            className="w-full justify-between"
          />
          <SwatchRail
            value={barcode.barColor}
            onChange={(color) => patchBarcode({ barColor: color })}
          />
        </div>
      </ControlStack>

      <Separator />

      <ControlStack label="Fond">
        <div className="flex flex-wrap gap-2">
          {QR_BACKGROUNDS.map((background) => (
            <button
              key={background.value}
              type="button"
              title={background.name}
              aria-label={background.name}
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
            label="Fond personnalisé"
            compact
            value={design.background}
            onChange={(color) => patchDesign({ background: color, transparentBackground: false })}
            className="size-8 p-0"
          />
        </div>
        <SwitchControl
          label="Fond transparent"
          hint="Sans fond opaque, le contraste dépend du support d'impression."
          checked={design.transparentBackground}
          onChange={(checked) => patchDesign({ transparentBackground: checked })}
        />
      </ControlStack>

      <Separator />

      <ControlStack
        label="Géométrie"
        hint="Des barres larges et hautes se scannent de plus loin, au laser comme à la caméra."
      >
        <SliderControl
          label="Largeur des barres"
          value={barcode.barWidth}
          min={1}
          max={6}
          suffix=" px"
          onChange={(barWidth) => patchBarcode({ barWidth })}
        />
        <SliderControl
          label="Hauteur des barres"
          value={barcode.barHeight}
          min={60}
          max={240}
          step={5}
          suffix=" px"
          onChange={(barHeight) => patchBarcode({ barHeight })}
        />
        <SliderControl
          label="Zone de silence"
          hint="Marge autour des barres : indispensable à la lecture par les lecteurs."
          value={barcode.margin}
          min={0}
          max={40}
          suffix=" px"
          onChange={(margin) => patchBarcode({ margin })}
        />
      </ControlStack>

      <Separator />

      <ControlStack label="Texte lisible">
        <SwitchControl
          label="Afficher la valeur"
          hint="Chiffres sous les barres — la saisie manuelle de secours en caisse."
          checked={barcode.showValue}
          onChange={(showValue) => patchBarcode({ showValue })}
        />
        {barcode.showValue ? (
          <div className="space-y-4 animate-fade-in">
            <SliderControl
              label="Taille du texte"
              value={barcode.fontSize}
              min={10}
              max={32}
              suffix=" px"
              onChange={(fontSize) => patchBarcode({ fontSize })}
            />
            <SliderControl
              label="Marge du texte"
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
          Pour l'impression, gardez des barres sombres sur fond clair : les lecteurs
          laser ne voient que le contraste.
        </p>
      </div>
    </div>
  );
}
