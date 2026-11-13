import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { numeroDelDia } from "@/lib/juegos/diario";
import { JUGADORES_FOTO, fotoDelDia } from "@/lib/juegos/foto-oculta";
import Juego from "./juego";
import ComoSeJuega from "@/components/juegos/ComoSeJuega";

export const metadata: Metadata = {
  title: "Foto oculta | Juegos · Soy Reinaldo",
  description: "La foto de un futbolista tapada por trozos: cada fallo destapa uno. ¿Quién es? Seis intentos, reto diario y práctica.",
  alternates: { canonical: "/juegos/foto-oculta" },
};

export default async function FotoOcultaPage() {
  // El reto cambia cada día: la página no puede quedarse prerenderizada.
  await connection();
  const numero = numeroDelDia();
  return (
    <main className="page">
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="wrap">
          <p className="eyebrow">
            <Link href="/juegos">Juegos</Link> · Foto oculta
          </p>
          <h1 className="feat__title" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", margin: "4px 0 6px" }}>
            Foto oculta
          </h1>
          <p style={{ color: "var(--text-dim)", margin: "0 0 18px", maxWidth: 640 }}>
            Un futbolista de hoy con la foto tapada. Cada fallo destapa un trozo más. Tienes seis intentos.
          </p>
          <Juego numero={numero} objetivoDia={fotoDelDia(numero)} jugadores={JUGADORES_FOTO} />
          <ComoSeJuega juego="foto-oculta" nombre="Foto oculta" />
        </div>
      </section>
    </main>
  );
}
