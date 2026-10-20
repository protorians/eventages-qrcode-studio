/** Utilitaires d'intégration Tauri : détection du shell natif et conversions. */

/** Vrai si l'app tourne dans le shell Tauri (desktop) plutôt que dans un simple navigateur. */
export function isTauriRuntime(): boolean {
  return (
    typeof window !== "undefined" &&
    ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
  );
}

/** Système d'exploitation hôte du shell natif (ou « web » hors Tauri). */
export type DesktopOS = "macos" | "windows" | "linux" | "web";

/**
 * Détecte l'OS hôte via le user-agent de la webview (fiable dans le shell
 * Tauri : le UA correspond à l'OS natif, pas au navigateur portable).
 */
export function detectOS(): DesktopOS {
  if (!isTauriRuntime()) return "web";
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent.toLowerCase();
  if (ua.includes("mac os x")) return "macos";
  if (ua.includes("windows nt")) return "windows";
  return "linux";
}

/** Pose `data-os` sur <html> pour les adaptations CSS spécifiques à l'OS. */
export function applyPlatformDomFlags(): void {
  document.documentElement.dataset.os = detectOS();
}

/** Lit un blob en base64 pur (sans préfixe data:) pour les commandes natives. */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("Lecture du rendu impossible"));
    reader.readAsDataURL(blob);
  });
}
