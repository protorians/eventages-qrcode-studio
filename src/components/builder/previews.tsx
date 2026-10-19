import type { CSSProperties } from "react";
import type { CornerDotType, CornerSquareType, DotType } from "qr-code-styling";
import { cn } from "@/lib/utils";

const PATTERN = [
  [1, 1, 1, 1, 1],
  [1, 0, 1, 0, 1],
  [0, 1, 1, 1, 0],
  [1, 1, 0, 0, 1],
  [1, 0, 1, 1, 0],
];

/** Vignette de la forme des modules (spec 004, FR-3). */
export function ModulePatternPreview({
  dotType,
  color = "currentColor",
  className,
}: {
  dotType: DotType;
  color?: string;
  className?: string;
}) {
  const cell = 5;
  const radius =
    dotType === "rounded" ? 1.4 : dotType === "extra-rounded" ? 2.5 : 0;

  return (
    <svg
      viewBox="0 0 25 25"
      className={cn("size-full", className)}
      aria-hidden="true"
      fill={color}
    >
      {PATTERN.map((row, y) =>
        row.map((on, x) => {
          if (!on) return null;
          const px = x * cell;
          const py = y * cell;
          if (dotType === "dots") {
            return <circle key={`${x}-${y}`} cx={px + cell / 2} cy={py + cell / 2} r={cell / 2 - 0.2} />;
          }
          if (dotType === "classy" || dotType === "classy-rounded") {
            const r = dotType === "classy" ? 1.1 : 2.2;
            return (
              <path
                key={`${x}-${y}`}
                d={`M ${px} ${py} h ${cell} v ${cell} a ${r} ${r} 0 0 1 ${-r} ${-r} h ${-(cell - r)} Z`}
              />
            );
          }
          return (
            <rect
              key={`${x}-${y}`}
              x={px}
              y={py}
              width={cell}
              height={cell}
              rx={radius}
            />
          );
        }),
      )}
    </svg>
  );
}

/** Vignette des marqueurs de position (spec 004, FR-5). */
export function CornerPreview({
  squareType,
  dotType,
  color = "currentColor",
  className,
}: {
  squareType: CornerSquareType;
  dotType: CornerDotType;
  color?: string;
  className?: string;
}) {
  const outer = 7;
  const outerRadius =
    squareType === "dot" ? outer / 2 : squareType === "extra-rounded" ? 4 : squareType === "rounded" ? 2 : 0;
  const innerSize = 3;
  const innerOffset = 2;
  const innerRadius =
    dotType === "dot" ? innerSize / 2 : dotType === "extra-rounded" ? 1.6 : dotType === "rounded" ? 0.9 : 0;

  return (
    <svg viewBox="0 0 14 14" className={cn("size-full", className)} aria-hidden="true">
      <rect
        x={0.5}
        y={0.5}
        width={outer}
        height={outer}
        rx={outerRadius}
        fill="none"
        stroke={color}
        strokeWidth={1}
      />
      <rect
        x={outer / 2 - innerSize / 2 + 0.5}
        y={outer / 2 - innerSize / 2 + 0.5}
        width={innerSize}
        height={innerSize}
        rx={innerRadius}
        fill={color}
      />
      <rect x={innerOffset + 8} y={innerOffset + 8} width={2} height={2} rx={0.6} fill={color} />
      <rect x={innerOffset + 11} y={innerOffset + 9} width={2} height={2} rx={0.6} fill={color} />
      <rect x={innerOffset + 9} y={innerOffset + 11} width={2} height={2} rx={0.6} fill={color} />
    </svg>
  );
}

function seedFrom(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

const FINDERS: [number, number][] = [
  [0, 0],
  [1, 0],
  [0, 1],
];

function isFinderZone(row: number, column: number, size: number): boolean {
  return FINDERS.some(([fx, fy]) => {
    const top = fy === 0 ? 0 : size - 7;
    const left = fx === 0 ? 0 : size - 7;
    return row >= top - 1 && row <= top + 7 && column >= left - 1 && column <= left + 7;
  });
}

/**
 * Glyphe de QR décoratif et déterministe : utilisé pour les vignettes
 * (galerie de types, modèles) afin de ne pas instancier le moteur de rendu
 * complet des dizaines de fois.
 */
export function QrGlyph({
  seed,
  color = "currentColor",
  className,
  size = 21,
}: {
  seed: string;
  color?: string;
  className?: string;
  size?: number;
}) {
  let state = seedFrom(seed) || 1;
  const next = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };

  const cells: [number, number][] = [];
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      if (isFinderZone(row, column, size)) continue;
      if (next() > 0.52) cells.push([row, column]);
    }
  }

  const finder = (top: number, left: number) => (
    <g key={`f-${top}-${left}`}>
      <rect x={left} y={top} width={7} height={7} rx={1.6} fill="none" stroke={color} strokeWidth={1} />
      <rect x={left + 2} y={top + 2} width={3} height={3} rx={0.9} fill={color} />
    </g>
  );

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={cn("size-full", className)} aria-hidden="true">
      {cells.map(([row, column]) => (
        <rect
          key={`${row}-${column}`}
          x={column + 0.1}
          y={row + 0.1}
          width={0.8}
          height={0.8}
          rx={0.3}
          fill={color}
        />
      ))}
      {finder(0, 0)}
      {finder(0, size - 7)}
      {finder(size - 7, 0)}
    </svg>
  );
}

/** Vignette d'un cadre : rayon, bordure, barre d'accent et libellé. */
export function FramePreview({
  radius,
  borderWidth,
  accentBar,
  labelPosition,
  className,
  style,
}: {
  radius: number;
  borderWidth: number;
  accentBar: boolean;
  labelPosition: "top" | "bottom" | "none";
  className?: string;
  style?: CSSProperties;
}) {
  const radiusPercent = radius >= 24 ? "50%" : `${Math.min(radius, 16)}px`;

  return (
    <div
      className={cn(
        "relative flex size-full items-center justify-center rounded-[inherit]",
        className,
      )}
      style={style}
    >
      <div
        className="absolute inset-0 border-border"
        style={{
          borderRadius: radiusPercent,
          borderWidth,
          borderStyle: borderWidth ? "solid" : "none",
        }}
      />
      <div
        className="size-3 rounded-[3px] bg-foreground/45"
        style={{ marginBottom: labelPosition === "top" ? 6 : 0 }}
      />
      {accentBar && (
        <span
          className="absolute bottom-1.5 h-0.5 w-6 rounded-full bg-primary"
          style={labelPosition === "top" ? { top: 6, bottom: "auto" } : undefined}
        />
      )}
    </div>
  );
}
