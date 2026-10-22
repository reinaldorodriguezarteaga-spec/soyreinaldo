import { ImageResponse } from "next/og";
import { NIVELES, NOMBRE_JUEGO, type JuegoRanking, type Nivel } from "@/lib/juegos/niveles";

/**
 * Imagen del resultado de un juego para compartir en redes (22-oct): formato
 * post de Instagram (1080×1350). Los datos van en la URL (juego, día, nivel,
 * puntos y una línea corta de resultado): solo números y emojis, nada personal.
 */
export const dynamic = "force-dynamic";

const COLOR_NIVEL: Record<Nivel, string> = { facil: "#22c55e", medio: "#f59e0b", dificil: "#ef4444" };

export function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const juego = q.get("j") as JuegoRanking | null;
  const nivel = q.get("n") as Nivel | null;
  if (!juego || !(juego in NOMBRE_JUEGO) || !nivel || !(nivel in NIVELES)) return new Response("No válido", { status: 400 });
  const puntos = Math.max(0, Math.min(9999, Math.round(Number(q.get("p")) || 0)));
  const dia = Number(q.get("d")) || null;
  const resultado = (q.get("r") ?? "").slice(0, 40);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at 50% 35%, #16225c 0%, #0a1030 70%)",
          color: "#eef1ff",
          fontFamily: "sans-serif",
          padding: 80,
        }}
      >
        <div style={{ display: "flex", fontSize: 34, letterSpacing: 8, color: "#8e9adc" }}>JUEGOS · SOY REINALDO</div>
        <div style={{ display: "flex", marginTop: 50, fontSize: 84, fontWeight: 800, textAlign: "center" }}>{NOMBRE_JUEGO[juego]}</div>
        <div style={{ display: "flex", marginTop: 16, fontSize: 40, color: "#8e9adc" }}>{dia ? `Reto del día #${dia}` : "Práctica"}</div>
        {resultado ? <div style={{ display: "flex", marginTop: 70, fontSize: 90 }}>{resultado}</div> : null}
        <div style={{ display: "flex", alignItems: "baseline", gap: 24, marginTop: 70 }}>
          <div style={{ display: "flex", fontSize: 200, fontWeight: 900, color: "#ff9d00", lineHeight: 1 }}>{puntos}</div>
          <div style={{ display: "flex", fontSize: 48, color: "#8e9adc" }}>puntos</div>
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 30,
            padding: "10px 34px",
            borderRadius: 999,
            border: `3px solid ${COLOR_NIVEL[nivel]}`,
            color: COLOR_NIVEL[nivel],
            fontSize: 40,
            fontWeight: 800,
          }}
        >
          {`Nivel ${NIVELES[nivel].nombre.toLowerCase()}`}
        </div>
        <div style={{ display: "flex", marginTop: 90, fontSize: 40, fontWeight: 800 }}>¿Me superas? soyreinaldo.com/juegos</div>
      </div>
    ),
    { width: 1080, height: 1350, headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } },
  );
}
