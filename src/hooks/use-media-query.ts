import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/** ≥ 768 px : tablette et plus. */
export function useIsTablet(): boolean {
  return useMediaQuery("(min-width: 768px)");
}

/** ≥ 1024 px : bureau, disposition à trois panneaux. */
export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 1024px)");
}

/** ≥ 1440 px : très grand écran, panneaux élargis. */
export function useIsWide(): boolean {
  return useMediaQuery("(min-width: 1440px)");
}
