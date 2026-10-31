import { Trophy, Lock } from "lucide-react";
import Icono from "@/components/Icono";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMyClubLeagues, type ClubLeague } from "@/lib/quiniela-liga/leagues";
import JoinCodeForm from "./join-code-form";
import { getBaremoPublico } from "@/lib/quiniela-liga/baremo";
import { textoBaremo } from "@/lib/quiniela-liga/league-utils";
import { T } from "@/components/EnApp";
import { COMPETICION_CHAMPIONS, TEMPORADA_CHAMPIONS } from "@/lib/quiniela-liga/champions";

export const metadata = {
  alternates: { canonical: "/quiniela-liga" },
  title: "Elige tu quiniela | Soy Reinaldo",
  description:
    "Entra a la quiniela general de LaLiga o a la quiniela privada de tu comunidad.",
};

/** Id (estable) de la liga pública general. El CÓDIGO y el NOMBRE se leen
 * de la BD en vivo — el dueño puede renombrarlos desde el panel de admin de
 * liga, y un código hardcodeado aquí rompía el botón "Unirme" para todo el
 * mundo (incidente 18-ago: la liga pasó de LALIGA2627 a CONOS y el enlace
 * /unirse/LALIGA2627 daba "Liga no encontrada"). */
const PUBLIC_LEAGUE_ID = "9f992fa0-5f45-4204-87a7-b4c5feda6ae1";

/** Quinielas privadas que se ANUNCIAN en el selector aunque no seas miembro
 * (con candado: el botón lleva al formulario del código, nunca entra
 * directo — el código sigue siendo la llave). Pedido del dueño: que la de
 * Pacha se vea debajo de la general. */
const FEATURED_PRIVATE_CODES = ["PACHA"];

type LbRow = { user_id: string; total_points: number };

type PrivatePreview = {
  id: string;
  name: string;
  description: string | null;
  member_count: number;
};

/**
 * Portada del hub: elegir a qué quiniela entrar. La mayoría solo tendrá la
 * general, pero cada comunidad con liga privada (la de Pacha, la primera)
 * entra a la suya desde aquí.
 */
