/**
 * Bibliothèque locale de logos prédéfinis (spec 004, FR-6b) : chaque logo est
 * un SVG autonome encodé en data-URL, sans aucune ressource distante.
 */
export type LogoPreset = {
  id: string;
  name: string;
  svg: string;
  dataUrl: string;
};

function make(
  id: string,
  name: string,
  body: string,
  background: string,
  foreground: string,
): LogoPreset {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="26" fill="${background}"/><g fill="${foreground}">${body}</g></svg>`;
  return {
    id,
    name,
    svg,
    dataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
  };
}

export const LOGO_PRESETS: LogoPreset[] = [
  make(
    "monogram",
    "Monogramme",
    '<text x="48" y="63" font-family="Manrope, system-ui, sans-serif" font-size="46" font-weight="700" text-anchor="middle">S</text>',
    "#6366f1",
    "#ffffff",
  ),
  make(
    "dot",
    "Point",
    '<circle cx="48" cy="48" r="20"/>',
    "#0ea5e9",
    "#ffffff",
  ),
  make(
    "ring",
    "Anneau",
    '<circle cx="48" cy="48" r="22" fill="none" stroke="#ffffff" stroke-width="10"/>',
    "#10b981",
    "#ffffff",
  ),
  make(
    "star",
    "Étoile",
    '<path d="M48 20l8.6 18.2 20 2.6-14.6 13.8 3.6 19.8L48 65.6 30.4 74.4l3.6-19.8L19.4 40.8l20-2.6z"/>',
    "#f59e0b",
    "#ffffff",
  ),
  make(
    "leaf",
    "Feuille",
    '<path d="M70 26c2 26-14 44-34 44-2 0-4-.2-6-.6C30 44 44 26 70 26z"/>',
    "#16a34a",
    "#ecfdf5",
  ),
  make(
    "bolt",
    "Éclair",
    '<path d="M54 18L30 54h14l-6 24 28-38H52z"/>',
    "#8b5cf6",
    "#ffffff",
  ),
  make(
    "waves",
    "Ondes",
    '<path d="M22 46c8-14 20-14 28 0s20 14 28 0v14c-8 14-20 14-28 0s-20-14-28 0z"/>',
    "#0f172a",
    "#38bdf8",
  ),
  make(
    "pixel",
    "Pixel",
    '<rect x="24" y="24" width="20" height="20" rx="4"/><rect x="52" y="24" width="20" height="20" rx="4"/><rect x="24" y="52" width="20" height="20" rx="4"/><rect x="52" y="52" width="20" height="20" rx="4"/>',
    "#e11d48",
    "#fff1f2",
  ),
];
