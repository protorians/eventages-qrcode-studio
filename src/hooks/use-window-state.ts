import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauriRuntime } from "@/lib/tauri";

/**
 * État de placement de la fenêtre native : maximisée ou plein écran.
 * S'abonne au redimensionnement natif pour rester synchronisé (double-clic
 * sur la barre de titre, Win+Haut, OS gestes…).
 */
export function useWindowState(): { maximized: boolean; fullscreen: boolean } {
  const [state, setState] = useState({ maximized: false, fullscreen: false });

  useEffect(() => {
    if (!isTauriRuntime()) return;
    const appWindow = getCurrentWindow();
    let unlisten: (() => void) | null = null;
    let disposed = false;

    const sample = async () => {
      const [maximized, fullscreen] = await Promise.all([
        appWindow.isMaximized().catch(() => false),
        appWindow.isFullscreen().catch(() => false),
      ]);
      if (!disposed) setState({ maximized, fullscreen });
    };

    void appWindow.onResized(() => void sample()).then((fn) => {
      if (disposed) fn();
      else unlisten = fn;
    });
    void sample();

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  return state;
}
