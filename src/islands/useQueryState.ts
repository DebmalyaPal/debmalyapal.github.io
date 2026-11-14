import { useCallback, useEffect, useState } from 'react';

/**
 * Filter state mirrored into the URL query string (via replaceState, so history isn't spammed),
 * which makes filtered views shareable. Unknown values in the URL are ignored.
 */
export function useQueryState<K extends string>(keys: readonly K[], allowed: Partial<Record<K, readonly string[]>> = {}) {
  const empty = Object.fromEntries(keys.map((k) => [k, null])) as Record<K, string | null>;
  const [state, setState] = useState<Record<K, string | null>>(empty);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = { ...empty };
    for (const k of keys) {
      const v = params.get(k);
      const ok = allowed[k];
      if (v && (!ok || ok.includes(v))) next[k] = v;
    }
    setState(next);
    // Read once on mount; the URL is only written from here on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = useCallback((key: K, value: string | null) => {
    setState((prev) => {
      const next = { ...prev, [key]: value };
      const params = new URLSearchParams(window.location.search);
      for (const k of Object.keys(next) as K[]) {
        const v = next[k];
        if (v) params.set(k, v);
        else params.delete(k);
      }
      const qs = params.toString();
      window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    for (const k of keys) update(k, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [update]);

  return [state, update, reset] as const;
}
