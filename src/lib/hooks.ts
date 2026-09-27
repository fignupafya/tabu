import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

const subscribeNothing = () => () => {};

/** True once hydrated: gate browser-only UI (localStorage, …) behind it to avoid mismatches. */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
}

/**
 * Page data rendered by the server (server mode) or loaded in the browser when `initial` is null
 * (static build). `reload` refreshes it after a change, in both modes. `load` must be a stable function.
 */
export function useLoadedData<T>(initial: T | null, load: () => Promise<T>) {
  const [data, setData] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    (isCurrent: () => boolean) =>
      load().then(
        (value) => {
          if (!isCurrent()) return;
          setData(value);
          setError(null);
        },
        (cause: unknown) => {
          if (isCurrent()) setError(cause instanceof Error ? cause.message : 'Yüklenemedi');
        },
      ),
    [load],
  );

  useEffect(() => {
    if (initial !== null) return;
    let current = true;
    void fetchData(() => current);
    return () => {
      current = false;
    };
  }, [initial, fetchData]);

  const reload = useCallback(() => fetchData(() => true), [fetchData]);
  return { data, error, reload };
}

/** Current time, refreshed every `intervalMs` while `active`. */
export function useNow(intervalMs: number, active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs]);
  return now;
}

/** Keeps the screen awake while `active` (needs a secure context; silently skipped otherwise). */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = () => {
      navigator.wakeLock
        .request('screen')
        .then((lock) => {
          if (cancelled) void lock.release();
          else sentinel = lock;
        })
        .catch(() => undefined);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') request();
    };

    request();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      void sentinel?.release().catch(() => undefined);
    };
  }, [active]);
}
