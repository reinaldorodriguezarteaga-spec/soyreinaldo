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
  const foto = vertical ? 200 : 140;
  const cifra = vertical ? 80 : 48;

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
      <div style={{ display: "flex", marginTop: 16, fontSize: vertical ? 56 : 40, fontWeight: 800 }}>{nombre}</div>
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
              <div style={{ display: "flex", justifyContent: "space-between", width: "100%", marginTop: 20, marginBottom: 24 }}>
                {jugador("Messi", totales.messi)}
                {jugador("Cristiano", totales.ronaldo)}
              </div>
            )}
            {!vertical && jugador("Messi", totales.messi)}
            <div style={{ display: "flex", flexDirection: "column", ...(vertical ? { width: "100%" } : { flexGrow: 1 }) }}>
              {FILAS_GOATS.map((f) => {
                const m = f.peso(totales.messi);
                const r = f.peso(totales.ronaldo);
                const num = (v: string, gana: boolean) => (
                  <span
                    style={{
                      display: "flex",
                      width: vertical ? 320 : 170,
                      justifyContent: "center",
                      // "183/219" es más largo que una cifra suelta.
                      fontSize: v.length > 5 ? Math.round(cifra * 0.72) : cifra,
                      fontWeight: 800,
                      color: gana ? "#ff9d00" : "#e8ecff",
                    }}
                  >
                    {v}
                  </span>
                );
                return (
                  <div
                    key={f.clave}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: vertical ? "10px 0" : "2px 0",
                      borderTop: "2px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    {num(f.valor(totales.messi), m > r)}
                    <span style={{ display: "flex", flex: 1, justifyContent: "center", fontSize: vertical ? 30 : 22, color: "#9aa4d6", textAlign: "center" }}>
                      {f.label}
                    </span>
                    {num(f.valor(totales.ronaldo), r > m)}
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
