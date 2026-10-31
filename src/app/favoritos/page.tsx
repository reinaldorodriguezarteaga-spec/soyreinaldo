import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import MiEquipoCard from "@/components/MiEquipoCard";
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
        <div className="wrap ios">
          <header className="ios__cab">
            <h1 className="ios__titulo">Favoritos</h1>
          </header>

          {!user ? (
            <div className="lista lista__vacia">
              <p>Entra para guardar tus equipos, competiciones y jugadores y tenerlos aquí a mano.</p>
              <Link href="/login?redirect=/favoritos" className="btn btn--accent">
                Entrar
              </Link>
            </div>
          ) : filas.length === 0 ? (
            <div className="lista lista__vacia">
              <p>Aún no sigues nada. Toca la estrella en cualquier equipo, competición o jugador y aparecerá aquí.</p>
              <Link href="/liga/laliga" className="btn btn--accent">
                Ir a LaLiga
              </Link>
            </div>
          ) : (
            <>
              <MiEquipoCard />
              {GRUPOS.map((g) => {
                const lista = filas.filter((f) => f.kind === g.kind);
                if (!lista.length) return null;
                return (
                  <section key={g.kind} className="lista-grupo">
                    <h2 className="lista-grupo__h">{g.titulo}</h2>
                    <ul className="lista">
                      {lista.map((f) => {
                        const src = imagen(f);
                        return (
                          <li key={`${f.kind}-${f.ref_id}`}>
                            <Link href={f.link_path} className="lista__fila">
                              {src ? (
                                // eslint-disable-next-line @next/next/no-img-element -- escudo de la CDN de la API
                                <img src={src} alt="" width={36} height={36} loading="lazy" className={f.kind === "player" ? "is-cara" : f.kind === "competition" ? "is-liga" : ""} />
                              ) : (
                                <span className="lista__hueco" aria-hidden />
                              )}
                              <span className="lista__txt">
                                <b>{f.label}</b>
                              </span>
                              <ChevronRight className="lista__ir" aria-hidden />
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
              <p className="ios__nota">Toca la estrella en un equipo, una competición o un jugador para añadirlo o quitarlo.</p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
