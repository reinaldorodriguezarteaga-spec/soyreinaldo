import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMyClubLeagues, pickLeague } from "@/lib/quiniela-liga/leagues";
import { puntosPronostico } from "@/lib/quiniela-liga/scoring";
import { ANFITRION_ID, ANFITRION_NOMBRE } from "@/lib/quiniela-liga/anfitrion";

/**
 * La quiniela, dentro de la ficha del partido.
 *
 * Es la única ventaja real frente a FotMob o Sofascore: ellos tienen los
 * datos, pero no tienen a tu gente compitiendo entre sí. Hasta ahora estaba
 * escondida en su propia sección: quien llegaba de Google a un partido de
 * LaLiga no sabía siquiera que existía.
 *
 * Tres estados, según quién mire:
 *  - Sin sesión → invitación a jugar.
 *  - Con sesión, partido por empezar → tu pronóstico, o botón para hacerlo.
 *  - Con sesión, partido empezado → lo que pronosticó tu liga y quién acierta.
 *
 * La RLS de `lq_predictions` ya impide ver los pronósticos ajenos antes del
 * pitido inicial, así que aquí no hace falta comprobarlo otra vez: si el
 * partido no ha empezado, la consulta sencillamente no devuelve a nadie más.
 */

type Pred = { user_id: string; score_home: number; score_away: number };

