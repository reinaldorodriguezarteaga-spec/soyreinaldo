import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { lunesDeLaSemana, numeroDelDia } from "@/lib/juegos/diario";

export const metadata: Metadata = {
  title: "Ranking de los juegos | Soy Reinaldo",
  description: "La clasificación de los retos diarios de los juegos de fútbol de Soy Reinaldo: esta semana y de siempre.",
  alternates: { canonical: "/juegos/ranking" },
};

type Fila = { user_id: string; nombre: string; puntos: number; partidas: number };

/** Ranking de los retos diarios (migración 085). La semana empieza el lunes. */
export default async function RankingJuegosPage({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  await connection();
  const { v } = await searchParams;
  const total = v === "total";
  const hoy = numeroDelDia();
  const lunes = lunesDeLaSemana(hoy);
  const supabase = await createClient();
  const [{ data }, { data: auth }] = await Promise.all([
    supabase.rpc("juegos_ranking", { p_desde_dia: total ? 1 : lunes, p_limite: 100 }),
    supabase.auth.getUser(),
  ]);
  const filas = (data ?? []) as Fila[];
  const yo = auth.user?.id ?? null;

  return (
    <main className="page">
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="wrap">
          <p className="eyebrow">
            <Link href="/juegos">Juegos</Link> · Ranking
          </p>
          <h1 className="feat__title" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", margin: "4px 0 6px" }}>
            Ranking de los juegos
          </h1>
          <p style={{ color: "var(--text-dim)", margin: "0 0 14px", maxWidth: 680 }}>
            Suman los retos del día de cada juego (la primera partida). Cuanto más difícil el nivel, menos tiempo y más
            puntos.
          </p>
          <nav className="qc-vistas" style={{ marginBottom: 14 }}>
            <Link href="/juegos/ranking" className={`chip-pill${total ? "" : " on"}`}>
              Esta semana
            </Link>
            <Link href="/juegos/ranking?v=total" className={`chip-pill${total ? " on" : ""}`}>
              De siempre
            </Link>
            <Link href="/juegos/ligas" className="chip-pill">
              👥 Mis ligas
            </Link>
          </nav>
          <div className="panel" style={{ padding: 8, maxWidth: 720 }}>
            {filas.length === 0 ? (
              <p className="pz-ayuda" style={{ padding: 16 }}>
                Aún no hay puntos {total ? "" : "esta semana"}. <Link href="/juegos">¡Juega el reto de hoy y estrena el ranking!</Link>
              </p>
            ) : (
              <ol className="ao-clasif">
                {filas.map((f, i) => (
                  <li key={f.user_id} className={f.user_id === yo ? "is-yo" : ""}>
                    <span className="ao-clasif__pos">{i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</span>
                    <span className="ao-clasif__n">{f.nombre}</span>
                    <span className="ao-clasif__p">
                      {f.partidas} {f.partidas === 1 ? "reto" : "retos"} · <b>{f.puntos}</b>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
