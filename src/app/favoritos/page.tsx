import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { COMPETITIONS_BY_SLUG } from "@/lib/sports/competitions";

export const metadata: Metadata = {
  title: "Mis favoritos | Soy Reinaldo",
  robots: { index: false },
};

type Fila = { kind: "competition" | "team" | "player"; ref_id: string; label: string; link_path: string };

const GRUPOS: { kind: Fila["kind"]; titulo: string }[] = [
  { kind: "team", titulo: "Equipos" },
  { kind: "competition", titulo: "Competiciones" },
  { kind: "player", titulo: "Jugadores" },
];

function imagen(f: Fila): string | null {
  const base = "https://media.api-sports.io/football";
  if (f.kind === "team") return `${base}/teams/${f.ref_id}.png`;
  if (f.kind === "player") return `${base}/players/${f.ref_id}.png`;
  const liga = COMPETITIONS_BY_SLUG[f.ref_id]?.leagueId;
  return liga ? `${base}/leagues/${liga}.png` : null;
}

/** Pestaña «Favoritos» de la barra de abajo (31-oct): todo lo que sigues, en lista. */
export default async function FavoritosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data } = user
    ? await supabase
        .from("user_favorites")
        .select("kind, ref_id, label, link_path")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
    : { data: null };
  // Hay favoritos repetidos de antes (misma liga dos veces): uno de cada.
  const vistos = new Set<string>();
  const filas = ((data ?? []) as Fila[]).filter((f) => {
    const k = `${f.kind}:${f.ref_id}`;
    return vistos.has(k) ? false : (vistos.add(k), true);
  });

  return (
    <main className="page">
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="wrap">
          <p className="eyebrow">Favoritos</p>
          <h1 className="feat__title" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", margin: "4px 0 18px" }}>
            Mis favoritos
          </h1>

          {!user ? (
            <div className="panel fav-vacio">
              <p>Entra para guardar tus equipos, competiciones y jugadores y tenerlos aquí a mano.</p>
              <Link href="/login?redirect=/favoritos" className="btn btn--accent">
                Entrar
              </Link>
            </div>
          ) : filas.length === 0 ? (
            <div className="panel fav-vacio">
              <p>Aún no sigues nada. Toca la ★ en cualquier equipo, competición o jugador y aparecerá aquí.</p>
              <Link href="/liga/laliga" className="btn btn--accent">
                Ir a LaLiga
              </Link>
            </div>
          ) : (
            GRUPOS.map((g) => {
              const lista = filas.filter((f) => f.kind === g.kind);
              if (!lista.length) return null;
              return (
                <div key={g.kind} className="fav-grupo">
                  <h2 className="fav-grupo__h">{g.titulo}</h2>
                  <ul className="fav-lista panel">
                    {lista.map((f) => {
                      const src = imagen(f);
                      return (
                        <li key={`${f.kind}-${f.ref_id}`}>
                          <Link href={f.link_path}>
                            {src ? (
                              // eslint-disable-next-line @next/next/no-img-element -- escudo de la CDN de la API
                              <img src={src} alt="" width={32} height={32} loading="lazy" className={f.kind === "player" ? "is-cara" : f.kind === "competition" ? "is-liga" : ""} />
                            ) : (
                              <span className="fav-lista__hueco" aria-hidden />
                            )}
                            <span>{f.label}</span>
                            <span className="fav-lista__ir" aria-hidden>
                              ›
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })
          )}
          {user && filas.length > 0 && (
            <p className="fav-nota">Para añadir o quitar, toca la ★ en la página del equipo, la competición o el jugador.</p>
          )}
        </div>
      </section>
    </main>
  );
}
