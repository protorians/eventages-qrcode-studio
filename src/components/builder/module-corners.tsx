import {
  ColorControl,
  ControlStack,
  SectionTitle,
  SelectableTile,
  SwitchControl,
} from "@/components/builder/controls";
import { CornerPreview } from "@/components/builder/previews";
import { Separator } from "@/components/ui/separator";
import {
  CORNER_DOT_STYLES,
  CORNER_SQUARE_STYLES,
} from "@/lib/qr-design";
import { useBuilder } from "@/lib/builder-store";

/** Onglet « Coins » : marqueurs de position extérieurs et centraux. */
export function ModuleCorners() {
  const { state, patchDesign } = useBuilder();
  const { design } = state;

  const previewColor = design.cornersMatchBody
    ? design.dotsColorMode === "gradient"
      ? design.dotsGradientFrom
      : design.dotsColor
    : design.cornerSquareColor;

  return (
    <div className="space-y-5">
      <SwitchControl
        label="Coins assortis au corps"
        hint="Reprend automatiquement la forme et les couleurs des modules du QR."
        checked={design.cornersMatchBody}
        onChange={(checked) => patchDesign({ cornersMatchBody: checked })}
      />

      <div
        className="grid grid-cols-3 gap-3 animate-fade-in"
        key={design.cornersMatchBody ? "matched" : "custom"}
      >
        {design.cornersMatchBody ? (
          <>
            <CornerSwatch label="Coin extérieur" color={previewColor} />
            <CornerSwatch label="Centre" color={previewColor} />
            <CornerSwatch label="Fond" color={design.background} />
          </>
        ) : (
          <>
            <CornerSwatch label="Coin extérieur" color={design.cornerSquareColor} />
            <CornerSwatch label="Centre" color={design.cornerDotColor} />
            <CornerSwatch label="Fond" color={design.background} />
          </>
        )}
      </div>

      <Separator />

      <ControlStack
        label="Forme du coin extérieur"
        hint="Le marqueur extérieur encadre les trois repères de détection."
      >
        <div className="grid grid-cols-3 gap-2">
          {CORNER_SQUARE_STYLES.map((style) => (
            <SelectableTile
              key={style.id}
              selected={design.cornerSquareType === style.id}
              onSelect={() =>
                patchDesign({ cornerSquareType: style.id, cornersMatchBody: false })
              }
              title={style.label}
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

      <ControlStack label="Forme du centre" hint="Le point central du repère de détection.">
        <div className="grid grid-cols-4 gap-2">
          {CORNER_DOT_STYLES.map((style) => (
            <SelectableTile
              key={style.id}
              selected={design.cornerDotType === style.id}
              onSelect={() =>
                patchDesign({ cornerDotType: style.id, cornersMatchBody: false })
              }
              title={style.label}
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
          <SectionTitle>Couleurs personnalisées</SectionTitle>
          <ControlStack label="Coin extérieur">
            <ColorControl
              label="Couleur du coin extérieur"
              value={design.cornerSquareColor}
              onChange={(color) => patchDesign({ cornerSquareColor: color })}
              className="w-full justify-between"
            />
          </ControlStack>
          <ControlStack label="Centre">
            <ColorControl
              label="Couleur du centre"
              value={design.cornerDotColor}
              onChange={(color) => patchDesign({ cornerDotColor: color })}
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
