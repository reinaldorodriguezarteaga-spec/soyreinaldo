import { ImageResponse } from "next/og";
import { FILAS_GOATS, totalesGoats, type TotalGoat } from "@/lib/goats";
import { clientePublico } from "@/lib/supabase/publico";

/**
 * Imagen de Messi vs Cristiano para compartir (18-oct, pedido del dueño):
 * vertical 1080×1350 (la que mejor luce en Instagram y WhatsApp) para el
 * botón de compartir, y 1200×630 para la vista previa de los enlaces.
 */
export async function imagenGoats(formato: "vertical" | "enlace") {
  const totales = await totalesGoats(clientePublico()).catch(() => null);
  const vertical = formato === "vertical";
  const W = vertical ? 1080 : 1200;
  const H = vertical ? 1350 : 630;
  const foto = vertical ? 260 : 150;
  const cifra = vertical ? 92 : 54;
  const fmt = (n: number) => n.toLocaleString("es-ES");

  const jugador = (nombre: string, t: TotalGoat | undefined) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: vertical ? 360 : 300 }}>
      {t && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://media.api-sports.io/football/players/${t.apiId}.png`}
          width={foto}
          height={foto}
          alt=""
          style={{ borderRadius: foto, border: "6px solid #3b82f6", background: "#e2e8f0" }}
        />
      )}
      <div style={{ display: "flex", marginTop: 16, fontSize: vertical ? 64 : 44, fontWeight: 800 }}>{nombre}</div>
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
          justifyContent: "space-between",
          padding: vertical ? "72px 64px 56px" : "36px 64px 28px",
          background: "linear-gradient(160deg, #0a1030 0%, #1b2a6b 100%)",
          color: "#e8ecff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: vertical ? 30 : 22, letterSpacing: 6, color: "#f5c542" }}>
            🐐 EL DEBATE ETERNO
          </div>
          <div style={{ display: "flex", marginTop: 8, fontSize: vertical ? 84 : 52, fontWeight: 800 }}>
            Messi vs Cristiano
          </div>
        </div>

        {totales ? (
          <div style={{ display: "flex", flexDirection: vertical ? "column" : "row", alignItems: "center", width: "100%" }}>
            {vertical && (
              <div style={{ display: "flex", justifyContent: "space-between", width: "100%", marginTop: 24, marginBottom: 36 }}>
                {jugador("Messi", totales.messi)}
                {jugador("Cristiano", totales.ronaldo)}
              </div>
            )}
            {!vertical && jugador("Messi", totales.messi)}
            <div style={{ display: "flex", flexDirection: "column", flexGrow: vertical ? 0 : 1, width: vertical ? "100%" : undefined }}>
              {FILAS_GOATS.map((f) => {
                const m = totales.messi[f.clave];
                const r = totales.ronaldo[f.clave];
                const num = (v: number, gana: boolean) => (
                  <span
                    style={{
                      display: "flex",
                      width: vertical ? 320 : 170,
                      justifyContent: "center",
                      fontSize: cifra,
                      fontWeight: 800,
                      color: gana ? "#ff9d00" : "#e8ecff",
                    }}
                  >
                    {fmt(v)}
                  </span>
                );
                return (
                  <div
                    key={f.clave}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: vertical ? "14px 0" : "4px 0",
                      borderTop: "2px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    {num(m, m > r)}
                    <span style={{ display: "flex", flex: 1, justifyContent: "center", fontSize: vertical ? 30 : 22, color: "#9aa4d6", textAlign: "center" }}>
                      {f.label}
                    </span>
                    {num(r, r > m)}
                  </div>
                );
              })}
            </div>
            {!vertical && jugador("Cristiano", totales.ronaldo)}
          </div>
        ) : (
          <div style={{ display: "flex", fontSize: 40 }}>La comparativa, al día</div>
        )}

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          {vertical && (
            <div style={{ display: "flex", fontSize: 24, color: "#9aa4d6", marginBottom: 14 }}>
              Carrera en partidos oficiales, con club y selección
            </div>
          )}
          <div style={{ display: "flex", fontSize: vertical ? 40 : 26, color: "#3b82f6", fontWeight: 700 }}>
            soyreinaldo.com/messi-vs-ronaldo
          </div>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      headers: { "Cache-Control": "public, max-age=600, s-maxage=600, stale-while-revalidate=3600" },
    },
  );
}
