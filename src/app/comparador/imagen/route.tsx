import { ImageResponse } from "next/og";
import { cargarLado, peticionDe } from "@/lib/comparador/cargar";
import { filas, formatear } from "@/lib/comparador/datos";

/** Imagen del comparador para redes (1080×1350), con los mismos datos que la
 * página (misma caché). Al vuelo, como las demás ImageResponse. */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const pa = peticionDe(q.get("a") ?? "154", q.get("ta") ?? undefined, q.get("ca") ?? undefined);
  const pb = peticionDe(q.get("b") ?? "874", q.get("tb") ?? undefined, q.get("cb") ?? undefined);
  const [a, b] = await Promise.all([pa ? cargarLado(pa) : null, pb ? cargarLado(pb) : null]);
  if (!a || !b) return new Response("No encontrado", { status: 404 });
  const fs = filas(a.totales, b.totales).slice(0, 12);

  const cabeza = (l: typeof a, color: string) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 400 }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- Satori solo entiende <img> */}
      <img src={l.foto} width={170} height={170} alt="" style={{ borderRadius: 85, border: `6px solid ${color}`, background: "#e2e8f0" }} />
      <div style={{ display: "flex", marginTop: 16, fontSize: 44, fontWeight: 800, textAlign: "center" }}>{l.nombre}</div>
      <div style={{ display: "flex", marginTop: 6, fontSize: 24, color: "#8e9adc", textAlign: "center" }}>{l.etiqueta}</div>
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
          background: "radial-gradient(circle at 50% 20%, #16225c 0%, #0a1030 70%)",
          color: "#eef1ff",
          fontFamily: "sans-serif",
          padding: "56px 60px",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, letterSpacing: 8, color: "#8e9adc" }}>COMPARADOR · SOY REINALDO</div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", marginTop: 36 }}>
          {cabeza(a, "#2c8fff")}
          <div style={{ display: "flex", fontSize: 50, fontWeight: 900, color: "#ff9d00", marginTop: 60, width: 80, justifyContent: "center" }}>VS</div>
          {cabeza(b, "#ff5b8a")}
        </div>
        <div style={{ display: "flex", flexDirection: "column", width: "100%", marginTop: 36, gap: 10 }}>
          {fs.map((f) => {
            const va = f.a ?? 0;
            const vb = f.b ?? 0;
            const gana = f.a == null || f.b == null || va === vb ? null : (va > vb) !== !!f.menosEsMejor ? "a" : "b";
            return (
              <div key={f.etiqueta} style={{ display: "flex", alignItems: "center", fontSize: 32, borderBottom: "1px solid rgba(140,160,255,0.18)", paddingBottom: 8 }}>
                <div style={{ display: "flex", width: 200, justifyContent: "flex-start", fontWeight: 800, color: gana === "a" ? "#2c8fff" : "#eef1ff" }}>
                  {formatear(f.a, f.formato)}
                </div>
                <div style={{ display: "flex", flex: 1, justifyContent: "center", color: "#8e9adc", fontSize: 28 }}>{f.etiqueta}</div>
                <div style={{ display: "flex", width: 200, justifyContent: "flex-end", fontWeight: 800, color: gana === "b" ? "#ff5b8a" : "#eef1ff" }}>
                  {formatear(f.b, f.formato)}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", marginTop: "auto", fontSize: 34, fontWeight: 800 }}>soyreinaldo.com/comparador</div>
      </div>
    ),
    { width: 1080, height: 1350, headers: { "Cache-Control": "public, max-age=600, s-maxage=3600" } },
  );
}
