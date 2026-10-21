import { BadgeCheck, ImageOff, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ControlStack,
  FileControl,
  SectionTitle,
  SliderControl,
  SwitchControl,
} from "@/components/ui/controls";
import { LOGO_PRESETS } from "@/lib/logo-presets";
import { useBuilder } from "@/lib/builder-store";
import { cn } from "@/lib/utils";

/** Onglet « Logo » : téléversement local ou logo prédéfini (spec 004, FR-6). */
export function ModuleLogo() {
  const { state, patchDesign } = useBuilder();
  const { design } = state;
  const weakProtection = Boolean(design.logo) && design.errorCorrection === "L";

  return (
    <div className="space-y-5">
      <ControlStack
        label="Logo central"
        hint="Un fichier JPG, PNG ou SVG reste stocké localement dans le projet."
      >
        <FileControl
          value={design.logo ?? ""}
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          label="Ajouter un logo"
          preview
          hint="Format carré recommandé, 512 px minimum. Taille conseillée : moins de 2 Mo."
          onChange={(value) => patchDesign({ logo: value || null })}
        />
      </ControlStack>

      {design.logo ? (
        <Alert className="animate-fade-in">
          {weakProtection ? <TriangleAlert className="text-destructive" /> : <BadgeCheck />}
          <AlertDescription>
            {weakProtection
              ? "Correction d'erreur trop basse avec un logo : passez au niveau « Élevé » ou « Maximal »."
              : "Le logo est inséré avec une marge de protection ; les modules masqués sont compensés par la correction d'erreur."}
          </AlertDescription>
        </Alert>
      ) : null}

      <Separator />

      <ControlStack label="Bibliothèque de logos" hint="Préréglages vectoriels, sans dépendance externe.">
        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => patchDesign({ logo: null })}
            aria-pressed={!design.logo}
            className={cn(
              "flex aspect-square items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 text-muted-foreground transition-all duration-300 hover:-translate-y-0.5 hover:border-border hover:bg-accent/60",
              "aria-pressed:border-primary/50 aria-pressed:bg-primary/10 aria-pressed:text-primary",
            )}
            title="Aucun logo"
          >
            <ImageOff className="size-4" />
          </button>
          {LOGO_PRESETS.map((preset) => {
            const active = design.logo === preset.dataUrl;
            return (
              <button
                key={preset.id}
                type="button"
                title={preset.name}
                aria-label={preset.name}
                aria-pressed={active}
                onClick={() => patchDesign({ logo: preset.dataUrl })}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-xl border border-border/70 bg-card/50 p-2 transition-all duration-300 hover:-translate-y-0.5 hover:border-border hover:bg-accent/60",
                  "aria-pressed:border-primary/50 aria-pressed:bg-primary/10 aria-pressed:ring-2 aria-pressed:ring-primary/25",
                )}
              >
                <img src={preset.dataUrl} alt="" className="size-full rounded-lg" />
              </button>
            );
          })}
        </div>
      </ControlStack>

      <Separator />

      <div className="space-y-4">
        <SectionTitle hint="Ces réglages n'ont d'effet qu'avec un logo actif.">
          Réglages de protection
        </SectionTitle>
        <SliderControl
          label="Taille du logo"
          value={Math.round(design.logoSize * 100)}
          min={20}
          max={50}
          suffix=" %"
          hint="Au-delà de 42 %, le logo empiète sur les repères de synchronisation."
          onChange={(value) => patchDesign({ logoSize: value / 100 })}
        />
        <SliderControl
          label="Marge de protection"
          value={design.logoMargin}
          min={0}
          max={16}
          suffix=" px"
          onChange={(logoMargin) => patchDesign({ logoMargin })}
        />
        <SwitchControl
          label="Masquer les modules derrière le logo"
          hint="Dégage un espace propre autour du logo pour un rendu plus net."
          checked={design.hideBackgroundDots}
          onChange={(checked) => patchDesign({ hideBackgroundDots: checked })}
          disabled={!design.logo}
        />
      </div>

      <Button
        type="button"
        variant="secondary"
        className="w-full"
        disabled={!design.logo}
        onClick={() => patchDesign({ logo: null })}
      >
        Retirer le logo
      </Button>
    </div>
  );
}
