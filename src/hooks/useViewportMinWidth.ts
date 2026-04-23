import { useSyncExternalStore } from 'react';

/** Dar ekran eşiği (px); altında split yerine sekme düzeni kullanılır. */
export function useViewportMinWidth(minPx: number) {
  const query = `(min-width: ${minPx}px)`;
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => true,
  );
}
