import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { lunesDeLaSemana, numeroDelDia } from "@/lib/juegos/diario";
import { InvitarLiga, SalirLiga } from "../formularios";

export const metadata: Metadata = {
  title: "Liga de los juegos | Soy Reinaldo",
  robots: { index: false },
};

type Fila = { user_id: string; nombre: string; puntos: number; partidas: number };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Clasificación de una liga privada (migración 090): solo la ven sus miembros. */
export default async function LigaJuegosPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ v?: string }>;
}) {
  await connection();
  const [{ id }, { v }] = await Promise.all([params, searchParams]);
  if (!UUID_RE.test(id)) notFound();
  const total = v === "total";
  const hoy = numeroDelDia();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const [{ data: liga }, { data }] = await Promise.all([
    supabase.from("juego_ligas").select("nombre, codigo").eq("id", id).maybeSingle<{ nombre: string; codigo: string }>(),
    supabase.rpc("juegos_ranking_liga", { p_liga: id, p_desde_dia: total ? 1 : lunesDeLaSemana(hoy) }),
  ]);
  if (!liga) notFound();
  const filas = (data ?? []) as Fila[];
  const base = `/juegos/ligas/${id}`;

  return (
    <main className="page">
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="wrap">
          <p className="eyebrow">
            <Link href="/juegos">Juegos</Link> · <Link href="/juegos/ligas">Ligas</Link>
          </p>
          <h1 className="feat__title" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", margin: "4px 0 6px" }}>
            {liga.nombre}
          </h1>
          <p style={{ color: "var(--text-dim)", margin: "0 0 14px", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            Código <span className="jg-ligas__codigo">{liga.codigo}</span>
            <InvitarLiga nombre={liga.nombre} codigo={liga.codigo} />
          </p>
          <nav className="qc-vistas" style={{ marginBottom: 14 }}>
            <Link href={base} className={`chip-pill${total ? "" : " on"}`}>
              Esta semana
            </Link>
            <Link href={`${base}?v=total`} className={`chip-pill${total ? " on" : ""}`}>
              De siempre
            </Link>
          </nav>
          <div className="panel" style={{ padding: 8, maxWidth: 720 }}>
            <ol className="ao-clasif">
              {filas.map((f, i) => (
                <li key={f.user_id} className={f.user_id === user.id ? "is-yo" : ""}>
                  <span className="ao-clasif__pos">{f.puntos > 0 && i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</span>
                  <span className="ao-clasif__n">{f.nombre}</span>
                  <span className="ao-clasif__p">
                    {f.partidas} {f.partidas === 1 ? "reto" : "retos"} · <b>{f.puntos}</b>
                  </span>
                </li>
              ))}
            </ol>
          </div>
          {filas.length < 2 && (
            <p className="pz-ayuda" style={{ marginTop: 12 }}>
              De momento estás solo: dale a «Invitar» y pasa el enlace a tus amigos.
            </p>
          )}
          <p style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/juegos" className="btn btn--accent">
              Jugar el reto de hoy
            </Link>
            <SalirLiga id={id} />
          </p>
        </div>
      </section>
    </main>
  );
}
