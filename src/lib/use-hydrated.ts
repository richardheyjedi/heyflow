"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * false durante o SSR e a PRIMEIRA renderização da hidratação; true depois.
 * Útil para conteúdo client-only (ex.: gráficos lazy) manter a primeira
 * renderização idêntica ao HTML do servidor — sem useEffect + setState.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
