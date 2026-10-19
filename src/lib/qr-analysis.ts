import type { ErrorCorrectionLevel } from "qr-code-styling";
import type { QrDesign } from "@/lib/qr-design";
import { bodyColors } from "@/lib/qr-options";

function hexToRgb(hex: string): [number, number, number] | null {
  const value = hex.trim().replace("#", "");
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(value)) return null;
  const full =
    value.length === 3
      ? value
          .split("")
          .map((char) => char + char)
          .join("")
      : value;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function channel(value: number): number {
  const ratio = value / 255;
  return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 1;
  const [r, g, b] = rgb;
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const light = Math.max(la, lb);
  const dark = Math.min(la, lb);
  return (light + 0.05) / (dark + 0.05);
}

export type ScanIssue = {
  id: string;
  level: "ok" | "warn" | "danger";
  title: string;
  detail: string;
  /** Correctif proposé en un clic (spec 004, FR-9). */
  fix?: { label: string; patch: Partial<QrDesign> };
};

const ERROR_ORDER: ErrorCorrectionLevel[] = ["L", "M", "Q", "H"];

export function analyzeDesign(design: QrDesign, contentReady: boolean): {
  issues: ScanIssue[];
  score: number;
} {
  const issues: ScanIssue[] = [];
  const colors = bodyColors(design);
  const background = design.transparentBackground ? "#ffffff" : design.background;

  // Le pire cas d'un dégradé est la borne de couleur la plus proche du fond.
  const effectiveRatio = Math.min(
    contrastRatio(colors.from, background),
    contrastRatio(colors.to, background),
  );

  if (effectiveRatio < 2.5) {
    issues.push({
      id: "contrast-low",
      level: "danger",
      title: "Contraste trop faible",
      detail:
        "Les modules se confondent avec le fond : la détection peut échouer sur papier ou écran peu lumineux.",
      fix: {
        label: "Assombrir le corps",
        patch: {
          dotsColorMode: "solid",
          dotsColor: "#0f172a",
          dotsGradientFrom: "#334155",
          dotsGradientTo: "#0f172a",
        },
      },
    });
  } else if (effectiveRatio < 4) {
    issues.push({
      id: "contrast-medium",
      level: "warn",
      title: "Contraste juste",
      detail: "Privilégiez un écart plus marqué entre le corps et le fond pour l'impression.",
      fix: {
        label: "Renforcer",
        patch: { dotsColorMode: "solid", dotsColor: "#111827" },
      },
    });
  } else {
    issues.push({
      id: "contrast-ok",
      level: "ok",
      title: "Contraste conforme",
      detail: `Ratio ${effectiveRatio.toFixed(1)}:1 — lisible par la plupart des lecteurs.`,
    });
  }

  if (design.logo) {
    if (ERROR_ORDER.indexOf(design.errorCorrection) < ERROR_ORDER.indexOf("Q")) {
      issues.push({
        id: "logo-ecc",
        level: "warn",
        title: "Logo sans marge de récupération",
        detail:
          "Un logo masque des modules : passez la correction d'erreur au moins à « Élevé » (Q) pour préserver la lecture.",
        fix: { label: "Passer en Q", patch: { errorCorrection: "Q" } },
      });
    }
    if (design.logoSize > 0.42) {
      issues.push({
        id: "logo-size",
        level: "warn",
        title: "Logo volumineux",
        detail:
          "Au-delà de 42 % de la largeur, le logo empiète sur les zones de synchronisation du code.",
        fix: { label: "Réduire à 38 %", patch: { logoSize: 0.38 } },
      });
    }
  }

  if (design.transparentBackground) {
    issues.push({
      id: "transparent",
      level: "warn",
      title: "Fond transparent",
      detail:
        "Sans fond opaque, le contraste dépend du support d'impression. Prévoyez un fond clair à l'usage.",
      fix: { label: "Ajouter un fond blanc", patch: { transparentBackground: false, background: "#ffffff" } },
    });
  }

  if (!contentReady) {
    issues.push({
      id: "content",
      level: "warn",
      title: "Contenu incomplet",
      detail: "Complétez les champs obligatoires : le code affiché utilise les données actuelles.",
    });
  }

  const penalties = issues.reduce((total, issue) => {
    if (issue.level === "danger") return total + 34;
    if (issue.level === "warn") return total + 12;
    return total;
  }, 0);

  return { issues, score: Math.max(12, 100 - penalties) };
}

export function scanLabel(
  design: QrDesign,
  payload: string,
): { level: "ok" | "warn"; label: string } {
  const { issues, score } = analyzeDesign(design, payload.trim().length > 0);
  const level = issues.some((issue) => issue.level === "danger") ? "warn" : "ok";
  return {
    level,
    label: level === "ok" ? `Prêt à scanner · ${score}/100` : `À revoir · ${score}/100`,
  };
}

