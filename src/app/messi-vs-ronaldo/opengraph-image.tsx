import { imagenGoats } from "@/lib/og-goats";

export const alt = "Messi vs Cristiano: goles, asistencias y partidos de carrera";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Al vuelo (generarla en el build fallaba); la CDN la guarda 10 min por
// la cabecera Cache-Control de `imagenGoats`.
export const dynamic = "force-dynamic";

export default function Image() {
  return imagenGoats("enlace");
}