export default async function MatchQuiniela({
  fixtureId,
  played,
  goles,
  equipos,
}: {
  fixtureId: number;
  played: boolean;
  goles: { home: number | null; away: number | null };
  equipos: { local: string; visitante: string };
}) {
  const supabase = await createClient();

  // ¿Este partido entra en la quiniela?
  const { data: partido } = await supabase
    .from("lq_matches")
    .select("id, counts_for_scoring")
    .eq("id", fixtureId)
    .maybeSingle<{ id: number; counts_for_scoring: boolean }>();
  if (!partido) return null;

  // Lo que pronostica la comunidad: solo totales (función de la migración
  // 056); el marcador más repetido solo aparece tras el pitido inicial.
  const { data: comunidadData } = await supabase
    .rpc("lq_pronostico_comunidad", { p_match_id: fixtureId })
    .maybeSingle<Comunidad>();
  const comunidad =
    comunidadData && comunidadData.total >= MIN_PARA_COMUNIDAD ? comunidadData : null;
  // "¿Le ganas a Reinaldo?": su pronóstico (marcador solo desde el pitido).
  const { data: anfData } = await supabase.rpc("lq_pronosticos_anfitrion", {
    p_match_ids: [fixtureId],
  });
  const anf = ((anfData ?? []) as { hecho: boolean; score_home: number | null; score_away: number | null }[])[0];
  const lineaAnfitrion = anf ? (
    <p style={{ margin: "0 0 14px", color: "var(--text-dim)" }}>
      🎙️{" "}
      {anf.score_home != null && anf.score_away != null ? (
        <>
          {ANFITRION_NOMBRE} dijo{" "}
          <strong style={{ color: "var(--text)" }}>
            {anf.score_home}–{anf.score_away}
          </strong>
        </>
      ) : anf.hecho ? (
        <>{ANFITRION_NOMBRE} ya ha pronosticado este partido. ¿Le ganas?</>
      ) : (
        <>{ANFITRION_NOMBRE} aún no lo ha pronosticado.</>
      )}
    </p>
  ) : null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const bloqueComunidad = (
    <>
      {comunidad && <BloqueComunidad c={comunidad} equipos={equipos} />}
      {user?.id !== ANFITRION_ID && lineaAnfitrion}
    </>
  );

  if (!user) {
    return (
      <Caja>
        <p style={{ margin: "0 0 14px", color: "var(--text-dim)" }}>
          Este partido entra en la quiniela. Pronostica el marcador y compite
          con tu gente en una clasificación propia.
        </p>
        {bloqueComunidad}
        <Link href="/quiniela-liga" className="btn btn--accent">
          Ver la quiniela <span className="arr">→</span>
        </Link>
      </Caja>
    );
  }

  const leagues = await getMyClubLeagues(user.id);
  const liga = pickLeague(leagues);

  const { data: predsData } = await supabase
    .from("lq_predictions")
    .select("user_id, score_home, score_away")
    .eq("match_id", fixtureId)
    .returns<Pred[]>();
  const preds = predsData ?? [];
  const mio = preds.find((p) => p.user_id === user.id) ?? null;

  // Sin liga todavía: la invitación sigue teniendo sentido.
  if (leagues.length === 0) {
    return (
      <Caja>
        <p style={{ margin: "0 0 14px", color: "var(--text-dim)" }}>
          Este partido entra en la quiniela y aún no estás en ninguna.
        </p>
        {bloqueComunidad}
        <Link href="/quiniela-liga" className="btn btn--accent">
          Entrar a la quiniela <span className="arr">→</span>
        </Link>
      </Caja>
    );
  }

  const enlaceQuiniela = liga && !liga.isPublic
    ? `/quiniela-liga/partidos?liga=${encodeURIComponent(liga.id)}`
    : "/quiniela-liga/partidos";

  // Nombres de quienes han pronosticado (solo salen los visibles por RLS).
  const ids = preds.map((p) => p.user_id);
  const { data: perfiles } = ids.length
    ? await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", ids)
        .returns<{ id: string; display_name: string | null }[]>()
    : { data: [] as { id: string; display_name: string | null }[] };
  const nombre = new Map(
    (perfiles ?? []).map((p) => [p.id, p.display_name ?? "Sin nombre"]),
  );

  // Baremo de ESA liga: cada comunidad puede tener el suyo (migración 037).
  const { data: baremo } = liga
    ? await supabase
        .from("leagues")
        .select("lq_points_exact, lq_points_result")
        .eq("id", liga.id)
        .maybeSingle<{ lq_points_exact: number; lq_points_result: number }>()
    : { data: null };
  const ptsExacto = baremo?.lq_points_exact ?? 3;
  const ptsAcierto = baremo?.lq_points_result ?? 1;

  const hayResultado =
    played && goles.home != null && goles.away != null && partido.counts_for_scoring;
  const marcador = { home: goles.home ?? 0, away: goles.away ?? 0 };

  const filas = preds
    .map((p) => ({
      id: p.user_id,
      nombre: nombre.get(p.user_id) ?? "Sin nombre",
      pron: { home: p.score_home, away: p.score_away },
      pts: hayResultado
        ? puntosPronostico(
            { home: p.score_home, away: p.score_away },
            marcador,
            { exacto: ptsExacto, acierto: ptsAcierto },
          )
        : null,
    }))
    .sort((a, b) => (b.pts ?? 0) - (a.pts ?? 0) || a.nombre.localeCompare(b.nombre, "es"));

  return (
    <Caja titulo={liga && !liga.isPublic ? liga.name : undefined}>
      {mio ? (
        <p style={{ margin: "0 0 14px" }}>
          Tu pronóstico:{" "}
          <strong style={{ fontSize: "1.15rem" }}>
            {mio.score_home}–{mio.score_away}
          </strong>
          {hayResultado && (
            <span style={{ color: "var(--text-dim)" }}>
              {" "}
              ·{" "}
              {puntosPronostico(
                { home: mio.score_home, away: mio.score_away },
                marcador,
                { exacto: ptsExacto, acierto: ptsAcierto },
              )}{" "}
              pts
            </span>
          )}
        </p>
      ) : (
        <p style={{ margin: "0 0 14px", color: "var(--text-dim)" }}>
          {played
            ? "No pronosticaste este partido."
            : "Aún no has pronosticado este partido."}
        </p>
      )}

      {filas.length > 1 && (
        <div style={{ overflowX: "auto", marginBottom: 14 }}>
          <table className="board" style={{ minWidth: 280 }}>
            <thead>
              <tr>
                <th>Jugador</th>
                <th style={{ textAlign: "right" }}>Pronóstico</th>
                {hayResultado && <th className="pts">Pts</th>}
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.id} className={f.id === user.id ? "me" : undefined}>
                  <td className="who">{f.nombre}</td>
                  <td style={{ textAlign: "right" }} className="tabular-nums">
                    {f.pron.home}–{f.pron.away}
                  </td>
                  {hayResultado && <td className="pts">{f.pts}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {bloqueComunidad}

      <Link href={enlaceQuiniela} className="btn">
        {played ? "Ver la quiniela" : "Pronosticar"} <span className="arr">→</span>
      </Link>
    </Caja>
  );
}

type Comunidad = {
  total: number;
  local: number;
  empate: number;
  visitante: number;
  marcador: string | null;
  marcador_n: number | null;
};

/** Con menos pronósticos el porcentaje no dice nada. */
const MIN_PARA_COMUNIDAD = 3;

function BloqueComunidad({
  c,
  equipos,
}: {
  c: Comunidad;
  equipos: { local: string; visitante: string };
}) {
  const pct = (n: number) => Math.round((n / c.total) * 100);
  const filas = [
    { etiqueta: `Gana ${equipos.local}`, n: c.local },
    { etiqueta: "Empate", n: c.empate },
    { etiqueta: `Gana ${equipos.visitante}`, n: c.visitante },
  ];
  return (
    <div style={{ margin: "0 0 16px" }}>
      <p
        className="mono"
        style={{
          margin: "0 0 8px",
          color: "var(--text-dim)",
          fontSize: "0.66rem",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        Lo que pronostica la comunidad · {c.total} pronósticos
      </p>
      {filas.map((f) => (
        <div key={f.etiqueta} style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0" }}>
          <span className="truncate" style={{ width: 150, flexShrink: 0, fontSize: "0.9rem" }}>
            {f.etiqueta}
          </span>
          <span
            aria-hidden
            style={{ flex: 1, height: 8, borderRadius: 4, background: "var(--line)", overflow: "hidden" }}
          >
            <span
              style={{
                display: "block",
                height: "100%",
                width: `${pct(f.n)}%`,
                background: "var(--accent)",
              }}
            />
          </span>
          <span className="tabular-nums" style={{ width: 42, textAlign: "right", fontSize: "0.9rem" }}>
            {pct(f.n)}%
          </span>
        </div>
      ))}
      {c.marcador && c.marcador_n && (
        <p style={{ margin: "8px 0 0", fontSize: "0.88rem", color: "var(--text-dim)" }}>
          Marcador más repetido: <strong style={{ color: "var(--text)" }}>{c.marcador.replace("-", "–")}</strong>{" "}
          ({c.marcador_n} {c.marcador_n === 1 ? "vez" : "veces"})
        </p>
      )}
    </div>
  );
}

function Caja({
  children,
  titulo,
}: {
  children: React.ReactNode;
  titulo?: string;
}) {
  return (
    <div style={{ marginTop: 28 }}>
      <div className="shead">
        <h2>🏆 Quiniela</h2>
        {titulo && <span className="sh-note">{titulo}</span>}
      </div>
      <div className="panel" style={{ padding: "18px 20px" }}>{children}</div>
    </div>
  );
}
