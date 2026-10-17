import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TarjetaLogro from "@/components/TarjetaLogro";
import { logroDuelo } from "@/lib/quiniela-liga/logros";

type P = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const l = await logroDuelo((await params).id);
  if (!l) return { title: "Duelo | Soy Reinaldo", robots: { index: false } };
  const title = `⚔️ ${l.ganador} gana el duelo a ${l.perdedor}`;
  return { title: `${title} | Soy Reinaldo`, robots: { index: false }, openGraph: { title } };
}

/** Tarjeta para compartir un duelo ganado (17-oct). */
export default async function LogroDueloPage({ params }: P) {
  const { id } = await params;
  const l = await logroDuelo(id);
  if (!l) notFound();
  return (
    <TarjetaLogro
      emoji="⚔️"
      titulo={`Duelo ganado · jornada ${l.jornada}`}
      nombre={l.ganador}
      detalle={`${l.ptsGanador} – ${l.ptsPerdedor} contra ${l.perdedor}`}
      url={`https://www.soyreinaldo.com/logro/duelo/${id}`}
      textoCompartir={`⚔️ Le he ganado el duelo a ${l.perdedor} en la jornada ${l.jornada} (${l.ptsGanador}–${l.ptsPerdedor}) en soyreinaldo.com. ¿Quién es el siguiente?`}
    />
  );
}
