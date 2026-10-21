import type {
  CornerDotType,
  CornerSquareType,
  DotType,
  ErrorCorrectionLevel,
} from "qr-code-styling";
import type { TranslationKey } from "@/lib/i18n/dictionaries/en";

/** Modèle de design d'un QR (spec 004, entité QrDesign). */
export type QrDesign = {
  dotsType: DotType;
  dotsColorMode: "solid" | "gradient";
  dotsColor: string;
  dotsGradientFrom: string;
  dotsGradientTo: string;
  dotsGradientRotation: number;

  cornersMatchBody: boolean;
  cornerSquareType: CornerSquareType;
  cornerDotType: CornerDotType;
  cornerSquareColor: string;
  cornerDotColor: string;

  background: string;
  transparentBackground: boolean;

  logo: string | null;
  logoSize: number;
  logoMargin: number;
  hideBackgroundDots: boolean;

  frameId: string;
  frameText: string;
  frameTextColor: string;
  frameTextSize: number;
  frameColor: string;
  frameBackground: string;

  errorCorrection: ErrorCorrectionLevel;
  margin: number;
};

export const DOT_STYLES: { id: DotType; label: TranslationKey }[] = [
  { id: "square", label: "design.label.square" },
  { id: "rounded", label: "design.label.rounded" },
  { id: "extra-rounded", label: "design.label.extraRounded" },
  { id: "dots", label: "design.label.dots" },
  { id: "classy", label: "design.label.classy" },
  { id: "classy-rounded", label: "design.label.classyRounded" },
];

export const CORNER_SQUARE_STYLES: { id: CornerSquareType; label: TranslationKey }[] = [
  { id: "square", label: "design.label.square" },
  { id: "extra-rounded", label: "design.label.rounded" },
  { id: "dot", label: "design.label.circle" },
  { id: "rounded", label: "design.label.soft" },
  { id: "classy", label: "design.label.classy" },
];

export const CORNER_DOT_STYLES: { id: CornerDotType; label: TranslationKey }[] = [
  { id: "square", label: "design.label.square" },
  { id: "dot", label: "design.label.dot" },
  { id: "rounded", label: "design.label.rounded" },
  { id: "extra-rounded", label: "design.label.extraRounded" },
];

export type QrFrame = {
  id: string;
  name: TranslationKey;
  radius: number;
  padding: number;
  borderWidth: number;
  borderStyle: "solid" | "dashed" | "none";
  labelPosition: "top" | "bottom" | "none";
  accentBar: boolean;
  ring: boolean;
  shadow: "none" | "soft" | "deep";
  innerLine: boolean;
};

export const FRAMES: QrFrame[] = [
  {
    id: "none",
    name: "design.frame.none.name",
    radius: 24,
    padding: 0,
    borderWidth: 0,
    borderStyle: "none",
    labelPosition: "none",
    accentBar: false,
    ring: false,
    shadow: "none",
    innerLine: false,
  },
  {
    id: "f0",
    name: "design.frame.f0.name",
    radius: 20,
    padding: 18,
    borderWidth: 0,
    borderStyle: "none",
    labelPosition: "none",
    accentBar: false,
    ring: false,
    shadow: "soft",
    innerLine: false,
  },
  {
    id: "f13",
    name: "design.frame.f13.name",
    radius: 22,
    padding: 20,
    borderWidth: 1,
    borderStyle: "solid",
    labelPosition: "bottom",
    accentBar: false,
    ring: false,
    shadow: "soft",
    innerLine: false,
  },
  {
    id: "f18",
    name: "design.frame.f18.name",
    radius: 16,
    padding: 18,
    borderWidth: 0,
    borderStyle: "none",
    labelPosition: "bottom",
    accentBar: true,
    ring: false,
    shadow: "deep",
    innerLine: false,
  },
  {
    id: "f21",
    name: "design.frame.f21.name",
    radius: 8,
    padding: 18,
    borderWidth: 2,
    borderStyle: "solid",
    labelPosition: "top",
    accentBar: false,
    ring: false,
    shadow: "none",
    innerLine: false,
  },
  {
    id: "f22",
    name: "design.frame.f22.name",
    radius: 28,
    padding: 22,
    borderWidth: 0,
    borderStyle: "none",
    labelPosition: "bottom",
    accentBar: true,
    ring: false,
    shadow: "soft",
    innerLine: false,
  },
  {
    id: "f30",
    name: "design.frame.f30.name",
    radius: 999,
    padding: 26,
    borderWidth: 2,
    borderStyle: "solid",
    labelPosition: "none",
    accentBar: false,
    ring: true,
    shadow: "none",
    innerLine: false,
  },
  {
    id: "f32",
    name: "design.frame.f32.name",
    radius: 14,
    padding: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    labelPosition: "bottom",
    accentBar: false,
    ring: false,
    shadow: "none",
    innerLine: false,
  },
  {
    id: "f40",
    name: "design.frame.f40.name",
    radius: 32,
    padding: 24,
    borderWidth: 0,
    borderStyle: "none",
    labelPosition: "bottom",
    accentBar: false,
    ring: false,
    shadow: "deep",
    innerLine: true,
  },
  {
    id: "f45",
    name: "design.frame.f45.name",
    radius: 12,
    padding: 20,
    borderWidth: 3,
    borderStyle: "solid",
    labelPosition: "top",
    accentBar: true,
    ring: false,
    shadow: "none",
    innerLine: false,
  },
  {
    id: "f48",
    name: "design.frame.f48.name",
    radius: 999,
    padding: 20,
    borderWidth: 1,
    borderStyle: "solid",
    labelPosition: "bottom",
    accentBar: false,
    ring: false,
    shadow: "soft",
    innerLine: false,
  },
  {
    id: "f51",
    name: "design.frame.f51.name",
    radius: 18,
    padding: 22,
    borderWidth: 2,
    borderStyle: "solid",
    labelPosition: "bottom",
    accentBar: true,
    ring: false,
    shadow: "deep",
    innerLine: true,
  },
];