export default async function QuinielaLigaIndex() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // En paralelo (17-oct): iban una detrás de otra.
  const [leagues, baremo, { data: publicLeague }] = await Promise.all([
    user ? getMyClubLeagues(user.id) : Promise.resolve([]),
    getBaremoPublico(),
    // Datos EN VIVO de la liga pública (código incluido) — es is_public, así
    // que la RLS deja leerla a cualquiera, con o sin sesión.
    supabase.from("leagues").select("code, name, description").eq("id", PUBLIC_LEAGUE_ID).maybeSingle(),
  ]);
  const inPublic = leagues.some((l) => l.isPublic);

  // Quinielas privadas anunciadas — solo las que el usuario aún NO tiene
  // (si ya es miembro, su tarjeta normal de arriba basta). La vista previa
  // sale de get_league_public_preview (RPC pública pensada justo para esto:
  // nombre/descr./miembros, nada sensible).
  const memberIds = new Set(leagues.map((l) => l.id));
  const featuredPrivate = (
    await Promise.all(
      FEATURED_PRIVATE_CODES.map(async (code) => {
        const { data } = await supabase.rpc("get_league_public_preview", {
          p_code: code,
        });
        const row = (data as PrivatePreview[] | null)?.[0];
        return row && !memberIds.has(row.id) ? row : null;
      }),
    )
  ).filter((p): p is PrivatePreview => p !== null);

  // La quiniela de la Champions va aparte (27-oct, pedido del dueño: dentro
  // de la de los Conos «se pierde»): su propia tarjeta, con tu puesto.
  const { data: rankingChampions } = await supabase.rpc("lq_ranking_competicion", {
    p_comp: COMPETICION_CHAMPIONS,
    p_season: TEMPORADA_CHAMPIONS,
    p_exacto: baremo.exacto,
    p_acierto: baremo.acierto,
  });
  const filasChampions = (rankingChampions ?? []) as { user_id: string; puntos: number }[];
  const idxChampions = user ? filasChampions.findIndex((r) => r.user_id === user.id) : -1;

  // Posición y puntos de cada liga (son pocas; una consulta por liga).
  const stats = new Map<string, { pos: number | null; points: number; members: number }>();
  await Promise.all(
    leagues.map(async (l) => {
      const { data } = await supabase.rpc("lq_leaderboard", { p_league_id: l.id });
      const rows = (data ?? []) as LbRow[];
      const idx = rows.findIndex((r) => r.user_id === user?.id);
      stats.set(l.id, {
        pos: idx >= 0 ? idx + 1 : null,
        points: idx >= 0 ? rows[idx].total_points : 0,
        members: rows.length,
      });
    }),
  );

  return (
    <main className="page">
      <section className="phero" style={{ paddingBottom: 12 }}>
        <div className="wrap">
          <p className="eyebrow"><T>Quiniela · LaLiga 2026-27</T></p>
          <h1 className="phero__title" style={{ fontSize: "clamp(2.2rem,6vw,4rem)", marginTop: 12 }}>
            <T>Elige tu quiniela</T>
          </h1>
          <p className="phero__lede" style={{ marginTop: 8 }}>
            <T>
              Pronosticas una sola vez: tus marcadores puntúan en todas las
              quinielas en las que estés, cada una con sus normas.
            </T>
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 20 }}>
        <div className="wrap" style={{ display: "grid", gap: 16 }}>
          {leagues.map((l) => (
            <LeagueCard key={l.id} league={l} stats={stats.get(l.id)} />
          ))}

          <div className="panel qcard-champions" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: "1.3rem" }}><Icono icono={Trophy} tono="oro" tam="sm" /> Quiniela de la Champions</h2>
              <span className="mono" style={{ fontSize: "0.7rem", letterSpacing: "0.1em", color: "var(--text-dim)" }}>
                2026-27 · OTRA COMPETICIÓN
              </span>
            </div>
            <p style={{ color: "var(--text-dim)", margin: "8px 0 16px" }}>
              Pronostica la Champions jornada a jornada, de la fase liga a la final, con su propia clasificación:
              aquí no suman los puntos de LaLiga.
              {idxChampions >= 0
                ? ` Vas ${idxChampions + 1}.º de ${filasChampions.length} con ${filasChampions[idxChampions].puntos} puntos.`
                : filasChampions.length > 0
                  ? ` Ya juegan ${filasChampions.length}.`
                  : ""}
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link href="/quiniela-champions" className="btn btn--accent">
                Pronosticar <span className="arr">→</span>
              </Link>
              <Link href="/quiniela-champions?vista=clasificacion" className="btn">
                Clasificación
              </Link>
            </div>
          </div>

          {!inPublic && publicLeague && (
            <div className="panel" style={{ padding: 24 }}>
              <h2 style={{ margin: 0, fontSize: "1.3rem" }}><T>{publicLeague.name}</T></h2>
              <p style={{ color: "var(--text-dim)", margin: "8px 0 16px" }}>
                <T>
                  {publicLeague.description ??
                    `La general, abierta a todo el mundo. ${textoBaremo(baremo)}.`}
                </T>
              </p>
              <Link
                href={`/unirse/${encodeURIComponent(publicLeague.code)}`}
                className="btn btn--accent"
              >
                Unirme <span className="arr">→</span>
              </Link>
            </div>
          )}

          {featuredPrivate.map((p) => (
            <div key={p.id} className="panel" style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                <h2 style={{ margin: 0, fontSize: "1.3rem" }}><T>{p.name}</T></h2>
                <span
                  style={{
                    fontFamily: "var(--font-mono-stack)",
                    fontSize: "0.7rem",
                    letterSpacing: "0.1em",
                    color: "var(--text-dim)",
                    border: "1px solid var(--line)",
                    borderRadius: 999,
                    padding: "3px 10px",
                  }}
                >
                  <Lock className="ico-txt" aria-hidden /> PRIVADO
                </span>
              </div>
              <p style={{ color: "var(--text-dim)", margin: "8px 0 16px" }}>
                <T>{p.description ?? "Quiniela privada de su comunidad."}</T>
                {p.member_count > 0 &&
                  ` · ${p.member_count} ${p.member_count === 1 ? "jugador" : "jugadores"}`}
              </p>
              <Link href="#codigo" className="btn btn--accent">
                Acceder <span className="arr">→</span>
              </Link>
            </div>
          ))}

          {!user && (
            <div className="panel" style={{ padding: 24 }}>
              <h2 style={{ margin: 0, fontSize: "1.3rem" }}>Entra para jugar</h2>
              <p style={{ color: "var(--text-dim)", margin: "8px 0 16px" }}>
                Con tu cuenta guardas pronósticos y apareces en la clasificación.
              </p>
              <Link href="/login?redirect=/quiniela-liga" className="btn btn--accent">
                Iniciar sesión <span className="arr">→</span>
              </Link>
            </div>
          )}

          <div id="codigo" className="panel" style={{ padding: 24, scrollMarginTop: 90 }}>
            <h2 style={{ margin: 0, fontSize: "1.1rem" }}>
              <T>¿Te han invitado a una quiniela privada?</T>
            </h2>
            <p style={{ color: "var(--text-dim)", margin: "8px 0 16px" }}>
              Escribe el código que te han pasado y entras a la de tu comunidad.
            </p>
            <JoinCodeForm />
          </div>
        </div>
      </section>
    </main>
  );
}

