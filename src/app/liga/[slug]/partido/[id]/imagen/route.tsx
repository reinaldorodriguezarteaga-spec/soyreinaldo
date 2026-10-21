import { ImageResponse } from "next/og";
import { getFixtureById, getFixtureGoals, getFixturePlayers, isFinal, isLive } from "@/lib/sports/api-football";
import { COMPETITIONS_BY_SLUG } from "@/lib/sports/competitions";
import { equiposEnEspanol, nombreCorto } from "@/lib/sports/nombres";

/**
 * Imagen del partido para redes (21-oct, pedido del dueño): formato post de
 * Instagram (1080×1350) con marcador, goles y el mejor valorado. La sirve el
 * botón «Imagen para redes» de la ficha. Mismos datos y caché que la ficha.
 */
// Al vuelo, como las demás ImageResponse (generarlas en el build fallaba).
export const dynamic = "force-dynamic";

const FONDO = "#0a1030";
const TEXTO = "#eef1ff";
const TENUE = "#8e9adc";
const ACENTO = "#2c8fff";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const competition = COMPETITIONS_BY_SLUG[slug];
  const fixtureId = Number(id);
  const crudo = competition && Number.isInteger(fixtureId) ? await getFixtureById(fixtureId).catch(() => null) : null;
  if (!crudo || !competition) return new Response("No encontrado", { status: 404 });
  const fx = equiposEnEspanol(crudo);
  const jugado = isFinal(fx) || isLive(fx);
  const [goles, jugadores] = jugado
    ? await Promise.all([getFixtureGoals(fixtureId).catch(() => []), getFixturePlayers(fixtureId).catch(() => [])])
    : [[], []];

  const mejor = jugadores
    .flatMap((t) => t.players.map((p) => ({ p, escudo: t.team.logo })))
    .filter((x) => x.p.rating != null)
    .sort((a, b) => (b.p.rating ?? 0) - (a.p.rating ?? 0))[0];
  const golesDe = (teamId: number) =>
    goles
      .filter((g) => g.teamId === teamId)
      .map((g) => `${nombreCorto(g.player)} ${g.minute ?? ""}'${g.detail === "Penalty" ? " (p)" : g.detail === "Own Goal" ? " (pp)" : ""}`);
  const estado = isFinal(fx) ? "FINAL" : isLive(fx) ? `EN JUEGO · ${fx.fixture.status.elapsed ?? ""}'` : "PRÓXIMO PARTIDO";
  const centro = jugado
    ? `${fx.goals.home ?? 0} – ${fx.goals.away ?? 0}`
    : new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" }).format(new Date(fx.fixture.date));
  const fecha = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Madrid" }).format(
    new Date(fx.fixture.date),
  );

  const equipo = (t: { id: number; name: string; logo: string }) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 310, gap: 18 }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- Satori solo entiende <img> */}
      <img src={t.logo} width={200} height={200} alt="" style={{ objectFit: "contain" }} />
      <div style={{ display: "flex", fontSize: 44, fontWeight: 800, textAlign: "center", justifyContent: "center" }}>{t.name}</div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, fontSize: 30, color: TENUE }}>
        {golesDe(t.id).map((g, i) => (
          <div key={i} style={{ display: "flex" }}>
            ⚽ {g}
          </div>
        ))}
      </div>
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          background: `radial-gradient(circle at 50% 30%, #16225c 0%, ${FONDO} 70%)`,
          color: TEXTO,
          padding: "70px 50px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, color: TENUE, letterSpacing: 4 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- Satori solo entiende <img> */}
          <img src={fx.league.logo} width={56} height={56} alt="" style={{ objectFit: "contain" }} />
          {competition.name.toUpperCase()}
        </div>
        <div style={{ display: "flex", marginTop: 18, fontSize: 30, color: ACENTO, fontWeight: 800, letterSpacing: 6 }}>{estado}</div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", marginTop: 50, gap: 10 }}>
          {equipo(fx.teams.home)}
          <div style={{ display: "flex", fontSize: 130, fontWeight: 900, width: 360, justifyContent: "center", marginTop: 30, whiteSpace: "nowrap" }}>
            {centro}
          </div>
          {equipo(fx.teams.away)}
        </div>
        <div style={{ display: "flex", marginTop: 30, fontSize: 30, color: TENUE }}>{fecha}</div>

        {mejor && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 24,
              marginTop: "auto",
              padding: "24px 36px",
              borderRadius: 24,
              background: "rgba(44,143,255,0.14)",
              border: `2px solid ${ACENTO}`,
            }}
          >
            {mejor.p.photo ? (
              // eslint-disable-next-line @next/next/no-img-element -- Satori solo entiende <img>
              <img src={mejor.p.photo} width={110} height={110} alt="" style={{ borderRadius: 55 }} />
            ) : null}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 26, color: TENUE, letterSpacing: 3 }}>MEJOR DEL PARTIDO</div>
              <div style={{ display: "flex", fontSize: 46, fontWeight: 800 }}>{nombreCorto(mejor.p.name)}</div>
            </div>
            <div style={{ display: "flex", fontSize: 64, fontWeight: 900, color: "#4ade80", marginLeft: 20 }}>
              {(mejor.p.rating ?? 0).toFixed(1)}
            </div>
          </div>
        )}
        <div style={{ display: "flex", marginTop: mejor ? 40 : "auto", fontSize: 34, fontWeight: 800, letterSpacing: 2 }}>
          soyreinaldo.com
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1350,
      headers: { "Cache-Control": "public, max-age=300, s-maxage=600" },
    },
  );
}
