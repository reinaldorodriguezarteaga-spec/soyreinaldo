"use client";

import { Children, createContext, useContext } from "react";
import { termino } from "@/lib/termino";

/** ¿Estamos dentro de la app nativa? Lo pone el layout (isAppRequest). */
const EnAppContext = createContext(false);

export function EnAppProvider({ enApp, children }: { enApp: boolean; children: React.ReactNode }) {
  return <EnAppContext.Provider value={enApp}>{children}</EnAppContext.Provider>;
}

export function useEnApp(): boolean {
  return useContext(EnAppContext);
}

/** Para Client Components: `const t = useTermino(); t("Quiniela")`. */
export function useTermino(): (texto: string) => string {
  const enApp = useContext(EnAppContext);
  return (texto: string) => termino(texto, enApp);
}

/**
 * `<T>Elige tu quiniela</T>`: sin "quiniela" ni "pronóstico", en la web y en
 * la app. Vale en Server y Client Components; solo toca los trozos de
 * texto directos (no entra en elementos anidados: envuélvelos aparte).
 */
export function T({ children }: { children: React.ReactNode }) {
  // Desde el 23-nov-2026 también en la web (ver lib/termino.ts).
  return <>{Children.map(children, (c) => (typeof c === "string" ? termino(c, true) : c))}</>;
}
