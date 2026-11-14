import { useEffect, useState, type CSSProperties } from 'react';

/**
 * Mirrors <html data-motion>, which the head script keeps in sync with the OS
 * prefers-reduced-motion setting. Starts as "reduced" so server-rendered markup is the static version and
 * nothing animates before hydration.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setReduced(root.dataset.motion === 'reduced');
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ['data-motion'] });
    return () => observer.disconnect();
  }, []);
  return reduced;
}

/** Reports the current theme so canvas/SVG code can re-read CSS colors when it changes. */
export function useThemeVersion(): string {
  const [theme, setTheme] = useState('dark');
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setTheme(root.dataset.theme ?? 'dark');
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);
  return theme;
}

/**
 * SVG geometry (`r`, `cy`, `d`) set through CSS so `.svg-ease` can transition it.
 * React's CSSProperties type does not list these SVG properties, hence the cast.
 */
export function svgStyle(props: { r?: number; cy?: number; d?: string }): CSSProperties {
  return props as CSSProperties;
}
