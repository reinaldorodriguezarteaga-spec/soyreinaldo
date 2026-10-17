import { ImageResponse } from "next/og";
import { temporadaDe } from "@/lib/quiniela-liga/logros";

export const alt = "Mi temporada en soyreinaldo.com";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 600;

export default async function Image({ params }: { params: Promise<{ usuario: string }> }) {
  const t = await temporadaDe(decodeURIComponent((await params).usuario));
  const fila = (k: string, v: string) => (
    <div style={{ display: "flex", flexDirection: "column", width: 330 }}>
      <span style={{ display: "flex", fontSize: 24, color: "#9aa4d6" }}>{k}</span>
      <span style={{ display: "flex", fontSize: 40, fontWeight: 700 }}>{v}</span>
    </div>
  );
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between",
          padding: "52px 72px", background: "linear-gradient(135deg, #0a1030 0%, #1b2a6b 100%)", color: "#e8ecff", fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, letterSpacing: 4, color: "#f5c542" }}>MI TEMPORADA · 2026-27</div>
        {t ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 56, fontWeight: 800 }}>{t.nombre}</div>
            <div style={{ display: "flex", alignItems: "baseline", marginTop: 4 }}>
              <span style={{ fontSize: 130, fontWeight: 800, lineHeight: 1 }}>{t.puntos}</span>
              <span style={{ fontSize: 44, marginLeft: 16, color: "#c5cbef" }}>
                {`puntos${t.puesto ? ` · ${t.puesto}º de ${t.jugadores}` : ""}`}
              </span>
            </div>
            <div style={{ display: "flex", marginTop: 28 }}>
              {fila("Exactos", String(t.exactos))}
              {fila("Mejor jornada", t.mejor ? `${t.mejor.puntos} pts` : "—")}
              {fila("Duelos ganados", String(t.duelos.ganados))}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", fontSize: 64, fontWeight: 800 }}>Pronostica y compite</div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", fontSize: 30, color: "#3b82f6", fontWeight: 700 }}>soyreinaldo.com</div>
      </div>
    ),
    { ...size },
  );
}
