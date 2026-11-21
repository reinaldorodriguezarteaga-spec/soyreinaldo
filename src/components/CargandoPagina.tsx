import { PageSkeleton } from "@/components/Skeleton";

/**
 * Pantalla de carga de las secciones con datos pesados. Cada una la usa desde
 * su propio loading.tsx.
 *
 * 21-nov-2026: antes era el loading.tsx de la RAÍZ y envolvía TODAS las
 * páginas, así que el HTML de los análisis y de las páginas legales llegaba
 * con «Cargando…» y el texto escondido detrás (también para los robots de
 * Google: lo señaló la auditoría para AdSense). Ahora esas páginas no tienen
 * pantalla de carga y su texto viene visible desde el primer byte.
 *
 * Historia: era la pantalla de carga GLOBAL: fallback para cualquier ruta sin loading.tsx
 * propio más cercano. Las secciones del Mundial tenían las suyas y se
 * fueron con él (f7124c1); las secciones nuevas (/liga, /quiniela-liga,
 * /analisis, portada) se quedaron sin ninguna y al tocar un enlace la
 * página parecía colgada mientras el servidor traía los datos (reportado
 * por el dueño 21-ago). El esqueleto responde al toque al instante.
 */
export default function CargandoPagina() {
  return <PageSkeleton />;
}