function LeagueCard({
  league,
  stats,
}: {
  league: ClubLeague;
  stats?: { pos: number | null; points: number; members: number };
}) {
  // Por id, no por código: el código es la llave de entrada (ver leagueHref).
  const base = league.isPublic
    ? "/quiniela-liga/partidos"
    : `/quiniela-liga/partidos?liga=${encodeURIComponent(league.id)}`;
  const ranking = league.isPublic
    ? "/quiniela-liga/ranking"
    : `/quiniela-liga/ranking?liga=${encodeURIComponent(league.id)}`;

  return (
    <div className="panel" style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontSize: "1.3rem" }}><T>{league.name}</T></h2>
        {!league.isPublic && (
          <span
            style={{
              fontFamily: "var(--font-mono-stack)",
              fontSize: "0.7rem",
              letterSpacing: "0.1em",
              color: "var(--text-dim)",
              border: "1px solid var(--line)",
              borderRadius: 999,
              padding: "3px 10px",
            }}
          >
            {league.role === "admin" ? `PRIVADA · ${league.code}` : "PRIVADA"}
          </span>
        )}
        {league.role === "admin" && (
          <span style={{ fontSize: "0.75rem", color: "var(--accent)" }}>Eres admin</span>
        )}
      </div>

      <p style={{ color: "var(--text-dim)", margin: "8px 0 16px" }}>
        <T>
          {league.description ??
            "Marcador exacto y acierto de ganador, más los picks especiales de temporada."}
        </T>
      </p>

      {stats && (
        <p style={{ margin: "0 0 16px", fontSize: "0.9rem" }}>
          {stats.pos ? `Vas ${stats.pos}º` : "Sin puntuar todavía"} ·{" "}
          {stats.points} pts · {stats.members}{" "}
          {stats.members === 1 ? "jugador" : "jugadores"}
        </p>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link href={base} className="btn btn--accent">
          Pronosticar <span className="arr">→</span>
        </Link>
        <Link href={ranking} className="btn">
          Clasificación
        </Link>
        {(!league.isPublic || league.role === "admin") && (
          <Link href={`/quiniela-liga/liga/${encodeURIComponent(league.id)}`} className="btn">
            {league.role === "admin" ? "Gestionar" : "La liga"}
          </Link>
        )}
      </div>
    </div>
  );
}
