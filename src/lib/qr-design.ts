import type {
  CornerDotType,
  CornerSquareType,
  DotType,
  ErrorCorrectionLevel,
} from "qr-code-styling";

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

export const DOT_STYLES: { id: DotType; label: string }[] = [
  { id: "square", label: "Carré" },
  { id: "rounded", label: "Arrondi" },
  { id: "extra-rounded", label: "Extra arrondi" },
  { id: "dots", label: "Points" },
  { id: "classy", label: "Classy" },
  { id: "classy-rounded", label: "Classy arrondi" },
];

export const CORNER_SQUARE_STYLES: { id: CornerSquareType; label: string }[] = [
  { id: "square", label: "Carré" },
  { id: "extra-rounded", label: "Arrondi" },
  { id: "dot", label: "Cercle" },
  { id: "rounded", label: "Doux" },
  { id: "classy", label: "Classy" },
];

export const CORNER_DOT_STYLES: { id: CornerDotType; label: string }[] = [
  { id: "square", label: "Carré" },
  { id: "dot", label: "Point" },
  { id: "rounded", label: "Arrondi" },
  { id: "extra-rounded", label: "Extra arrondi" },
];

export type QrFrame = {
  id: string;
  name: string;
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
    name: "Sans cadre",
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
    name: "Frame 0",
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
    name: "Frame 13",
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
    name: "Frame 18",
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
    name: "Frame 21",
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
    name: "Frame 22",
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
    name: "Frame 30",
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
    name: "Frame 32",
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
    name: "Frame 40",
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
    name: "Frame 45",
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
    name: "Frame 48",
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
    name: "Frame 51",
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

export type ColorSwatch = { name: string; value: string };

export const PALETTES: { id: string; name: string; colors: ColorSwatch[] }[] = [
  {
    id: "studio",
    name: "Studio",
    colors: [
      { name: "Indigo", value: "#6366f1" },
      { name: "Violet", value: "#8b5cf6" },
      { name: "Fuchsia", value: "#d946ef" },
      { name: "Rose", value: "#f43f5e" },
      { name: "Ambre", value: "#f59e0b" },
      { name: "Émeraude", value: "#10b981" },
      { name: "Cyan", value: "#06b6d4" },
      { name: "Ardoise", value: "#1e293b" },
    ],
  },
  {
    id: "pastel",
    name: "Pastel",
    colors: [
      { name: "Lilas", value: "#c4b5fd" },
      { name: "Ciel", value: "#bae6fd" },
      { name: "Menthe", value: "#a7f3d0" },
      { name: "Pêche", value: "#fed7aa" },
      { name: "Rose", value: "#fecdd3" },
      { name: "Citron", value: "#fef08a" },
      { name: "Sable", value: "#e7e5e4" },
      { name: "Encre", value: "#334155" },
    ],
  },
  {
    id: "bold",
    name: "Bold",
    colors: [
      { name: "Noir", value: "#0f172a" },
      { name: "Rouge", value: "#dc2626" },
      { name: "Orange", value: "#ea580c" },
      { name: "Jaune", value: "#facc15" },
      { name: "Vert", value: "#16a34a" },
      { name: "Bleu", value: "#2563eb" },
      { name: "Violet", value: "#7c3aed" },
      { name: "Blanc", value: "#ffffff" },
    ],
  },
];

export const QR_SWATCHES: ColorSwatch[] = PALETTES.flatMap((palette) => palette.colors);

export const GRADIENT_PRESETS: { id: string; name: string; from: string; to: string }[] = [
  { id: "sunset", name: "Coucher de soleil", from: "#f97316", to: "#db2777" },
  { id: "ocean", name: "Océan", from: "#0ea5e9", to: "#4f46e5" },
  { id: "candy", name: "Bonbon", from: "#a855f7", to: "#ec4899" },
  { id: "forest", name: "Forêt", from: "#22c55e", to: "#0f766e" },
  { id: "ember", name: "Braise", from: "#facc15", to: "#dc2626" },
  { id: "ink", name: "Encre", from: "#334155", to: "#0f172a" },
];

export const QR_BACKGROUNDS: ColorSwatch[] = [
  { name: "Blanc", value: "#ffffff" },
  { name: "Crème", value: "#faf6f0" },
  { name: "Brume", value: "#f1f5f9" },
  { name: "Encre", value: "#0f172a" },
  { name: "Nuit", value: "#111827" },
];

export const ERROR_CORRECTION_LEVELS: {
  id: ErrorCorrectionLevel;
  label: string;
  detail: string;
}[] = [
  { id: "L", label: "Faible", detail: "7 % de récupération" },
  { id: "M", label: "Moyen", detail: "15 % de récupération" },
  { id: "Q", label: "Élevé", detail: "25 % de récupération" },
  { id: "H", label: "Maximal", detail: "30 % — recommandé avec logo" },
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
  hint: string;
  preview: [string, string];
  design: Partial<QrDesign>;
};

export const DESIGN_TEMPLATES: DesignTemplate[] = [
  {
    id: "aurora",
    name: "Aurora",
    hint: "Dégradé indigo · modules arrondis",
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
    hint: "Encre · carré net",
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
    hint: "Points · cadre circulaire",
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
    hint: "Classy · carte de visite",
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
    hint: "Ambre → rouge · sticker",
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
    hint: "Fond sombre · contraste inversé",
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
    hint: "Émeraude douce · produit",
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
    hint: "Ticket · coupon",
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
  name: string;
  detail: string;
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
    name: "Aperçu neutre",
    detail: "Fond damier, sans habillage",
    surface: "#ffffff",
    accent: "#94a3b8",
    qrScale: 1,
    dark: false,
  },
  {
    id: "poster",
    name: "Affiche A3",
    detail: "Affichage vitrine ou couloir",
    surface: "#0b1020",
    accent: "#6366f1",
    qrScale: 0.62,
    dark: true,
  },
  {
    id: "card",
    name: "Carte de visite",
    detail: "Format 85 × 55 mm",
    surface: "#f8fafc",
    accent: "#0f172a",
    qrScale: 0.42,
    dark: false,
  },
  {
    id: "table",
    name: "Chevalet de table",
    detail: "Restaurant & hôtellerie",
    surface: "#1c1917",
    accent: "#f59e0b",
    qrScale: 0.5,
    dark: true,
  },
  {
    id: "packaging",
    name: "Packaging",
    detail: "Étiquette produit",
    surface: "#ecfdf5",
    accent: "#059669",
    qrScale: 0.45,
    dark: false,
  },
  {
    id: "screen",
    name: "Écran / TV",
    detail: "Présentation en salle",
    surface: "#111827",
    accent: "#22d3ee",
    qrScale: 0.58,
    dark: true,
  },
  {
    id: "sticker",
    name: "Sticker",
    detail: "Vitrine, véhicule, flyer",
    surface: "#fef2f2",
    accent: "#ef4444",
    qrScale: 0.55,
    dark: false,
  },
  {
    id: "tshirt",
    name: "T-shirt",
    detail: "Textile personnalisé",
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

export const EXPORT_FORMATS: { id: ExportFormat; label: string; detail: string }[] = [
  { id: "png", label: "PNG", detail: "Transparence, impression" },
  { id: "svg", label: "SVG", detail: "Vectoriel, redimensionnable" },
  { id: "jpeg", label: "JPEG", detail: "Léger, réseaux sociaux" },
  { id: "webp", label: "WebP", detail: "Compression moderne" },
];

export const EXPORT_SIZES = [512, 1024, 2048, 4096];
