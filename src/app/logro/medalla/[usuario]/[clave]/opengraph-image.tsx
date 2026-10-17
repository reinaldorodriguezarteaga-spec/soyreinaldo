import { imagenLogro } from "@/lib/og-logro";
import { logroMedalla } from "@/lib/quiniela-liga/logros";

export const alt = "Medalla en soyreinaldo.com";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 600;

export default async function Image({ params }: { params: Promise<{ usuario: string; clave: string }> }) {
  const { usuario, clave } = await params;
  const l = await logroMedalla(decodeURIComponent(usuario), clave);
  return imagenLogro(
    l
      ? { emoji: l.medalla.emoji, titulo: l.medalla.nombre, nombre: l.nombre, detalle: l.medalla.descripcion }
      : { emoji: "⚽", titulo: "Pronósticos", nombre: "soyreinaldo.com", detalle: "Pronostica y compite gratis" },
  );
}
