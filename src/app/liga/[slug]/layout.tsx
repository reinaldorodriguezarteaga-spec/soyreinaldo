import type { Metadata } from "next";

/**
 * Todo /liga/[slug] fuera del índice de Google (22-nov-2026): clasificación,
 * calendario, cuadro, buscador, comparador y fichas de jugador son datos de
 * la API, iguales que en cualquier web de resultados, y AdSense los cuenta
 * como «contenido de poco valor». `follow` sigue activo para que Google llegue
 * por los enlaces a los análisis.
 *
 * Una página que declare sus propios `robots` manda sobre esto: la ficha de
 * partido se indexa cuando tiene un análisis del dueño (`conAnalisis`).
 */
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function LigaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
