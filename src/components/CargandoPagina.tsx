import { PageSkeleton } from "@/components/Skeleton";

/**
 * Pantalla de carga GLOBAL: fallback para cualquier ruta sin loading.tsx
 * propio más cercano. Las secciones del Mundial tenían las suyas y se
 * fueron con él (f7124c1); las secciones nuevas (/liga, /quiniela-liga,
 * /analisis, portada) se quedaron sin ninguna y al tocar un enlace la
 * página parecía colgada mientras el servidor traía los datos (reportado
 * por el dueño 21-ago). El esqueleto responde al toque al instante.
 */
export default function Loading() {
  return <PageSkeleton />;
}
