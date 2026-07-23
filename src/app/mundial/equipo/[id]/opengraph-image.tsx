import { ImageResponse } from "next/og";
import { getTeamFixtures } from "@/lib/sports/api-football";

// Imagen de compartir de una ficha de equipo (escudo + nombre + marca).
export const runtime = "nodejs";
export const alt = "Selección en el Mundial 2026 · Soy Reinaldo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const NAVY = "#0A1030";
const ACCENT = "#2C8FFF";
const RED = "#A50044";
const BLUE = "#154284";
const TEXT = "#E8ECFF";
const MUTED = "#8A93B8";

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { team } = await getTeamFixtures(Number(id), { last: 1, next: 0 }).catch(
    () => ({ team: null }) as { team: null },
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
        }}
      >
        <div style={{ display: "flex", height: 12 }}>
          <div style={{ flex: 1, background: RED }} />
          <div style={{ width: 460, background: BLUE }} />
        </div>

        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {team?.logo ? (
            <img src={team.logo} width={240} height={240} alt="" />
          ) : (
            <div style={{ width: 240, height: 240 }} />
          )}
          <div
            style={{
              display: "flex",
              marginTop: 30,
              fontSize: 72,
              fontWeight: 800,
              color: TEXT,
              textAlign: "center",
            }}
          >
            {team?.name ?? "Selección"}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 10,
              fontSize: 30,
              color: ACCENT,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            HISTORIAL · MUNDIAL 2026
          </div>
        </div>

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
            Marcadores y estadísticas en vivo
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
