import { ImageResponse } from "next/og";
import { getFixtureById, isFinal, isLive, partidoDelCalendario } from "@/lib/sports/api-football";
import { COMPETITIONS_BY_SLUG } from "@/lib/sports/competitions";
import { conTildes } from "@/lib/sports/nombres";

export const alt = "Partido en soyreinaldo.com";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 600;

/**
 * La imagen que enseñan WhatsApp, Instagram o X al compartir una ficha de
 * partido (17-oct, pedido del dueño): escudos, marcador o fecha y la marca.
 * Mismos datos (y caché) que la ficha: no añade llamadas a la API.
 */
export default async function Image({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const competition = COMPETITIONS_BY_SLUG[slug];
  const fixtureId = Number(id);
  const fx = competition
    ? ((await getFixtureById(fixtureId, 60).catch(() => null)) ??
      (await partidoDelCalendario(competition, fixtureId).catch(() => null)))
    : null;

  const enVivo = fx ? isLive(fx) : false;
  const jugado = fx ? enVivo || isFinal(fx) : false;
  const centro = fx
    ? jugado
      ? `${fx.goals.home ?? 0} – ${fx.goals.away ?? 0}`
      : new Intl.DateTimeFormat("es-ES", {
          timeZone: "Europe/Madrid",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(fx.fixture.date))
    : "";
  const estado = fx ? (enVivo ? "EN DIRECTO" : isFinal(fx) ? "FINAL" : "PRÓXIMO PARTIDO") : "";

  const Equipo = ({ nombre, logo }: { nombre: string; logo: string }) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 360 }}>
      <img src={logo} width={170} height={170} alt="" style={{ objectFit: "contain" }} />
      <div style={{ display: "flex", marginTop: 22, fontSize: 40, fontWeight: 700, textAlign: "center" }}>
        {conTildes(nombre)}
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
          justifyContent: "space-between",
          padding: "52px 64px",
          background: "linear-gradient(135deg, #0a1030 0%, #1b2a6b 100%)",
          color: "#e8ecff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, color: "#9aa4d6", letterSpacing: 2 }}>
          <span style={{ display: "flex" }}>{(competition?.name ?? "").toUpperCase()}</span>
          <span style={{ display: "flex", color: enVivo ? "#ff4d57" : "#9aa4d6" }}>{estado}</span>
        </div>
        {fx ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Equipo nombre={fx.teams.home.name} logo={fx.teams.home.logo} />
            <div style={{ display: "flex", fontSize: jugado ? 120 : 52, fontWeight: 800 }}>{centro}</div>
            <Equipo nombre={fx.teams.away.name} logo={fx.teams.away.logo} />
          </div>
        ) : (
          <div style={{ display: "flex", fontSize: 64, fontWeight: 800 }}>El fútbol, en vivo</div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 30 }}>
          <span style={{ display: "flex", color: "#c5cbef" }}>Marcador, estadísticas y alineaciones</span>
          <span style={{ display: "flex", color: "#3b82f6", fontWeight: 700 }}>soyreinaldo.com</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
