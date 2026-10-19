import { CheckCircle2, RotateCcw, ShieldAlert, Sparkles, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBuilder } from "@/lib/builder-store";
import { analyzeDesign, type ScanIssue } from "@/lib/qr-analysis";
import { cn } from "@/lib/utils";

const LEVEL_STYLES: Record<ScanIssue["level"], { ring: string; text: string; icon: typeof CheckCircle2 }> = {
  ok: { ring: "text-emerald-500", text: "text-foreground", icon: CheckCircle2 },
  warn: { ring: "text-amber-500", text: "text-foreground", icon: TriangleAlert },
  danger: { ring: "text-destructive", text: "text-foreground", icon: ShieldAlert },
};

/** Carte de contrôle : lisibilité, corrections en un clic (spec 004, FR-9/FR-11). */
export function TipsCard() {
  const { state, dispatch, patchDesign, payload, progress } = useBuilder();
  const { issues, score } = analyzeDesign(state.design, payload.trim().length > 0 && progress === 100);
  const actionable = issues.filter((issue) => issue.fix);
  const others = issues.filter((issue) => !issue.fix);

  const circumference = 2 * Math.PI * 18;
  const offset = circumference * (1 - score / 100);

  return (
    <div className="space-y-3 rounded-2xl border border-border/70 bg-card/60 p-3">
      <div className="flex items-center gap-3">
        <div className="relative size-12 shrink-0">
          <svg viewBox="0 0 44 44" className="size-full -rotate-90">
            <circle
              cx="22"
              cy="22"
              r="18"
              fill="none"
              strokeWidth="4"
              className="stroke-muted"
            />
            <circle
              cx="22"
              cy="22"
              r="18"
              fill="none"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className={cn(
                "transition-[stroke-dashoffset] duration-700 ease-out",
                score > 85 ? "stroke-emerald-500" : score > 65 ? "stroke-amber-500" : "stroke-destructive",
              )}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center font-mono text-[0.65rem] font-semibold tabular-nums">
            {score}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[0.78rem] font-medium">
            <Sparkles className="size-3.5 text-primary" />
            Contrôle de lisibilité
          </p>
          <p className="text-[0.66rem] text-muted-foreground">
            Vérifie contraste, logo et robustesse avant impression.
          </p>
        </div>
      </div>

      {actionable.length > 0 ? (
        <div className="space-y-2">
          {actionable.map((issue) => {
            const style = LEVEL_STYLES[issue.level];
            const Icon = style.icon;
            return (
              <div
                key={issue.id}
                className="animate-fade-in space-y-1.5 rounded-xl border border-border/60 bg-background/60 p-2.5"
              >
                <div className="flex items-start gap-2">
                  <Icon className={cn("mt-0.5 size-3.5 shrink-0", style.ring)} />
                  <div className="min-w-0">
                    <p className="text-[0.72rem] font-medium">{issue.title}</p>
                    <p className="text-[0.64rem] leading-relaxed text-muted-foreground">
                      {issue.detail}
                    </p>
                  </div>
                </div>
                {issue.fix ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="xs"
                    className="w-full"
                    onClick={() => patchDesign(issue.fix!.patch)}
                  >
                    {issue.fix.label}
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {others.length > 0 ? (
        <ul className="space-y-1">
          {others.map((issue) => (
            <li key={issue.id} className="flex items-center gap-1.5 text-[0.64rem] text-muted-foreground">
              <CheckCircle2 className="size-3 shrink-0 text-emerald-500" />
              {issue.title}
            </li>
          ))}
        </ul>
      ) : null}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => dispatch({ type: "resetDesign" })}
      >
        <RotateCcw />
        Réinitialiser le design
      </Button>
    </div>
  );
}
