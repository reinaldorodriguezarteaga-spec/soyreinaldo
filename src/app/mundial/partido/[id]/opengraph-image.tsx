import { ImageResponse } from "next/og";
import {
  getFixtureById,
  isFinal,
  isLive,
} from "@/lib/sports/api-football";
import { loadEsMap } from "@/lib/sports/widget-data";

// Imagen de compartir (WhatsApp / redes) de un partido. Se genera server-side
// y se cachea; muestra los dos equipos, el marcador (o "VS"), la ronda y la
// marca "soyreinaldo.com" con el tema Blaugrana Neón.
export const runtime = "nodejs";
export const alt = "Partido del Mundial 2026 · Soy Reinaldo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const NAVY = "#0A1030";
const PANEL = "#111a3d";
const ACCENT = "#2C8FFF";
const RED = "#A50044";
const BLUE = "#154284";
const TEXT = "#E8ECFF";
const MUTED = "#8A93B8";
const LIVE = "#FF4D57";

function roundLabel(round: string | null): string {
  if (!round) return "Mundial 2026";
  const map: Record<string, string> = {
    "Round of 32": "Dieciseisavos",
    "Round of 16": "Octavos",
    "Quarter-finals": "Cuartos",
    "Semi-finals": "Semifinales",
    "3rd Place Final": "Tercer puesto",
    Final: "Final",
  };
  if (map[round]) return map[round];
  const g = round.match(/Group Stage\s*-\s*(\d+)/i);
  if (g) return `Jornada ${g[1]}`;
  if (/^Group/i.test(round)) return "Fase de grupos";
  return round;
}

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const fixtureId = Number(id);
  const fx = await getFixtureById(fixtureId, 60).catch(() => null);

  const es = fx ? (await loadEsMap([fixtureId]))[fixtureId] ?? null : null;
  const homeName = es?.home.name ?? fx?.teams.home.name ?? "";
  const awayName = es?.away.name ?? fx?.teams.away.name ?? "";
  const played = fx ? isLive(fx) || isFinal(fx) : false;
  const live = fx ? isLive(fx) : false;
  const round = roundLabel(fx?.league.round ?? null);

  const TeamCol = ({ name, logo }: { name: string; logo?: string }) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: 380,
      }}
    >
      {logo ? (
        <img src={logo} width={168} height={168} alt="" />
      ) : (
        <div style={{ width: 168, height: 168 }} />
      )}
      <div
        style={{
          marginTop: 22,
          fontSize: 46,
          fontWeight: 800,
          color: TEXT,
          textAlign: "center",
          lineHeight: 1.05,
        }}
      >
        {name}
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
          background: NAVY,
          color: TEXT,
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Franja culé superior */}
        <div style={{ display: "flex", height: 12 }}>
          <div style={{ flex: 1, background: RED }} />
          <div style={{ width: 460, background: BLUE }} />
        </div>

        {/* Eyebrow: estado + ronda */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "40px 64px 0",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: live ? LIVE : PANEL,
              color: live ? "#fff" : ACCENT,
              borderRadius: 999,
              padding: "10px 22px",
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            {live ? "EN VIVO" : played ? "FINAL" : "PRÓXIMO"} · {round.toUpperCase()}
          </div>
        </div>

        {/* Partido */}
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: "0 48px",
          }}
        >
          <TeamCol name={homeName} logo={fx?.teams.home.logo} />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: 240,
            }}
          >
            {played ? (
              <div
                style={{
                  display: "flex",
                  fontSize: 128,
                  fontWeight: 900,
                  color: TEXT,
                }}
              >
                {fx?.goals.home ?? 0}
                <span style={{ color: MUTED, margin: "0 18px" }}>–</span>
                {fx?.goals.away ?? 0}
              </div>
            ) : (
              <div style={{ display: "flex", fontSize: 84, fontWeight: 900, color: MUTED }}>
                VS
              </div>
            )}
          </div>
          <TeamCol name={awayName} logo={fx?.teams.away.logo} />
        </div>

        {/* Pie: marca */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 64px 44px",
          }}
        >
          <div style={{ display: "flex", fontSize: 30, fontWeight: 800, color: TEXT }}>
            soyreinaldo<span style={{ color: ACCENT }}>.com</span>
          </div>
          <div style={{ display: "flex", fontSize: 24, color: MUTED }}>
            Mundial 2026 · Marcadores y estadísticas
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
