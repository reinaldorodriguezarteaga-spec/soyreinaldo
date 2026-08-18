import { createClient } from "@/lib/supabase/server";
import { getMyClubLeagues, pickLeague } from "@/lib/quiniela-liga/leagues";

export const metadata = {
  title: "Reglas · Quiniela LaLiga 2026-27 | Soy Reinaldo",
  description:
    "Cómo se puntúa la Quiniela de LaLiga: pronósticos, picks especiales y fechas límite.",
};

type Row = { label: string; points: string; note?: string };

/** Baremo de la quiniela general; cada liga privada puede tener el suyo. */
const DEFAULT_RULES = {
  exact: 3,
  result: 1,
  champion: 15,
  pichichi: 10,
  relegated: 5,
  midseason: 10,
  specials: true,
};
type Rules = typeof DEFAULT_RULES;

const pts = (n: number) => `${n} ${n === 1 ? "pt" : "pts"}`;

const predictionRows = (r: Rules): Row[] => [
  { label: "Marcador exacto", points: pts(r.exact) },
  { label: "Aciertas el ganador (o empate), marcador distinto", points: pts(r.result) },
  { label: "No aciertas", points: "0 pts" },
];

const seasonRows = (r: Rules): Row[] => [
  { label: "🏆 Campeón de LaLiga", points: pts(r.champion) },
  { label: "⚽ Pichichi (máximo goleador)", points: pts(r.pichichi), note: "por nombre" },
  { label: "🔻 Cada equipo descendido acertado (hasta 3)", points: `${pts(r.relegated)} c/u` },
];

const midseasonRows = (r: Rules): Row[] => [
  { label: "🧤 Zamora (portero menos goleado)", points: pts(r.midseason), note: "por nombre" },
  { label: "🎯 Máximo asistidor", points: pts(r.midseason), note: "por nombre" },
  { label: "⭐ MVP de la liga", points: pts(r.midseason), note: "por nombre" },
  { label: "🛡️ Equipo menos goleado", points: pts(r.midseason) },
  { label: "🔥 Equipo más goleador", points: pts(r.midseason) },
];

