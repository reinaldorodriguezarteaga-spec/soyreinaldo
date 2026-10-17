import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TarjetaLogro from "@/components/TarjetaLogro";
import { logroMedalla } from "@/lib/quiniela-liga/logros";

type P = { params: Promise<{ usuario: string; clave: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { usuario, clave } = await params;
  const l = await logroMedalla(decodeURIComponent(usuario), clave);
  if (!l) return { title: "Logro | Soy Reinaldo", robots: { index: false } };
  const title = `${l.medalla.emoji} ${l.nombre}: ${l.medalla.nombre}`;
  return { title: `${title} | Soy Reinaldo`, description: l.medalla.descripcion, robots: { index: false }, openGraph: { title } };
}

/** Tarjeta para compartir una medalla de los pronósticos (17-oct). */
export default async function LogroMedallaPage({ params }: P) {
  const { usuario, clave } = await params;
  const l = await logroMedalla(decodeURIComponent(usuario), clave);
  if (!l) notFound();
  const { medalla: m, nombre } = l;
  return (
    <TarjetaLogro
      emoji={m.emoji}
      titulo={m.nombre}
      nombre={nombre}
      detalle={`${m.descripcion}${m.veces > 1 ? ` · ×${m.veces}` : ""}`}
      url={`https://www.soyreinaldo.com/logro/medalla/${encodeURIComponent(usuario)}/${clave}`}
      textoCompartir={`${m.emoji} He conseguido la medalla «${m.nombre}» en los pronósticos de soyreinaldo.com. ¿Te atreves?`}
    />
  );
}
