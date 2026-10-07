import { ImageResponse } from "next/og";
import { tarjetaJornada } from "@/lib/quiniela-liga/jornada-datos";

export const alt = "Mi jornada en la quiniela de soyreinaldo.com";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 600;

/** Imagen que enseñan WhatsApp, Instagram o X al compartir la tarjeta. */
export default async function Image({
  params,
}: {
  params: Promise<{ usuario: string; jornada: string }>;
}) {
  const { usuario, jornada } = await params;
  const t = await tarjetaJornada(decodeURIComponent(usuario), Number(jornada));
  const mov = t && t.puestoAhora != null && t.puestoAntes != null ? t.puestoAntes - t.puestoAhora : 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "linear-gradient(135deg, #0a1030 0%, #1b2a6b 100%)",
          color: "#e8ecff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, color: "#9aa4d6", letterSpacing: 2 }}>
          {t ? `${t.liga.toUpperCase()} · JORNADA ${t.jornada}` : "QUINIELA DE SOYREINALDO.COM"}
        </div>
        {t ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 54, fontWeight: 700 }}>{t.nombre}</div>
            <div style={{ display: "flex", alignItems: "baseline", marginTop: 8 }}>
              <span style={{ fontSize: 150, fontWeight: 800, lineHeight: 1 }}>{t.puntos}</span>
              <span style={{ fontSize: 48, marginLeft: 18, color: "#c5cbef" }}>puntos</span>
            </div>
            <div style={{ display: "flex", fontSize: 32, color: "#c5cbef", marginTop: 12 }}>
              {`${t.exactos} exactos · ${t.aciertos} aciertos · ${t.jugados} pronósticos`}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", fontSize: 64, fontWeight: 800 }}>Pronostica LaLiga y compite</div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 34 }}>
          <span style={{ display: "flex" }}>
            {t?.puestoAhora
              ? `${t.puestoAhora}º de ${t.totalJugadores}${mov > 0 ? `  ·  sube ${mov}` : mov < 0 ? `  ·  baja ${-mov}` : ""}`
              : ""}
          </span>
          <span style={{ display: "flex", color: "#3b82f6", fontWeight: 700 }}>soyreinaldo.com</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
