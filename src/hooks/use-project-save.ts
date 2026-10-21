import { useCallback, useEffect, useState } from "react";
import { useBuilder } from "@/lib/builder-store";
import { useT } from "@/lib/i18n";
import { describeError } from "@/lib/qcp";
import { isTauriRuntime } from "@/lib/tauri";

/**
 * Enregistrement du brouillon actif (fichier .qrd lié, sinon boîte de
 * dialogue « Enregistrer sous… »), partagé par le bouton de la barre de
 * titre (project-actions.tsx) et le menu Fichier de la menubar native
 * (native-menu.tsx). Le store d'éditeur ne porte qu'un brouillon à la fois
 * (celui de l'onglet actif) : ces actions n'impactent que l'onglet courant,
 * jamais les autres.
 *
 * `shortcuts` pose les raccourcis clavier (⌘S enregistre, ⌘⇧S propose
 * « Enregistrer sous… ») — à n'activer que dans un seul consommateur pour
 * ne pas enregistrer deux fois. Sous le shell Tauri, ces raccourcis sont
 * des accélérateurs de la menubar native qui route elle-même vers runSave :
 * les écouteurs JS ne sont posés que hors Tauri (dev navigateur).
 */
export function useProjectSave({ shortcuts = false }: { shortcuts?: boolean } = {}) {
  const { dirty, saveProject, saveProjectAsQcp } = useBuilder();
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Sauvegarde manuelle (fichier lié, sinon boîte de dialogue). */
  const runSave = useCallback(
    async (mode: "save" | "saveAs") => {
      if (busy) return;
      setBusy(true);
      setError(null);
      try {
        if (mode === "save") await saveProject();
        else await saveProjectAsQcp();
        setFlash(true);
        window.setTimeout(() => setFlash(false), 2000);
      } catch (cause) {
        setError(describeError(cause, t("save.erreur")));
        window.setTimeout(() => setError(null), 6000);
      } finally {
        setBusy(false);
      }
    },
    [busy, saveProject, saveProjectAsQcp, t],
  );

  // Raccourcis clavier (navigateur uniquement) : ⌘S enregistre, ⌘⇧S propose
  // « Enregistrer sous… ». Sous Tauri, la menubar native détient ⌘S/⌘⇧S.
  useEffect(() => {
    if (!shortcuts || isTauriRuntime()) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "s") return;
      event.preventDefault();
      event.stopPropagation();
      void runSave(event.shiftKey ? "saveAs" : "save");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shortcuts, runSave]);

  return { dirty, busy, flash, error, runSave };
}
