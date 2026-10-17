import { imagenLogro } from "@/lib/og-logro";
import { cargarInvitacion } from "@/lib/quiniela-liga/invitacion";

export const alt = "Te reto en soyreinaldo.com";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 600;

export default async function Image({ params }: { params: Promise<{ usuario: string }> }) {
  const inv = await cargarInvitacion(decodeURIComponent((await params).usuario), null);
  return imagenLogro({
    emoji: "⚔️",
    titulo: inv?.jornada ? `Duelo · jornada ${inv.jornada}` : "Duelo",
    nombre: inv ? `${inv.retador} te reta` : "Te reto",
    detalle: "¿Quién saca más puntos? Acepta en soyreinaldo.com",
  });
}
