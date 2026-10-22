import {
  ColorControl,
  ControlStack,
  SectionTitle,
  SelectableTile,
  SwitchControl,
} from "@/components/ui/controls";
import { CornerPreview } from "@/components/builder/previews";
import { Separator } from "@/components/ui/separator";
import {
  CORNER_DOT_STYLES,
  CORNER_SQUARE_STYLES,
  QR_SWATCHES,
} from "@/lib/qr-design";
import { useBuilder } from "@/lib/builder-store";
import { useT } from "@/lib/i18n";

/** Onglet « Coins » : marqueurs de position extérieurs et centraux. */
export function ModuleCorners() {
  const { state, patchDesign } = useBuilder();
  const t = useT();
  const { design } = state;

  const previewColor = design.cornersMatchBody
    ? design.dotsColorMode === "gradient"
      ? design.dotsGradientFrom
      : design.dotsColor
    : design.cornerSquareColor;

  return (
    <div className="space-y-5">
      <SwitchControl
        label={t("corners.match.label")}
        hint={t("corners.match.description")}
        checked={design.cornersMatchBody}
        onChange={(checked) => patchDesign({ cornersMatchBody: checked })}
      />

      <div
        className="grid grid-cols-3 gap-3 animate-fade-in"
        key={design.cornersMatchBody ? "matched" : "custom"}
      >
        {design.cornersMatchBody ? (
          <>
            <CornerSwatch label={t("corners.outerCorner")} color={previewColor} />
            <CornerSwatch label={t("corners.center")} color={previewColor} />
            <CornerSwatch label={t("corners.background")} color={design.background} />
          </>
        ) : (
          <>
            <CornerSwatch label={t("corners.outerCorner")} color={design.cornerSquareColor} />
            <CornerSwatch label={t("corners.center")} color={design.cornerDotColor} />
            <CornerSwatch label={t("corners.background")} color={design.background} />
          </>
        )}
      </div>

      <Separator />

      <ControlStack
        label={t("corners.outerShape.label")}
        hint={t("corners.outerShape.description")}
      >
        <div className="grid grid-cols-3 gap-2">
          {CORNER_SQUARE_STYLES.map((style) => (
            <SelectableTile
              key={style.id}
              selected={design.cornerSquareType === style.id}
              onSelect={() =>
                patchDesign({ cornerSquareType: style.id, cornersMatchBody: false })
              }
              title={t(style.label)}
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-muted/60 p-1.5 text-foreground/80">
                <CornerPreview
                  squareType={style.id}
                  dotType={design.cornerDotType}
                />
              </span>
            </SelectableTile>
          ))}
        </div>
      </ControlStack>

      <ControlStack
        label={t("corners.centerShape.label")}
        hint={t("corners.centerShape.description")}
      >
        <div className="grid grid-cols-4 gap-2">
          {CORNER_DOT_STYLES.map((style) => (
            <SelectableTile
              key={style.id}
              selected={design.cornerDotType === style.id}
              onSelect={() =>
                patchDesign({ cornerDotType: style.id, cornersMatchBody: false })
              }
              title={t(style.label)}
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-muted/60 p-1 text-foreground/80">
                <CornerPreview
                  squareType={design.cornerSquareType}
                  dotType={style.id}
                />
              </span>
            </SelectableTile>
          ))}
        </div>
      </ControlStack>

      {!design.cornersMatchBody ? (
        <div className="space-y-3 animate-fade-in">
          <Separator />
          <SectionTitle>{t("corners.customColors.title")}</SectionTitle>
          <ControlStack label={t("corners.outerCorner")}>
            <ColorControl
              label={t("corners.outerColor.label")}
              value={design.cornerSquareColor}
              onChange={(color) => patchDesign({ cornerSquareColor: color })}
              swatches={QR_SWATCHES}
              className="w-full justify-between"
            />
          </ControlStack>
          <ControlStack label={t("corners.center")}>
            <ColorControl
              label={t("corners.centerColor.label")}
              value={design.cornerDotColor}
              onChange={(color) => patchDesign({ cornerDotColor: color })}
              swatches={QR_SWATCHES}
              className="w-full justify-between"
            />
          </ControlStack>
        </div>
      ) : null}
    </div>
  );
}

function CornerSwatch({ label, color }: { label: string; color: string }) {
  return (
    <div className="space-y-1.5 rounded-xl border border-border/60 bg-card/40 p-2 text-center">
      <div
        className="mx-auto h-6 w-full rounded-md ring-1 ring-inset ring-black/10"
        style={{ background: color }}
      />
      <span className="block text-[0.62rem] text-muted-foreground">{label}</span>
    </div>
  );
}