export const FRAMES_BY_ID: Record<string, QrFrame> = Object.fromEntries(
  FRAMES.map((frame) => [frame.id, frame]),
);

export type ColorSwatch = { name: TranslationKey; value: string };

export const PALETTES: { id: string; name: string; colors: ColorSwatch[] }[] = [
  {
    id: "studio",
    name: "Studio",
    colors: [
      { name: "design.color.indigo", value: "#6366f1" },
      { name: "design.color.violet", value: "#8b5cf6" },
      { name: "design.color.fuchsia", value: "#d946ef" },
      { name: "design.color.rose", value: "#f43f5e" },
      { name: "design.color.amber", value: "#f59e0b" },
      { name: "design.color.emerald", value: "#10b981" },
      { name: "design.color.cyan", value: "#06b6d4" },
      { name: "design.color.slate", value: "#1e293b" },
    ],
  },
  {
    id: "pastel",
    name: "Pastel",
    colors: [
      { name: "design.color.lilac", value: "#c4b5fd" },
      { name: "design.color.sky", value: "#bae6fd" },
      { name: "design.color.mint", value: "#a7f3d0" },
      { name: "design.color.peach", value: "#fed7aa" },
      { name: "design.color.rose", value: "#fecdd3" },
      { name: "design.color.lemon", value: "#fef08a" },
      { name: "design.color.sand", value: "#e7e5e4" },
      { name: "design.color.ink", value: "#334155" },
    ],
  },
  {
    id: "bold",
    name: "Bold",
    colors: [
      { name: "design.color.black", value: "#0f172a" },
      { name: "design.color.red", value: "#dc2626" },
      { name: "design.color.orange", value: "#ea580c" },
      { name: "design.color.yellow", value: "#facc15" },
      { name: "design.color.green", value: "#16a34a" },
      { name: "design.color.blue", value: "#2563eb" },
      { name: "design.color.violet", value: "#7c3aed" },
      { name: "design.color.white", value: "#ffffff" },
    ],
  },
];

export const QR_SWATCHES: ColorSwatch[] = PALETTES.flatMap((palette) => palette.colors);

export const GRADIENT_PRESETS: { id: string; name: TranslationKey; from: string; to: string }[] = [
  { id: "sunset", name: "design.gradient.sunset", from: "#f97316", to: "#db2777" },
  { id: "ocean", name: "design.gradient.ocean", from: "#0ea5e9", to: "#4f46e5" },
  { id: "candy", name: "design.gradient.candy", from: "#a855f7", to: "#ec4899" },
  { id: "forest", name: "design.gradient.forest", from: "#22c55e", to: "#0f766e" },
  { id: "ember", name: "design.gradient.ember", from: "#facc15", to: "#dc2626" },
  { id: "ink", name: "design.color.ink", from: "#334155", to: "#0f172a" },
];

export const QR_BACKGROUNDS: ColorSwatch[] = [
  { name: "design.color.white", value: "#ffffff" },
  { name: "design.color.cream", value: "#faf6f0" },
  { name: "design.color.mist", value: "#f1f5f9" },
  { name: "design.color.ink", value: "#0f172a" },
  { name: "design.color.night", value: "#111827" },
];

