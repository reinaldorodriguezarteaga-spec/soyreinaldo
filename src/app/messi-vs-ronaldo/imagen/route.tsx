import { imagenGoats } from "@/lib/og-goats";

/** La imagen vertical que comparte el botón «Compartir imagen» (18-oct). */
// Al vuelo (generarla en el build fallaba); la CDN la guarda 10 min por
// la cabecera Cache-Control de `imagenGoats`.
export const dynamic = "force-dynamic";

export function GET() {
  return imagenGoats("vertical");
}
