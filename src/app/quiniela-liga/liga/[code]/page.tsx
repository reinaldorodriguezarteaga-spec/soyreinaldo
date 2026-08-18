import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  EditLeagueForm,
  RulesForm,
  AdjustmentForm,
  InviteLink,
} from "./league-forms";
import { deleteAdjustment, kickMember } from "./actions";

type LeagueRow = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  is_public: boolean;
  kind: string;
  lq_points_exact: number;
  lq_points_result: number;
  lq_points_champion: number;
  lq_points_pichichi: number;
  lq_points_relegated: number;
  lq_points_midseason: number;
  lq_specials_enabled: boolean;
};
type MemberRow = { user_id: string; joined_at: string; role: "member" | "admin" };
type LbRow = { user_id: string; total_points: number };
type AdjRow = {
  id: string;
  user_id: string;
  delta: number;
  reason: string;
  created_at: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return { title: `${decodeURIComponent(code).toUpperCase()} · Quiniela | Soy Reinaldo` };
}

/**
 * Panel de una liga privada de la quiniela de clubes: quién juega, cómo se
 * puntúa y el enlace de invitación. Su admin (rol 'admin' en league_members)
 * puede además editar normas, ajustar puntos y expulsar. Todo lo autoriza la
 * BD; esta página solo enseña u oculta.
 */
