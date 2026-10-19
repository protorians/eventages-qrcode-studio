import { useEffect, useRef } from "react";
import QRCodeStyling from "qr-code-styling";
import { FRAMES_BY_ID, type QrDesign } from "@/lib/qr-design";
import { BASE_QR_SIZE, frameMetrics } from "@/lib/qr-frame";
import { designToOptions } from "@/lib/qr-options";
import { cn } from "@/lib/utils";

/** Résolution interne du rendu vectoriel de l'aperçu. */
const PREVIEW_RENDER_SIZE = 1024;

const SHADOW_CLASS: Record<string, string> = {
  none: "",
  soft: "shadow-lg shadow-black/10 dark:shadow-black/40",
  deep: "shadow-2xl shadow-black/25 dark:shadow-black/60",
};

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

export function QrArtboard({
  design,
  payload,
  scale = 1,
  className,
  interactive = false,
}: {
  design: QrDesign;
  payload: string;
  /** Facteur d'échelle appliqué à l'ensemble cadre + QR. */
  scale?: number;
  className?: string;
  interactive?: boolean;
}) {
  const containerRef = useQrInstance(design, payload);
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
      className={cn(
        "relative transition-[width,height] duration-300 ease-out",
        className,
      )}
    >
      <div
        className={cn(
          "absolute top-0 left-0 flex flex-col items-center transition-transform duration-300 ease-out",
          interactive && "group-hover/artboard:scale-[1.01]",
        )}
        style={{
          width: metrics.width,
          height: metrics.height,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
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
            background: hasFrame ? design.frameBackground : design.transparentBackground ? "transparent" : design.background,
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

          <div
            ref={containerRef}
            className="[&>svg]:block [&>svg]:size-full"
            style={{ width: metrics.qrSize, height: metrics.qrSize, flex: "none" }}
          />

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
