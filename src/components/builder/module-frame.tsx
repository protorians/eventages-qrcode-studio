import { Frame, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  ColorControl,
  ControlStack,
  SectionTitle,
  SelectableTile,
  SliderControl,
} from "@/components/ui/controls";
import { FramePreview } from "@/components/builder/previews";
import { FRAMES, FRAMES_BY_ID, QR_SWATCHES } from "@/lib/qr-design";
import { useBuilder } from "@/lib/builder-store";
import { cn } from "@/lib/utils";

/** Onglet « Cadre » : habillage, libellé et couleurs (spec 004, FR-2). */
export function ModuleFrame() {
  const { state, patchDesign } = useBuilder();
  const { design } = state;
  const frame = FRAMES_BY_ID[design.frameId] ?? FRAMES_BY_ID.none;
  const hasFrame = frame.id !== "none";

  return (
    <div className="space-y-5">
      <ControlStack
        label="Cadres disponibles"
        hint="Les cadres numérotés reprennent la bibliothèque du studio ; aucun n'altère la lisibilité."
      >
        <div className="grid grid-cols-3 gap-2">
          <SelectableTile
            selected={!hasFrame}
            onSelect={() => patchDesign({ frameId: "none" })}
            title="Aucun"
            className="aspect-[4/3] justify-center"
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
              <Ban className="size-4" />
            </span>
          </SelectableTile>
          {FRAMES.filter((candidate) => candidate.id !== "none").map((candidate) => (
            <SelectableTile
              key={candidate.id}
              selected={design.frameId === candidate.id}
              onSelect={() => patchDesign({ frameId: candidate.id })}
              title={candidate.name.replace("Frame ", "#")}
              className="aspect-[4/3] justify-center"
            >
              <span className="flex size-11 items-center justify-center rounded-lg bg-muted/60 p-1.5">
                <FramePreview
                  radius={candidate.radius}
                  borderWidth={candidate.borderWidth}
                  accentBar={candidate.accentBar}
                  labelPosition={candidate.labelPosition}
                  className="text-foreground/75"
                />
              </span>
            </SelectableTile>
          ))}
        </div>
      </ControlStack>

      <div
        className={cn(
          "space-y-5 transition-opacity duration-300",
          !hasFrame && "pointer-events-none opacity-50",
        )}
      >
        <Separator />

        <ControlStack
          label="Texte du cadre"
          hint="Affiché sous (ou au-dessus) du code, il guide l'utilisateur."
        >
          <Input
            value={design.frameText}
            maxLength={28}
            disabled={!hasFrame}
            onChange={(event) => patchDesign({ frameText: event.currentTarget.value })}
            placeholder="Scannez-moi"
            className="text-[0.8rem]"
          />
        </ControlStack>

        <SliderControl
          label="Taille du texte"
          value={design.frameTextSize}
          min={9}
          max={22}
          suffix=" px"
          onChange={(frameTextSize) => patchDesign({ frameTextSize })}
        />

        <div className="space-y-3">
          <SectionTitle>Couleurs du cadre</SectionTitle>
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[0.78rem] text-muted-foreground">Couleur d&apos;accent</Label>
              <ColorControl
                label="Couleur du cadre"
                value={design.frameColor}
                onChange={(frameColor) => patchDesign({ frameColor })}
                swatches={QR_SWATCHES}
                className="w-full justify-between"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[0.78rem] text-muted-foreground">Texte</Label>
              <ColorControl
                label="Couleur du texte"
                value={design.frameTextColor}
                onChange={(frameTextColor) => patchDesign({ frameTextColor })}
                swatches={QR_SWATCHES}
                className="w-full justify-between"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[0.78rem] text-muted-foreground">Fond du cadre</Label>
              <ColorControl
                label="Fond du cadre"
                value={design.frameBackground}
                onChange={(frameBackground) => patchDesign({ frameBackground })}
                swatches={QR_SWATCHES}
                className="w-full justify-between"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/30 p-2.5 text-[0.68rem] text-muted-foreground">
        <Frame className="mt-0.5 size-3.5 shrink-0" />
        <p>
          Le cadre est composé lors de l&apos;export : le fichier téléchargé contient le
          QR, l&apos;habillage et le texte.
        </p>
      </div>

      <Button
        type="button"
        variant="ghost"
        className="w-full"
        onClick={() =>
          patchDesign({
            frameId: "none",
            frameText: "Scannez-moi",
            frameColor: "#e2e8f0",
            frameBackground: "#ffffff",
            frameTextColor: "#334155",
          })
        }
      >
        Retirer le cadre
      </Button>
    </div>
  );
}