export const ERROR_CORRECTION_LEVELS: {
  id: ErrorCorrectionLevel;
  label: TranslationKey;
  detail: TranslationKey;
}[] = [
  { id: "L", label: "design.ecc.l.label", detail: "design.ecc.l.detail" },
  { id: "M", label: "design.ecc.m.label", detail: "design.ecc.m.detail" },
  { id: "Q", label: "design.ecc.q.label", detail: "design.ecc.q.detail" },
  { id: "H", label: "design.ecc.h.label", detail: "design.ecc.h.detail" },
];

export const DEFAULT_DESIGN: QrDesign = {
  dotsType: "rounded",
  dotsColorMode: "gradient",
  dotsColor: "#1e293b",
  dotsGradientFrom: "#6366f1",
  dotsGradientTo: "#d946ef",
  dotsGradientRotation: 45,

  cornersMatchBody: true,
  cornerSquareType: "extra-rounded",
  cornerDotType: "dot",
  cornerSquareColor: "#6366f1",
  cornerDotColor: "#d946ef",

  background: "#ffffff",
  transparentBackground: false,

  logo: null,
  logoSize: 0.4,
  logoMargin: 6,
  hideBackgroundDots: true,

  frameId: "none",
  frameText: "Scannez-moi",
  frameTextColor: "#334155",
  frameTextSize: 13,
  frameColor: "#e2e8f0",
  frameBackground: "#ffffff",

  errorCorrection: "Q",
  margin: 12,
};

export type DesignTemplate = {
  id: string;
  name: string;
  hint: TranslationKey;
  preview: [string, string];
  design: Partial<QrDesign>;
};

export const DESIGN_TEMPLATES: DesignTemplate[] = [
  {
    id: "aurora",
    name: "Aurora",
    hint: "design.template.aurora.hint",
    preview: ["#6366f1", "#d946ef"],
    design: {
      dotsType: "rounded",
      dotsColorMode: "gradient",
      dotsGradientFrom: "#6366f1",
      dotsGradientTo: "#d946ef",
      cornersMatchBody: true,
      cornerSquareType: "extra-rounded",
      cornerDotType: "dot",
      frameId: "f22",
      frameText: "Scannez-moi",
      frameColor: "#6366f1",
      errorCorrection: "Q",
    },
  },
  {
    id: "mono",
    name: "Mono",
    hint: "design.template.mono.hint",
    preview: ["#0f172a", "#475569"],
    design: {
      dotsType: "square",
      dotsColorMode: "solid",
      dotsColor: "#0f172a",
      cornersMatchBody: true,
      cornerSquareType: "square",
      cornerDotType: "square",
      frameId: "f21",
      frameText: "Infos pratiques",
      errorCorrection: "M",
    },
  },
  {
    id: "bubble",
    name: "Bubble",
    hint: "design.template.bubble.hint",
    preview: ["#06b6d4", "#10b981"],
    design: {
      dotsType: "dots",
      dotsColorMode: "gradient",
      dotsGradientFrom: "#06b6d4",
      dotsGradientTo: "#10b981",
      cornersMatchBody: false,
      cornerSquareType: "dot",
      cornerDotType: "dot",
      cornerSquareColor: "#0e7490",
      cornerDotColor: "#10b981",
      frameId: "f30",
      frameText: "Menu",
      errorCorrection: "Q",
    },
  },
  {
    id: "classy",
    name: "Classy",
    hint: "design.template.classy.hint",
    preview: ["#8b5cf6", "#f43f5e"],
    design: {
      dotsType: "classy-rounded",
      dotsColorMode: "solid",
      dotsColor: "#4c1d95",
      cornersMatchBody: false,
      cornerSquareType: "classy",
      cornerDotType: "dot",
      cornerSquareColor: "#8b5cf6",
      cornerDotColor: "#f43f5e",
      frameId: "f13",
      frameText: "Ma carte",
      errorCorrection: "Q",
    },
  },
  {
    id: "citrus",
    name: "Citrus",
    hint: "design.template.citrus.hint",
    preview: ["#facc15", "#dc2626"],
    design: {
      dotsType: "extra-rounded",
      dotsColorMode: "gradient",
      dotsGradientFrom: "#facc15",
      dotsGradientTo: "#dc2626",
      cornersMatchBody: true,
      cornerSquareType: "extra-rounded",
      cornerDotType: "rounded",
      frameId: "f45",
      frameText: "Offre limitée",
      errorCorrection: "Q",
    },
  },
  {
    id: "inklight",
    name: "Nightfall",
    hint: "design.template.inklight.hint",
    preview: ["#0f172a", "#38bdf8"],
    design: {
      dotsType: "rounded",
      dotsColorMode: "solid",
      dotsColor: "#e2e8f0",
      cornersMatchBody: true,
      cornerSquareType: "extra-rounded",
      cornerDotType: "dot",
      background: "#0f172a",
      transparentBackground: false,
      frameId: "f51",
      frameText: "Bienvenue",
      frameTextColor: "#e2e8f0",
      frameColor: "#334155",
      frameBackground: "#0f172a",
      errorCorrection: "H",
    },
  },
  {
    id: "mint",
    name: "Mint",
    hint: "design.template.mint.hint",
    preview: ["#10b981", "#0ea5e9"],
    design: {
      dotsType: "classy",
      dotsColorMode: "gradient",
      dotsGradientFrom: "#10b981",
      dotsGradientTo: "#0ea5e9",
      cornersMatchBody: true,
      cornerSquareType: "rounded",
      cornerDotType: "dot",
      frameId: "f48",
      frameText: "Fiche produit",
      errorCorrection: "Q",
    },
  },
  {
    id: "ticket",
    name: "Ticket",
    hint: "design.template.ticket.hint",
    preview: ["#f97316", "#8b5cf6"],
    design: {
      dotsType: "dots",
      dotsColorMode: "solid",
      dotsColor: "#7c2d12",
      cornersMatchBody: false,
      cornerSquareType: "dot",
      cornerDotType: "square",
      cornerSquareColor: "#f97316",
      cornerDotColor: "#8b5cf6",
      frameId: "f32",
      frameText: "À présenter en caisse",
      errorCorrection: "Q",
    },
  },
];

