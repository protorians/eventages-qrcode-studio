import { useEffect, useRef, useState } from "react";
import QRCodeStyling from "qr-code-styling";
import { FRAMES_BY_ID, type QrDesign } from "@/lib/qr-design";
import { BASE_QR_SIZE, frameMetrics } from "@/lib/qr-frame";
import { designToOptions } from "@/lib/qr-options";
import { renderBarcodeSvg, type BarcodeDesign } from "@/lib/barcode";
import { cn } from "@/lib/utils";

/** Résolution interne du rendu vectoriel de l'aperçu. */
const PREVIEW_RENDER_SIZE = 1024;

const SHADOW_CLASS: Record<string, string> = {
  none: "",
  soft: "shadow-lg shadow-black/10 dark:shadow-black/40",
  deep: "shadow-2xl shadow-black/25 dark:shadow-black/60",
};

/** Rendu 1D : symbologie + habillage du code-barres. */
export type BarcodeArtboard = { symbology: string; design: BarcodeDesign };

/**
 * Aperçu vivant du QR : monte le moteur de rendu une seule fois puis pousse
 * chaque changement d'options (spec 004, FR-7).
 */
function useQrInstance(design: QrDesign, payload: string) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<QRCodeStyling | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const options = designToOptions(design, payload, PREVIEW_RENDER_SIZE);
    if (instanceRef.current) {
      instanceRef.current.update(options);
    } else {
      instanceRef.current = new QRCodeStyling(options);
    }
    instanceRef.current.append(container);
  }, [design, payload]);

  return containerRef;
}

/**
 * Aperçu vivant du code-barres 1D : SVG régénéré à chaque changement. En cas
 * de valeur refusée par la symbologie, le dernier rendu valide reste affiché
 * et un message d'erreur accompagne le code.
 */
function useBarcodeInstance(
  payload: string,
  symbology: string,
  design: BarcodeDesign,
  background: string | null,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastSvgRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const { svg, error: renderError } = renderBarcodeSvg({
      value: payload,
      symbology,
      design,
      background,
      size: PREVIEW_RENDER_SIZE,
    });
    setError(renderError);
    if (svg) {
      lastSvgRef.current = svg;
      container.innerHTML = svg;
    } else if (lastSvgRef.current) {
      container.innerHTML = lastSvgRef.current;
    } else {
      container.innerHTML = "";
    }
  }, [payload, symbology, design, background]);

  return { containerRef, error };
}

export function CodeArtboard({
  design,
  payload,
  barcode,
  scale = 1,
  className,
  interactive = false,
}: {
  design: QrDesign;
  payload: string;
  /** Présent pour le type code-barres 1D, absent pour un QR. */
  barcode?: BarcodeArtboard;
  /** Facteur d'échelle appliqué à l'ensemble cadre + code. */
  scale?: number;
  className?: string;
  interactive?: boolean;
}) {
  return barcode ? (
    <BarcodeInner
      design={design}
      payload={payload}
      barcode={barcode}
      scale={scale}
      className={className}
      interactive={interactive}
    />
  ) : (
    <QrInner
      design={design}
      payload={payload}
      scale={scale}
      className={className}
      interactive={interactive}
    />
  );
}

function QrInner({
  design,
  payload,
  scale,
  className,
  interactive,
}: {
  design: QrDesign;
  payload: string;
  scale: number;
  className?: string;
  interactive?: boolean;
}) {
  const containerRef = useQrInstance(design, payload);

  return (
    <ArtboardShell design={design} scale={scale} className={className} interactive={interactive}>
      {(qrSize) => (
        <div
          ref={containerRef}
          className="[&>svg]:block [&>svg]:size-full"
          style={{ width: qrSize, height: qrSize, flex: "none" }}
        />
      )}
    </ArtboardShell>
  );
}

