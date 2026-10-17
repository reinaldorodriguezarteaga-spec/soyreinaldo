import { imagenLogro } from "@/lib/og-logro";
import { logroDuelo } from "@/lib/quiniela-liga/logros";

export const alt = "Duelo ganado en soyreinaldo.com";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 600;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const l = await logroDuelo((await params).id);
  return imagenLogro(
    l
      ? { emoji: "⚔️", titulo: `Duelo ganado · J${l.jornada}`, nombre: l.ganador, detalle: `${l.ptsGanador} – ${l.ptsPerdedor} contra ${l.perdedor}` }
      : { emoji: "⚔️", titulo: "Duelos", nombre: "soyreinaldo.com", detalle: "Reta a tus amigos" },
  );
}