export default async function LeaguePanelPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ guardado?: string }>;
}) {
  const { code: rawRef } = await params;
  const { guardado } = await searchParams;
  // La ruta acepta el id de la liga (lo que enlaza la app: el código es la
  // llave de entrada y no debe pasearse por la barra de direcciones) o el
  // propio código, para que los enlaces repartidos a mano sigan valiendo.
  const ref = decodeURIComponent(rawRef);
  const isId =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref);
  const code = ref.toUpperCase();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/quiniela-liga/liga/${encodeURIComponent(ref)}`);

  const query = supabase
    .from("leagues")
    .select(
      `id, name, code, description, is_public, kind,
       lq_points_exact, lq_points_result, lq_points_champion, lq_points_pichichi,
       lq_points_relegated, lq_points_midseason, lq_specials_enabled`,
    );
  const { data: league } = await (isId
    ? query.eq("id", ref)
    : query.eq("code", code)
  ).maybeSingle<LeagueRow>();

  if (!league) notFound();

  const { data: me } = await supabase
    .from("league_members")
    .select("role")
    .eq("league_id", league.id)
    .eq("user_id", user.id)
    .maybeSingle<{ role: "member" | "admin" }>();

  // Aún no eres de la liga: pasa por la invitación, no por aquí.
  if (!me) redirect(`/unirse/${encodeURIComponent(league.code)}`);
  const isLeagueAdmin = me.role === "admin";

  const [{ data: memberRows }, { data: lb }] = await Promise.all([
    supabase
      .from("league_members")
      .select("user_id, joined_at, role")
      .eq("league_id", league.id)
      .order("joined_at", { ascending: true })
      .returns<MemberRow[]>(),
    supabase.rpc("lq_leaderboard", { p_league_id: league.id }),
  ]);

  const members = memberRows ?? [];
  const ids = members.map((m) => m.user_id);
  const { data: profs } = ids.length
    ? await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", ids)
        .returns<{ id: string; display_name: string | null }[]>()
    : { data: [] as { id: string; display_name: string | null }[] };

  const nameById = new Map((profs ?? []).map((p) => [p.id, p.display_name ?? "Sin nombre"]));
  const pointsById = new Map(((lb ?? []) as LbRow[]).map((r) => [r.user_id, r.total_points]));

  const { data: adjustments } = isLeagueAdmin
    ? await supabase
        .from("point_adjustments")
        .select("id, user_id, delta, reason, created_at")
        .eq("league_id", league.id)
        .order("created_at", { ascending: false })
        .limit(20)
        .returns<AdjRow[]>()
    : { data: [] as AdjRow[] };

  const rankingHref = league.is_public
    ? "/quiniela-liga/ranking"
    : `/quiniela-liga/ranking?liga=${encodeURIComponent(league.id)}`;

  return (
    <main className="page">
      <section className="phero" style={{ paddingBottom: 16 }}>
        <div className="wrap">
          <Link
            href="/quiniela-liga"
            className="eyebrow"
            style={{ display: "inline-block", color: "var(--accent)" }}
          >
            ← Mis quinielas
          </Link>
          <h1 className="phero__title" style={{ fontSize: "clamp(2rem,5.5vw,3.4rem)", marginTop: 12 }}>
            {league.name}
          </h1>
          <p className="phero__lede" style={{ marginTop: 8 }}>
            {league.description ?? "Quiniela privada de LaLiga 2026-27."}
          </p>
          <p style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href={rankingHref} className="btn btn--accent">
              Clasificación <span className="arr">→</span>
            </Link>
            <Link
              href={
                league.is_public
                  ? "/quiniela-liga/partidos"
                  : `/quiniela-liga/partidos?liga=${encodeURIComponent(league.id)}`
              }
              className="btn"
            >
              Pronosticar
            </Link>
          </p>
          {guardado === "1" && (
            <p role="status" style={{ marginTop: 12, color: "var(--accent)" }}>
              Cambios guardados.
            </p>
          )}
        </div>
      </section>

      <section className="section" style={{ paddingTop: 12 }}>
        <div className="wrap" style={{ display: "grid", gap: 20 }}>
          {/* Normas: las ve todo el mundo, las edita el admin. */}
          <div className="panel" style={{ padding: 24 }}>
            <h2 style={{ margin: "0 0 4px", fontSize: "1.2rem" }}>Normas</h2>
            <p style={{ color: "var(--text-dim)", margin: "0 0 16px", fontSize: "0.9rem" }}>
              Solo de esta quiniela: tus pronósticos son los mismos en todas,
              pero aquí puntúan con este baremo.
            </p>
            <ul style={{ margin: "0 0 8px", paddingLeft: 18, lineHeight: 1.8 }}>
              <li>Marcador exacto: <strong>{league.lq_points_exact} pts</strong></li>
              <li>Acertar el ganador (o el empate): <strong>{league.lq_points_result} pts</strong></li>
              {league.lq_specials_enabled ? (
                <li>
                  Especiales: campeón {league.lq_points_champion} · pichichi{" "}
                  {league.lq_points_pichichi} · cada descenso {league.lq_points_relegated} ·
                  cada pick de media temporada {league.lq_points_midseason}
                </li>
              ) : (
                <li>Los picks especiales no puntúan en esta quiniela</li>
              )}
            </ul>
            {isLeagueAdmin && (
              <details style={{ marginTop: 16 }}>
                <summary style={{ cursor: "pointer", color: "var(--accent)" }}>
                  Cambiar las normas
                </summary>
                <div style={{ marginTop: 16 }}>
                  <RulesForm
                    leagueId={league.id}
                    rules={{
                      exact: league.lq_points_exact,
                      result: league.lq_points_result,
                      champion: league.lq_points_champion,
                      pichichi: league.lq_points_pichichi,
                      relegated: league.lq_points_relegated,
                      midseason: league.lq_points_midseason,
                      specials: league.lq_specials_enabled,
                    }}
                  />
                </div>
              </details>
            )}
          </div>

          {/* Miembros */}
          <div className="panel" style={{ padding: 24, overflowX: "auto" }}>
            <h2 style={{ margin: "0 0 16px", fontSize: "1.2rem" }}>
              Jugadores ({members.length})
            </h2>
            <table className="board">
              <thead>
                <tr>
                  <th>Jugador</th>
                  <th className="hidem">Entró</th>
                  <th style={{ textAlign: "right" }}>Pts</th>
                  {isLeagueAdmin && <th />}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.user_id} className={m.user_id === user.id ? "me" : undefined}>
                    <td className="who">
                      {nameById.get(m.user_id) ?? "Sin nombre"}
                      {m.role === "admin" && (
                        <span style={{ color: "var(--accent)", fontSize: "0.72rem", marginLeft: 8 }}>
                          admin
                        </span>
                      )}
                    </td>
                    <td className="hidem" style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>
                      {new Date(m.joined_at).toLocaleDateString("es-ES")}
                    </td>
                    <td style={{ textAlign: "right" }}>{pointsById.get(m.user_id) ?? 0}</td>
                    {isLeagueAdmin && (
                      <td style={{ textAlign: "right" }}>
                        {m.role !== "admin" && (
                          <form action={kickMember}>
                            <input type="hidden" name="league_id" value={league.id} />
                            <input type="hidden" name="user_id" value={m.user_id} />
                            <input type="hidden" name="ref" value={league.id} />
                            <button
                              type="submit"
                              className="btn btn--ghost"
                              style={{ fontSize: "0.75rem", padding: "6px 12px" }}
                            >
                              Expulsar
                            </button>
                          </form>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {isLeagueAdmin && (
            <>
              <div className="panel" style={{ padding: 24 }}>
                <h2 style={{ margin: "0 0 4px", fontSize: "1.2rem" }}>Invitar</h2>
                <p style={{ color: "var(--text-dim)", margin: "0 0 16px", fontSize: "0.9rem" }}>
                  {league.is_public ? (
                    <>
                      Esta liga es la general: cualquiera puede entrar desde la
                      página de quinielas. El enlace directo es este.
                    </>
                  ) : (
                    <>
                      Solo se entra con este enlace o tecleando el código{" "}
                      <strong style={{ fontFamily: "var(--font-mono-stack)" }}>{league.code}</strong>{" "}
                      en la página de quinielas. La liga no aparece listada en ningún sitio.
                    </>
                  )}
                </p>
                <InviteLink code={league.code} />
              </div>

              <div className="panel" style={{ padding: 24 }}>
                <h2 style={{ margin: "0 0 16px", fontSize: "1.2rem" }}>Datos de la liga</h2>
                <EditLeagueForm league={league} />
              </div>

              <div className="panel" style={{ padding: 24 }}>
                <h2 style={{ margin: "0 0 4px", fontSize: "1.2rem" }}>Ajustar puntos</h2>
                <p style={{ color: "var(--text-dim)", margin: "0 0 16px", fontSize: "0.9rem" }}>
                  Suma o resta puntos a mano (premios, penalizaciones). Solo
                  afecta a esta liga.
                </p>
                <AdjustmentForm
                  leagueId={league.id}
                  members={members.map((m) => ({
                    userId: m.user_id,
                    displayName: nameById.get(m.user_id) ?? "Sin nombre",
                  }))}
                />

                {(adjustments ?? []).length > 0 && (
                  <ul style={{ listStyle: "none", padding: 0, margin: "24px 0 0" }}>
                    {(adjustments ?? []).map((a) => (
                      <li
                        key={a.id}
                        style={{
                          display: "flex",
                          gap: 12,
                          alignItems: "center",
                          justifyContent: "space-between",
                          borderTop: "1px solid var(--line)",
                          padding: "12px 0",
                          fontSize: "0.9rem",
                        }}
                      >
                        <span>
                          <strong>{a.delta > 0 ? `+${a.delta}` : a.delta}</strong>{" "}
                          {nameById.get(a.user_id) ?? "Sin nombre"} ·{" "}
                          <span style={{ color: "var(--text-dim)" }}>{a.reason}</span>
                        </span>
                        <form action={deleteAdjustment}>
                          <input type="hidden" name="id" value={a.id} />
                          <input type="hidden" name="ref" value={league.id} />
                          <button
                            type="submit"
                            className="btn btn--ghost"
                            style={{ fontSize: "0.75rem", padding: "6px 12px" }}
                          >
                            Deshacer
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
