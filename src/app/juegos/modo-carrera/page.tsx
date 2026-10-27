import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import ModoCarrera from "./juego";
import type { FilaTop } from "./acciones";

export const metadata: Metadata = {
  title: "Modo carrera: de segunda división al Balón de Oro | Juegos · Soy Reinaldo",
  description:
    "Crea tu jugador con 17 años en un equipo de segunda y decide cada temporada. Goles, títulos, fichajes por el Madrid, el Barça o el City… ¿hasta dónde llegas?",
  alternates: { canonical: "/juegos/modo-carrera" },
};

/** Modo carrera (27-oct, pedido del dueño). */
export default async function ModoCarreraPage() {
  await connection();
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    { data: rapida },
    { data: extendida },
    { data: mundiales },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.rpc("carrera_top", { p_limite: 10, p_modo: "rapida" }),
    supabase.rpc("carrera_top", { p_limite: 10, p_modo: "extendida" }),
    supabase.rpc("carrera_top_mundiales", { p_limite: 10 }),
  ]);
  return (
    <main className="page">
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="wrap" style={{ maxWidth: 860 }}>
          <p className="eyebrow">
            <Link href="/juegos">Juegos</Link> · Modo carrera
          </p>
          <h1 className="feat__title" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", margin: "4px 0 6px" }}>
            Modo carrera
          </h1>
          <p style={{ color: "var(--text-dim)", margin: "0 0 18px", maxWidth: 640 }}>
            Empiezas con 17 años en un equipo de segunda. Cada temporada eliges qué hacer, juegas y te llegan ofertas
            según tu rendimiento. ¿Llegarás al Madrid, al Barça o al City? ¿Cuándo colgarás las botas? Las mejores
            carreras entran en el top 10.
          </p>
          <ModoCarrera
            conSesion={!!user}
            topsIniciales={{
              rapida: (rapida ?? []) as FilaTop[],
              extendida: (extendida ?? []) as FilaTop[],
              mundiales: (mundiales ?? []) as FilaTop[],
            }}
          />
        </div>
      </section>
    </main>
  );
}
