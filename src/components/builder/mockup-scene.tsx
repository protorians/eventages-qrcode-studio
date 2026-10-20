import type { ReactNode } from "react";
import type { Mockup } from "@/lib/qr-design";
import { cn } from "@/lib/utils";

/**
 * Met le QR en situation dans un décor (spec 004 : illustrations « mockup »).
 * Le décor est purement décoratif ; seul le QR reste interactif et exact.
 */
export function MockupScene({
  mockup,
  children,
  className,
}: {
  mockup: Mockup;
  children: ReactNode;
  className?: string;
}) {
  const caption = (
    <span
      className="pointer-events-none absolute bottom-3 left-4 text-[0.6rem] font-medium tracking-[0.28em] uppercase opacity-50"
      style={{ color: mockup.dark ? "#e2e8f0" : "#0f172a" }}
    >
      Eventages Lite
    </span>
  );

  switch (mockup.id) {
    case "poster":
      return (
        <div
          className={cn(
            "relative flex size-full items-end justify-center overflow-hidden",
            className,
          )}
          style={{ background: mockup.surface }}
        >
          <span
            className="pointer-events-none absolute top-8 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full blur-3xl"
            style={{ background: mockup.accent, opacity: 0.55 }}
          />
          <span
            className="pointer-events-none absolute top-10 left-6 text-[0.65rem] font-semibold tracking-[0.3em] uppercase"
            style={{ color: mockup.accent }}
          >
            Affiche
          </span>
          <span
            className="pointer-events-none absolute top-16 left-6 max-w-[16rem] text-2xl leading-tight font-bold text-white"
          >
            Scannez pour découvrir
          </span>
          <div className="mb-12">{children}</div>
          {caption}
        </div>
      );

    case "card":
      return (
        <div
          className={cn("relative flex size-full items-center justify-center", className)}
          style={{ background: mockup.surface }}
        >
          <div
            className="relative flex aspect-[85/55] w-[min(92%,30rem)] items-center gap-6 rounded-2xl p-6 shadow-2xl shadow-black/15 ring-1 ring-black/5"
            style={{ background: "#ffffff" }}
          >
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-[0.6rem] font-semibold tracking-[0.3em] uppercase text-slate-400">
                Contact
              </p>
              <p className="text-lg font-bold text-slate-900">Studio Créatif</p>
              <p className="text-xs text-slate-500">02 40 12 34 56 · studio.fr</p>
              <div className="h-0.5 w-10 rounded-full" style={{ background: mockup.accent }} />
            </div>
            <div className="shrink-0">{children}</div>
          </div>
          {caption}
        </div>
      );

    case "table":
      return (
        <div
          className={cn("relative flex size-full items-center justify-center", className)}
          style={{
            background: `radial-gradient(circle at 50% 20%, ${mockup.surface}, #0c0a09)`,
          }}
        >
          <div className="flex w-[min(80%,24rem)] flex-col items-center gap-3">
            <span
              className="text-[0.6rem] font-semibold tracking-[0.34em] uppercase"
              style={{ color: mockup.accent }}
            >
              Carte du jour
            </span>
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-white/95 p-4 shadow-2xl shadow-black/40 ring-1 ring-white/20">
              {children}
              <span className="text-[0.65rem] font-medium text-slate-500">
                Le menu s&apos;ouvre sur votre téléphone
              </span>
            </div>
          </div>
          {caption}
        </div>
      );

    case "packaging":
      return (
        <div
          className={cn("relative flex size-full items-center justify-center", className)}
          style={{
            background: `linear-gradient(160deg, ${mockup.surface}, #ffffff)`,
          }}
        >
          <div className="relative flex w-[min(78%,22rem)] flex-col items-center gap-3 rounded-[1.75rem] bg-white p-5 shadow-xl shadow-emerald-900/10 ring-1 ring-emerald-900/5">
            <div
              className="absolute -top-3 left-1/2 h-1.5 w-16 -translate-x-1/2 rounded-full"
              style={{ background: mockup.accent }}
            />
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-emerald-700">
              Origine tracée
            </p>
            {children}
            <p className="text-center text-[0.65rem] leading-relaxed text-slate-500">
              Nutrition, allergènes et certifications complètes
            </p>
          </div>
          {caption}
        </div>
      );

    case "screen":
      return (
        <div
          className={cn("relative flex size-full items-center justify-center", className)}
          style={{ background: mockup.surface }}
        >
          <div className="relative flex w-[min(88%,34rem)] items-center gap-6 rounded-3xl border border-white/10 bg-black/40 p-6 backdrop-blur">
            <span
              className="absolute -top-px left-8 h-px w-24"
              style={{ background: mockup.accent }}
            />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-[0.6rem] font-semibold tracking-[0.32em] uppercase text-white/45">
                Session en cours
              </p>
              <p className="text-xl font-semibold text-white">Rejoignez la présentation</p>
              <p className="text-xs text-white/50">
                Ouvrez l&apos;appareil photo, visez le code.
              </p>
            </div>
            <div className="shrink-0">{children}</div>
          </div>
          {caption}
        </div>
      );

    case "sticker":
      return (
        <div
          className={cn("relative flex size-full items-center justify-center", className)}
          style={{ background: mockup.surface }}
        >
          <div className="relative flex items-center justify-center">
            <span
              className="absolute size-[130%] rounded-full opacity-25 blur-2xl"
              style={{ background: mockup.accent }}
            />
            <div className="rounded-[2rem] bg-white p-5 shadow-xl shadow-red-500/10 ring-1 ring-red-500/10">
              {children}
            </div>
          </div>
          {caption}
        </div>
      );

    case "tshirt":
      return (
        <div
          className={cn("relative flex size-full items-center justify-center", className)}
          style={{
            background: `linear-gradient(180deg, #f8fafc, ${mockup.surface})`,
          }}
        >
          <div className="relative flex flex-col items-center">
            <span
              className="absolute -top-6 h-8 w-24 rounded-b-full border-x border-b"
              style={{ borderColor: "#cbd5e1" }}
            />
            <div
              className="flex w-[min(70%,20rem)] flex-col items-center gap-4 rounded-[2.5rem_2.5rem_1.5rem_1.5rem] bg-white px-8 py-10 shadow-lg shadow-slate-400/25"
            >
              <span
                className="text-[0.6rem] font-semibold tracking-[0.3em] uppercase"
                style={{ color: mockup.accent }}
              >
                Portez-le
              </span>
              {children}
            </div>
          </div>
          {caption}
        </div>
      );

    default:
      return (
        <div
          className={cn(
            "surface-checker relative flex size-full items-center justify-center",
            className,
          )}
        >
          {children}
        </div>
      );
  }
}