function BarcodeInner({
  design,
  payload,
  barcode,
  scale,
  className,
  interactive,
}: {
  design: QrDesign;
  payload: string;
  barcode: BarcodeArtboard;
  scale: number;
  className?: string;
  interactive?: boolean;
}) {
  const { containerRef, error } = useBarcodeInstance(
    payload,
    barcode.symbology,
    barcode.design,
    design.transparentBackground ? null : design.background,
  );

  return (
    <ArtboardShell design={design} scale={scale} className={className} interactive={interactive}>
      {(qrSize) => (
        <>
          <div
            ref={containerRef}
            className="[&>svg]:block [&>svg]:size-full"
            style={{ width: qrSize, height: qrSize, flex: "none" }}
          />
          {error ? (
            <span className="pointer-events-none absolute inset-x-4 top-2 z-10 rounded-md bg-background/90 px-2 py-1 text-center font-mono text-[0.55rem] leading-tight text-destructive ring-1 ring-destructive/30">
              {error}
            </span>
          ) : null}
        </>
      )}
    </ArtboardShell>
  );
}

/** Coque commune : cadre, bordure, barre d'accent et libellé (spec 004). */
function ArtboardShell({
  design,
  scale,
  className,
  interactive,
  children,
}: {
  design: QrDesign;
  scale: number;
  className?: string;
  interactive?: boolean;
  /** Reçoit la taille du carré de code pour dimensionner son rendu. */
  children: (qrSize: number) => React.ReactNode;
}) {
  const frame = FRAMES_BY_ID[design.frameId] ?? FRAMES_BY_ID.none;
  const metrics = frameMetrics(frame, BASE_QR_SIZE, Boolean(design.frameText));
  const hasFrame = frame.id !== "none";

  const label = (
    <div
      className="flex w-full shrink-0 items-center justify-center px-3"
      style={{
        height: metrics.labelBand,
        color: design.frameTextColor,
        fontSize: design.frameTextSize,
      }}
    >
      <span className="truncate font-semibold tracking-tight">{design.frameText}</span>
    </div>
  );

  const accent = metrics.accentBar ? (
    <div
      className="shrink-0 rounded-full"
      style={{
        width: metrics.qrSize,
        height: metrics.accentBar,
        background: design.frameColor,
      }}
    />
  ) : null;

  return (
    <div
      style={{ width: metrics.width * scale, height: metrics.height * scale }}
      className={cn("relative", className)}
    >
      <div
        className={cn(
          "absolute top-1/2 left-1/2 flex flex-col items-center",
          interactive && "group-hover/artboard:scale-[1.01]",
        )}
        style={{
          width: metrics.width,
          height: metrics.height,
          // Le zoom est animé uniquement via transform (compositor) : la boîte
          // de layout passe en une seule passe à sa taille finale — animer
          // width/height relance layout + paint de toute la scène à chaque
          // frame, d'où une animation saccadée. Le centrage (translate -50 %)
          // garde le visuel immobile pendant la transition, seul l'échelle varie.
          transform: `translate(-50%, -50%) scale(${scale})`,
          transition: "transform 300ms ease-out",
          willChange: "transform",
        }}
      >
        <div
          className={cn(
            "relative flex flex-col items-center overflow-hidden",
            hasFrame && SHADOW_CLASS[frame.shadow],
          )}
          style={{
            width: metrics.width,
            height: metrics.height,
            borderRadius: metrics.radius,
            padding: metrics.pad + metrics.borderWidth,
            background: hasFrame
              ? design.frameBackground
              : design.transparentBackground
                ? "transparent"
                : design.background,
            borderWidth: metrics.borderWidth,
            borderStyle: frame.borderStyle === "none" ? undefined : frame.borderStyle,
            borderColor: design.frameColor,
            boxSizing: "border-box",
          }}
        >
          {frame.innerLine ? (
            <span
              className="pointer-events-none absolute opacity-40"
              style={{
                inset: Math.max(4, metrics.pad - 6),
                borderRadius: Math.max(4, metrics.radius - 6),
                border: `1px solid ${design.frameColor}`,
              }}
            />
          ) : null}

          {frame.labelPosition === "top" && hasFrame ? label : null}
          {frame.labelPosition === "top" && hasFrame ? accent : null}

          {children(metrics.qrSize)}

          {frame.labelPosition === "bottom" && hasFrame ? accent : null}
          {frame.labelPosition === "bottom" && hasFrame ? label : null}

          {frame.ring ? (
            <span
              className="pointer-events-none absolute rounded-full"
              style={{
                inset: -Math.max(6, metrics.pad / 2),
                border: `1px solid ${design.frameColor}`,
                opacity: 0.5,
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
