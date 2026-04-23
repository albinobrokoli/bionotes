import { useCallback, useEffect, useRef, useState } from 'react';

const flushCallbacks = new Set<() => Promise<void>>();

/** Pencere kapanırken veya global flush için tüm kayıtlı debounce kuyruklarını boşaltır. */
export function flushPendingSaves(): void {
  for (const fn of flushCallbacks) {
    void fn();
  }
}

type UseDebouncedSaveOptions<T> = {
  debounceMs?: number;
  save: (payload: T) => Promise<void>;
};

/**
 * Genel amaçlı debounced kayıt: varsayılan 800ms sessizlikten sonra `save` çağrılır.
 * Başarılı tamamlamada `savedAt` (epoch ms) güncellenir.
 */
export function useDebouncedSave<T>({ debounceMs = 800, save }: UseDebouncedSaveOptions<T>) {
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef<T | null>(null);
  const dirtyRef = useRef(false);
  const saveRef = useRef(save);
  saveRef.current = save;

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    while (dirtyRef.current && latestRef.current !== null) {
      const payload = latestRef.current;
      dirtyRef.current = false;
      try {
        await saveRef.current(payload);
        setSavedAt(Date.now());
      } catch {
        dirtyRef.current = true;
        break;
      }
    }
  }, []);

  const schedule = useCallback(
    (value: T) => {
      latestRef.current = value;
      dirtyRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        void flush();
      }, debounceMs);
    },
    [debounceMs, flush],
  );

  useEffect(() => {
    flushCallbacks.add(flush);
    return () => {
      flushCallbacks.delete(flush);
      void flush();
    };
  }, [flush]);

  return { schedule, flush, savedAt };
}
