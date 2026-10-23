import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CrearLiga, InvitarLiga, UnirseLiga } from "./formularios";

export const metadata: Metadata = {
  title: "Ligas de los juegos | Soy Reinaldo",
  description: "Crea una liga privada de los juegos de fútbol de Soy Reinaldo y compite solo con tus amigos en los retos del día.",
  alternates: { canonical: "/juegos/ligas" },
};

type Liga = { id: string; nombre: string; codigo: string };

/** Mis ligas privadas de los juegos (migración 090): crear, unirse, invitar. */
export default async function LigasJuegosPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  await connection();
  const { c } = await searchParams;
  const codigo = /^[A-Za-z0-9]{6}$/.test(c ?? "") ? c!.toUpperCase() : "";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data } = user
    ? await supabase
        .from("juego_liga_miembros")
        .select("liga:juego_ligas(id, nombre, codigo)")
        .eq("user_id", user.id)
        .order("created_at")
        .returns<{ liga: Liga | null }[]>()
    : { data: [] };
  const ligas = (data ?? []).flatMap((m) => (m.liga ? [m.liga] : []));
  const volver = `/juegos/ligas${codigo ? `?c=${codigo}` : ""}`;

  return (
    <main className="page">
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="wrap">
          <p className="eyebrow">
            <Link href="/juegos">Juegos</Link> · Ligas
          </p>
          <h1 className="feat__title" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", margin: "4px 0 6px" }}>
            Ligas con amigos
          </h1>
          <p style={{ color: "var(--text-dim)", margin: "0 0 18px", maxWidth: 680 }}>
            Un ranking solo para tu grupo: suman los mismos retos del día que el ranking general. Crea una liga, pasa el
            código por WhatsApp y a ver quién manda esta semana.
          </p>

          {!user ? (
            <div className="panel" style={{ padding: 18, maxWidth: 720 }}>
              <p style={{ margin: "0 0 12px" }}>
                {codigo ? `Te han invitado a una liga (código ${codigo}). ` : ""}Para crear o unirte a una liga necesitas
                una cuenta (gratis).
              </p>
              <Link href={`/login?redirect=${encodeURIComponent(volver)}`} className="btn btn--accent">
                Entrar
              </Link>
            </div>
          ) : (
            <div className="jg-ligas">
              {ligas.length > 0 && (
                <ul className="jg-ligas__lista">
                  {ligas.map((l) => (
                    <li key={l.id}>
                      <Link href={`/juegos/ligas/${l.id}`} className="jg-ligas__nombre">
                        {l.nombre} →
                      </Link>
                      <span className="jg-ligas__codigo">{l.codigo}</span>
                      <InvitarLiga nombre={l.nombre} codigo={l.codigo} />
                    </li>
                  ))}
                </ul>
              )}
              <div className="panel" style={{ padding: 16 }}>
                <h2 style={{ margin: "0 0 10px", fontSize: "1.05rem" }}>Unirme con un código</h2>
                <UnirseLiga inicial={codigo} />
              </div>
              <div className="panel" style={{ padding: 16 }}>
                <h2 style={{ margin: "0 0 10px", fontSize: "1.05rem" }}>Crear una liga</h2>
                <CrearLiga />
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
