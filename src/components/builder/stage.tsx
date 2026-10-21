import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  Grid3x3,
  Maximize,
  Minus,
  Plus,
  ScanLine,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HudCross, HudCorners, HudLabel, HudReadout } from "@/components/shell/hud";
import { MockupScene } from "@/components/builder/mockup-scene";
import { CodeArtboard } from "@/components/builder/qr-artboard";
import { BASE_QR_SIZE, frameMetrics } from "@/lib/qr-frame";
import { FRAMES_BY_ID, MOCKUPS_BY_ID } from "@/lib/qr-design";
import { useBuilder } from "@/lib/builder-store";
import { useElementSize } from "@/hooks/use-element-size";
import { useSettings } from "@/hooks/use-settings";
import { payloadSize } from "@/lib/qr-payload";
import { cn } from "@/lib/utils";

const ZOOM_MIN = 40;
const ZOOM_MAX = 220;

/** Scène centrale : aperçu du code sous caméra de visée HUD. */
export function Stage({ dock }: { dock?: ReactNode }) {
  const { state, type, values, payload, debouncedPayload } = useBuilder();
  const { ref, size } = useElementSize<HTMLDivElement>();
  const { hud } = useSettings();
  const [zoom, setZoom] = useState(100);
  const [showGrid, setShowGrid] = useState(false);

  const mockup = MOCKUPS_BY_ID[state.mockupId] ?? MOCKUPS_BY_ID.plain;
  const frame = FRAMES_BY_ID[state.design.frameId] ?? FRAMES_BY_ID.none;
  const metrics = frameMetrics(
    frame,
    BASE_QR_SIZE,
    Boolean(state.design.frameText),
  );

  const zoomBy = useCallback((delta: number) => {
    setZoom((value) =>
      Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value + delta)),
    );
  }, []);

  // Zoom continu (pinch trackpad / tactile, molette cmd) : valeur lissée et
  // arrondie à l'entier, bornée une seule fois (pas de re-clamp intermédiaire).
  const zoomTo = useCallback((value: number) => {
    if (!Number.isFinite(value)) return;
    const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value));
    setZoom(Math.round(clamped));
  }, []);

  // Facteur multiplicatif : mise à jour fonctionnelle pour que des événements
  // rapprochés (trackpad) s'accumulent même entre deux rendus React.
  const zoomByFactor = useCallback((factor: number) => {
    if (!Number.isFinite(factor) || factor <= 0) return;
    setZoom((value) => {
      const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value * factor));
      return Math.round(next);
    });
  }, []);

  // ⌘/Ctrl + / − : piloter le zoom au clavier (default évite le zoom du webview).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.metaKey && !event.ctrlKey) return;
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        zoomBy(10);
      } else if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        zoomBy(-10);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [zoomBy]);

  // Molette + pinch (trackpad : ctrl+wheel) : zoom continu centré sur la scène.
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const raw =
        event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
      // Lissage : un événement de pinch ne doit jamais faire un saut brutal.
      const amount = Math.max(-80, Math.min(80, raw));
      zoomByFactor(Math.exp(-amount * 0.003));
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ref est stable
  }, [ref, zoomByFactor]);

  // Zoom tactile : pinch à deux doigts, suivi via Pointer Events.
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()];
      pinchRef.current = {
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        zoom: zoomRef.current,
      };
    }
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pointers = pointersRef.current;
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2 && pinchRef.current?.distance) {
      const [a, b] = [...pointers.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      event.preventDefault();
      zoomTo((pinchRef.current.zoom * distance) / pinchRef.current.distance);
    }
  };

  const onPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
  };

  // Zoom courant pour les handlers natifs non-React (wheel) et les gestes.
  const zoomRef = useRef(zoom);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const scale = useMemo(() => {
    if (!size.width || !size.height) return 0.6;
    const fit = Math.min(
      (size.width * 0.8) / metrics.width,
      (size.height * 0.78) / metrics.height,
    );
    return Math.max(0.05, Math.min(fit, 1.6)) * (zoom / 100);
  }, [size.width, size.height, metrics.width, metrics.height, zoom]);

  const generating = payload !== debouncedPayload;
  const bytes = payloadSize(debouncedPayload);

  return (
    <section className="@container/stage relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="relative flex flex-wrap items-center gap-2 border-b border-border/60 px-3 py-2 sm:px-4">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-linear-to-r from-primary/50 via-primary/15 to-transparent"
        />
        <div className="flex min-w-0 items-center gap-2">
          <span className="hud-clip-tr relative flex size-7 shrink-0 items-center justify-center bg-primary/15 text-primary">
            <ScanLine className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="hud-heading truncate text-[0.8rem] leading-tight font-medium">
              {mockup.name}
            </p>
            <p className="truncate text-[0.68rem] leading-tight text-muted-foreground">
              {mockup.detail}
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <Badge
            variant="outline"
            className={cn(
              "hidden rounded-none px-1.5 font-mono text-[0.65rem] sm:inline-flex",
              generating
                ? "animate-blink border-primary/50 bg-primary/10 text-primary"
                : "text-muted-foreground",
            )}
          >
            {generating ? (
              <Sparkles className="animate-pulse" />
            ) : (
              <ScanLine className="opacity-60" />
            )}
            <span className="text-hud">SIG</span>
            {bytes} o
          </Badge>

          <Separator orientation="vertical" className="mx-0.5 hidden h-5 sm:block" />

          <div className="flex items-center gap-0.5 rounded-sm border border-border/70 bg-background/60 p-0.5">
            <ZoomButton
              label="Réduire"
              disabled={zoom <= ZOOM_MIN}
              onClick={() => setZoom((value) => Math.max(ZOOM_MIN, value - 10))}
            >
              <Minus />
            </ZoomButton>
            <HudReadout label="ZM" value={`${zoom}%`} className="w-16 justify-center" />
            <ZoomButton
              label="Agrandir"
              disabled={zoom >= ZOOM_MAX}
              onClick={() => setZoom((value) => Math.min(ZOOM_MAX, value + 10))}
            >
              <Plus />
            </ZoomButton>
          </div>

          <ZoomButton label="Ajuster" active={zoom === 100} onClick={() => setZoom(100)}>
            <Maximize />
          </ZoomButton>
          <ZoomButton
            label="Grille"
            active={showGrid}
            onClick={() => setShowGrid((value) => !value)}
          >
            <Grid3x3 />
          </ZoomButton>
        </div>
      </div>

      <div
        className={cn(
          "relative flex min-h-0 flex-1 flex-col overflow-hidden",
          dock && "pb-20",
        )}
      >
        <div
          ref={ref}
          className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden"
          style={{ touchAction: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onPointerLeave={onPointerEnd}
        >
          {/* Règles graduées + marqueurs de visée aux coins de la scène. */}
          <span
            aria-hidden="true"
            className="ruler-x pointer-events-none absolute inset-x-0 top-0 h-2 opacity-60"
          />
          <span
            aria-hidden="true"
            className="ruler-y pointer-events-none absolute inset-y-0 left-0 w-2 opacity-60"
          />
          <HudCross className="top-3 left-4" />
          <HudCross className="top-3 right-4" />
          <HudCross className="bottom-3 left-4" />
          <HudCross className="bottom-3 right-4" />

          <span
            aria-hidden="true"
            className="text-hud pointer-events-none absolute top-3.5 left-6 hidden text-muted-foreground/60 @2xl/stage:block"
          >
            <HudLabel>ZONE — APERÇU</HudLabel>
          </span>

          <MockupScene
            mockup={mockup}
            className="animate-fade-in duration-500 ease-out"
          >
            <div className="group/artboard relative">
              <CodeArtboard
                design={state.design}
                payload={debouncedPayload}
                barcode={
                  type.id === "barcode"
                    ? {
                        symbology: values.symbology || "CODE128",
                        design: state.barcode,
                      }
                    : undefined
                }
                scale={scale}
                interactive
              />

              {/* Brackets de visée autour de l'artboard. */}
              <span className="pointer-events-none absolute -inset-2.5">
                <HudCorners inset="0" size="0.7rem" />
              </span>

              {/* Faisceau de scan pendant la régénération du code. */}
              <span
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute inset-0 overflow-hidden rounded-3xl transition-opacity duration-300",
                  generating ? "opacity-100" : "opacity-0",
                )}
              >
                <span className="hud-sweep absolute inset-x-0 top-0 h-1/3" />
              </span>

              <span
                className={cn(
                  "pointer-events-none absolute inset-0 rounded-3xl transition-opacity duration-300",
                  generating ? "opacity-100" : "opacity-0",
                )}
                style={{
                  boxShadow: "0 0 0 1px color-mix(in oklch, var(--primary), transparent 55%)",
                }}
              />
            </div>
          </MockupScene>

          {/* Grille « blueprint » en surimpression : peinte au-dessus du décor
              (le mockup couvre sinon la classe posée sur ce conteneur). */}
          {showGrid ? (
            <span
              aria-hidden="true"
              className="stage-grid pointer-events-none absolute inset-0 z-10"
            />
          ) : null}

          {/* Coordonnées de la vue, façon télémétrie. */}
          {hud ? (
            <span
              aria-hidden="true"
              className="text-hud pointer-events-none absolute right-4 bottom-2.5 hidden text-muted-foreground/50 md:block"
            >
              SCN.001 · {state.design.frameId.toUpperCase()} · Z{zoom}
            </span>
          ) : null}
        </div>

        {dock ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-4">
            <div className="pointer-events-auto">{dock}</div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ZoomButton({
  label,
  children,
  onClick,
  disabled,
  active,
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            onClick={onClick}
            aria-pressed={active}
            className={cn(
              "text-muted-foreground transition-colors",
              active && "bg-muted text-foreground",
            )}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