/** Contextes de mise en situation de l'aperçu (spec 004, illustr. « mockup »). */
export type Mockup = {
  id: string;
  name: TranslationKey;
  detail: TranslationKey;
  /** Palette du décor, appliquée en CSS. */
  surface: string;
  accent: string;
  /** Taille relative du QR dans le décor. */
  qrScale: number;
  dark: boolean;
};

export const MOCKUPS: Mockup[] = [
  {
    id: "plain",
    name: "design.mockup.plain.name",
    detail: "design.mockup.plain.detail",
    surface: "#ffffff",
    accent: "#94a3b8",
    qrScale: 1,
    dark: false,
  },
  {
    id: "poster",
    name: "design.mockup.poster.name",
    detail: "design.mockup.poster.detail",
    surface: "#0b1020",
    accent: "#6366f1",
    qrScale: 0.62,
    dark: true,
  },
  {
    id: "card",
    name: "design.mockup.card.name",
    detail: "design.mockup.card.detail",
    surface: "#f8fafc",
    accent: "#0f172a",
    qrScale: 0.42,
    dark: false,
  },
  {
    id: "table",
    name: "design.mockup.table.name",
    detail: "design.mockup.table.detail",
    surface: "#1c1917",
    accent: "#f59e0b",
    qrScale: 0.5,
    dark: true,
  },
  {
    id: "packaging",
    name: "design.mockup.packaging.name",
    detail: "design.mockup.packaging.detail",
    surface: "#ecfdf5",
    accent: "#059669",
    qrScale: 0.45,
    dark: false,
  },
  {
    id: "screen",
    name: "design.mockup.screen.name",
    detail: "design.mockup.screen.detail",
    surface: "#111827",
    accent: "#22d3ee",
    qrScale: 0.58,
    dark: true,
  },
  {
    id: "sticker",
    name: "design.mockup.sticker.name",
    detail: "design.mockup.sticker.detail",
    surface: "#fef2f2",
    accent: "#ef4444",
    qrScale: 0.55,
    dark: false,
  },
  {
    id: "tshirt",
    name: "design.mockup.tshirt.name",
    detail: "design.mockup.tshirt.detail",
    surface: "#e2e8f0",
    accent: "#1d4ed8",
    qrScale: 0.47,
    dark: false,
  },
];

export const MOCKUPS_BY_ID: Record<string, Mockup> = Object.fromEntries(
  MOCKUPS.map((mockup) => [mockup.id, mockup]),
);

export type ExportFormat = "png" | "jpeg" | "webp" | "svg";

export const EXPORT_FORMATS: { id: ExportFormat; label: string; detail: TranslationKey }[] = [
  { id: "png", label: "PNG", detail: "design.format.png.detail" },
  { id: "svg", label: "SVG", detail: "design.format.svg.detail" },
  { id: "jpeg", label: "JPEG", detail: "design.format.jpeg.detail" },
  { id: "webp", label: "WebP", detail: "design.format.webp.detail" },
];

export const EXPORT_SIZES = [512, 1024, 2048, 4096];