function PointsTable({ rows }: { rows: Row[] }) {
  return (
    <div className="panel" style={{ padding: "6px 20px" }}>
      {rows.map((r, i) => (
        <div
          key={r.label}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            padding: "14px 0",
            borderTop: i === 0 ? "none" : "1px solid var(--line)",
          }}
        >
          <div>
            <div style={{ fontWeight: 700 }}>{r.label}</div>
            {r.note && (
              <div className="hint" style={{ marginTop: 2 }}>
                {r.note}
              </div>
            )}
          </div>
          <div
            className="mono"
            style={{
              flex: "none",
              fontWeight: 800,
              color: "var(--accent)",
              whiteSpace: "nowrap",
            }}
          >
            {r.points}
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function QuinielaLigaReglasPage({
  searchParams,
}: {
  searchParams: Promise<{ liga?: string }>;
}) {
  const { liga } = await searchParams;

  // Sin sesión se enseña el baremo de la general (la página es pública); con
  // sesión, el de la liga que se esté mirando — cada una puede tener el suyo.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const leagues = user ? await getMyClubLeagues(user.id) : [];
  const active = pickLeague(leagues, liga);

  let rules = DEFAULT_RULES;
  if (active) {
    const { data } = await supabase
      .from("leagues")
      .select(
        `lq_points_exact, lq_points_result, lq_points_champion, lq_points_pichichi,
         lq_points_relegated, lq_points_midseason, lq_specials_enabled`,
      )
      .eq("id", active.id)
      .maybeSingle();
    if (data) {
      rules = {
        exact: data.lq_points_exact,
        result: data.lq_points_result,
        champion: data.lq_points_champion,
        pichichi: data.lq_points_pichichi,
        relegated: data.lq_points_relegated,
        midseason: data.lq_points_midseason,
        specials: data.lq_specials_enabled,
      };
    }
  }

  const PREDICTION_ROWS = predictionRows(rules);
  const SEASON_ROWS = seasonRows(rules);
  const MIDSEASON_ROWS = midseasonRows(rules);

  return (
    <main className="page">
      <section className="phero" style={{ paddingTop: 8, paddingBottom: 20 }}>
        <div className="wrap">
          <p className="eyebrow">
            {active && !active.isPublic
              ? `${active.name} · LaLiga 2026-27`
              : "Quiniela · LaLiga 2026-27"}
          </p>
          <h1 className="phero__title" style={{ fontSize: "clamp(2rem,5vw,3.4rem)" }}>
            Reglas
          </h1>
          <p className="phero__lede" style={{ marginTop: 8 }}>
            Cómo se puntúa, cuándo se cierran los pronósticos y qué hacer si
            algo no cuadra. Todo lo que hay que saber para jugar sin sorpresas.
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 8, paddingBottom: 16 }}>
        <div className="wrap" style={{ maxWidth: 620 }}>
          <div className="shead" style={{ marginBottom: 16 }}>
            <h2 style={{ fontFamily: "var(--font-display-stack)", fontWeight: 900, textTransform: "uppercase", fontSize: "1.6rem", margin: 0 }}>
              Pronósticos, jornada a jornada
            </h2>
          </div>
          <PointsTable rows={PREDICTION_ROWS} />
          <p className="hint" style={{ marginTop: 12 }}>
            Se pronostica partido a partido, hasta <b>30 minutos antes</b> del
            pitido inicial — pasado ese punto, el marcador queda bloqueado.
          </p>
        </div>
      </section>

      {rules.specials && (
        <>
        <section className="section" style={{ paddingTop: 8, paddingBottom: 16 }}>
          <div className="wrap" style={{ maxWidth: 620 }}>
            <div className="shead" style={{ marginBottom: 16 }}>
              <div>
                <p className="eyebrow">Toda la temporada</p>
                <h2 style={{ fontFamily: "var(--font-display-stack)", fontWeight: 900, textTransform: "uppercase", fontSize: "1.6rem", margin: 0 }}>
                  Campeón, pichichi y descensos
                </h2>
              </div>
            </div>
            <PointsTable rows={SEASON_ROWS} />
            <p className="hint" style={{ marginTop: 12 }}>
              Editables hasta que arranque la <b>jornada 6</b> — después quedan
              fijos hasta que se sepa el resultado real al acabar la temporada.
            </p>
          </div>
        </section>
  
        <section className="section" style={{ paddingTop: 8, paddingBottom: 16 }}>
          <div className="wrap" style={{ maxWidth: 620 }}>
            <div className="shead" style={{ marginBottom: 16 }}>
              <div>
                <p className="eyebrow">Más margen</p>
                <h2 style={{ fontFamily: "var(--font-display-stack)", fontWeight: 900, textTransform: "uppercase", fontSize: "1.6rem", margin: 0 }}>
                  Picks de mitad de temporada
                </h2>
              </div>
            </div>
            <PointsTable rows={MIDSEASON_ROWS} />
            <p className="hint" style={{ marginTop: 12 }}>
              También editables hasta que arranque la <b>jornada 6</b> — dan más
              margen porque se deciden mejor tras ver algo de forma.
            </p>
          </div>
        </section>
        </>
      )}

      <section className="section" style={{ paddingTop: 8 }}>
        <div className="wrap" style={{ maxWidth: 620 }}>
          <div className="shead" style={{ marginBottom: 16 }}>
            <h2 style={{ fontFamily: "var(--font-display-stack)", fontWeight: 900, textTransform: "uppercase", fontSize: "1.6rem", margin: 0 }}>
              Preguntas frecuentes
            </h2>
          </div>
          <div className="faqs">
            <details className="faq">
              <summary>
                ¿Cómo se compara el nombre de un jugador (pichichi, Zamora, MVP...)?
                <span className="chev">▾</span>
              </summary>
              <p>
                Se ignoran tildes y mayúsculas/minúsculas — &ldquo;Mbappe&rdquo; y
                &ldquo;Mbappé&rdquo; cuentan igual. Aun así, escribe el nombre completo
                más habitual (apellido, o nombre y apellido) para evitar
                dudas.
              </p>
            </details>
            <details className="faq">
              <summary>
                ¿Puedo cambiar un pronóstico ya guardado?
                <span className="chev">▾</span>
              </summary>
              <p>
                Sí, tantas veces como quieras hasta 30 minutos antes del
                inicio de ese partido. Después queda bloqueado y no se puede
                tocar, ni por el propio jugador ni por el admin.
              </p>
            </details>
            <details className="faq">
              <summary>
                ¿Qué pasa si un partido se aplaza o se suspende?
                <span className="chev">▾</span>
              </summary>
              <p>
                Puntúa con el resultado final cuando se termine de jugar,
                sea el día que sea. Si un partido se anula por completo sin
                volver a disputarse, no puntúa para nadie (ni suma ni resta).
              </p>
            </details>
            <details className="faq">
              <summary>
                Creo que hay un error en mis puntos — ¿qué hago?
                <span className="chev">▾</span>
              </summary>
              <p>
                Escríbenos por{" "}
                <a href="/contacto" style={{ color: "var(--accent)" }}>
                  contacto
                </a>{" "}
                indicando la liga, la jornada y el partido. El admin puede
                revisar y, si hace falta, aplicar un ajuste manual de puntos
                — siempre visible y justificado, nunca en secreto.
              </p>
            </details>
            <details className="faq">
              <summary>
                ¿Los mismos pronósticos valen para todas las ligas privadas?
                <span className="chev">▾</span>
              </summary>
              <p>
                Sí — tu pronóstico de cada partido es uno solo y vale para
                todas las ligas en las que participes. Lo que puede cambiar
                de una liga a otra es cómo se reparten los puntos.
              </p>
            </details>
          </div>
        </div>
      </section>
    </main>
  );
}
