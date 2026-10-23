import { ImageResponse } from "next/og";
import { NIVELES, NOMBRE_JUEGO, type JuegoRanking, type Nivel } from "@/lib/juegos/niveles";
import { retoDelDia } from "@/lib/juegos/adivina-equipo";
import { jugadorDelDia } from "@/lib/juegos/adivina-jugador";
import { tableroDelDia } from "@/lib/juegos/tikitaka";
import { clubId, clubNombre } from "@/lib/juegos/carreras";
import { HUECOS, LINEAS, ternas } from "@/lib/juegos/leyendas";
import { caraPorNombre } from "@/lib/juegos/caras";
import { caraOnce } from "@/lib/juegos/caras-onces";

/**
 * Imagen del resultado de un juego para compartir en redes (22-oct): formato
 * post de Instagram (1080×1350). Los datos van en la URL (juego, día, nivel,
 * puntos y una línea corta de resultado): solo números y emojis, nada personal.
 *
 * 23-oct (pedido del dueño: «así sin más no me dice nada»): lleva un avance
 * del juego que pica sin destripar: las banderas del once, los escudos de la
 * carrera, el tablero con las casillas acertadas, tu once de leyenda.
 */
export const dynamic = "force-dynamic";

const COLOR_NIVEL: Record<Nivel, string> = { facil: "#22c55e", medio: "#f59e0b", dificil: "#ef4444" };
const TENUE = "#8e9adc";
const bandera = (p: string) => `https://media.api-sports.io/flags/${p}.svg`;
const escudo = (id: number) => `https://media.api-sports.io/football/teams/${id}.png`;

/** Campo verde en el que van las fichas del avance. */
function Campo({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column-reverse",
        justifyContent: "space-around",
        width: 760,
        height: 560,
        padding: "20px 10px",
        borderRadius: 28,
        border: "3px solid rgba(255,255,255,0.35)",
        background: "linear-gradient(180deg, #14532d 0%, #166534 50%, #14532d 100%)",
      }}
    >
      {children}
    </div>
  );
}

function Avance({ juego, dia, q }: { juego: JuegoRanking; dia: number | null; q: URLSearchParams }) {
  // Adivina el equipo: el once del día con solo banderas.
  if (juego === "equipo" && dia) {
    const reto = retoDelDia(dia);
    return (
      <Campo>
        {reto.lineas.map((linea, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "row-reverse", justifyContent: "space-around" }}>
            {linea.map(([, pais], j) => (
              // eslint-disable-next-line @next/next/no-img-element -- Satori solo entiende <img>
              <img key={j} src={bandera(pais)} width={64} height={64} alt="" style={{ borderRadius: 32, border: "4px solid #fff", objectFit: "cover" }} />
            ))}
          </div>
        ))}
      </Campo>
    );
  }
  // Adivina el jugador: los escudos de su carrera, en orden.
  if (juego === "jugador" && dia) {
    const j = jugadorDelDia(dia);
    const clubes = j.carrera.slice(0, 10);
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 14, width: 920 }}>
          {clubes.map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {i > 0 && <div style={{ display: "flex", fontSize: 40, color: TENUE }}>→</div>}
              {/* eslint-disable-next-line @next/next/no-img-element -- Satori solo entiende <img> */}
              <img src={escudo(clubId(c))} width={110} height={110} alt="" style={{ objectFit: "contain" }} />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", fontSize: 64, fontWeight: 800 }}>¿Quién es?</div>
      </div>
    );
  }
  // Tiki-taka-toe: el tablero del día y las casillas acertadas.
  if (juego === "tikitaka" && dia) {
    const t = tableroDelDia(dia);
    const mascara = (q.get("m") ?? "").padEnd(9, "0").slice(0, 9);
    const celda = 150;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ display: "flex", width: celda }} />
          {t.columnas.map((c) => (
            // eslint-disable-next-line @next/next/no-img-element -- Satori solo entiende <img>
            <img key={c} src={escudo(clubId(c))} width={celda} height={110} alt={clubNombre(c)} style={{ objectFit: "contain" }} />
          ))}
        </div>
        {t.filas.map((f, fi) => (
          <div key={f} style={{ display: "flex", gap: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- Satori solo entiende <img> */}
            <img src={escudo(clubId(f))} width={celda} height={celda} alt={clubNombre(f)} style={{ objectFit: "contain", padding: 20 }} />
            {[0, 1, 2].map((ci) => {
              const ok = mascara[fi * 3 + ci] === "1";
              return (
                <div
                  key={ci}
                  style={{
                    display: "flex",
                    width: celda,
                    height: celda,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 18,
                    fontSize: 72,
                    background: ok ? "rgba(34,197,94,0.35)" : "rgba(255,255,255,0.06)",
                    border: `3px solid ${ok ? "#22c55e" : "rgba(140,160,255,0.3)"}`,
                    color: ok ? "#bbf7d0" : TENUE,
                  }}
                >
                  {ok ? "⚽" : "?"}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }
  // Once de leyenda: tu once del día, con banderas y apellidos.
  if (juego === "leyenda" && dia) {
    const ts = ternas(dia * 101);
    const k = (q.get("k") ?? "").slice(0, 11);
    if (k.length === 11 && /^[0-2]+$/.test(k)) {
      const elegidos = HUECOS.map((_, i) => ts[i][Number(k[i])]);
      return (
        <Campo>
          {LINEAS.map((linea, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "row-reverse", justifyContent: "space-around" }}>
              {linea.map((h) => (
                <div key={h} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- Satori solo entiende <img> */}
                  <img
                    src={caraPorNombre(elegidos[h].nombre) ?? caraOnce(elegidos[h].nombre, elegidos[h].pais) ?? bandera(elegidos[h].pais)}
                    width={58}
                    height={58}
                    alt=""
                    style={{ borderRadius: 29, border: "3px solid #fff", objectFit: "cover", background: "#fff" }}
                  />
                  <div style={{ display: "flex", fontSize: 22, fontWeight: 700, color: "#fff" }}>{elegidos[h].nombre.length <= 14 ? elegidos[h].nombre : elegidos[h].nombre.split(" ").at(-1)}</div>
                </div>
              ))}
            </div>
          ))}
        </Campo>
      );
    }
  }
  // ¿Más o menos? (y la práctica de los demás): el duelo, sin datos.
  if (juego === "masomenos") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 50 }}>
        {["#2c8fff", "#ff5b8a"].map((c, i) => (
          <div key={c} style={{ display: "flex", alignItems: "center", gap: 50 }}>
            {i === 1 && <div style={{ display: "flex", fontSize: 70, fontWeight: 900, color: "#ff9d00" }}>VS</div>}
            <div
              style={{
                display: "flex",
                width: 230,
                height: 230,
                borderRadius: 115,
                border: `8px solid ${c}`,
                background: "rgba(255,255,255,0.08)",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 130,
                color: TENUE,
              }}
            >
              ?
            </div>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const juego = q.get("j") as JuegoRanking | null;
  const nivel = q.get("n") as Nivel | null;
  if (!juego || !(juego in NOMBRE_JUEGO) || !nivel || !(nivel in NIVELES)) return new Response("No válido", { status: 400 });
  const puntos = Math.max(0, Math.min(9999, Math.round(Number(q.get("p")) || 0)));
  const diaN = Number(q.get("d"));
  const dia = Number.isInteger(diaN) && diaN > 0 && diaN < 100000 ? diaN : null;
  const resultado = (q.get("r") ?? "").slice(0, 40);
  const avance = Avance({ juego, dia, q });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          background: "radial-gradient(circle at 50% 35%, #16225c 0%, #0a1030 70%)",
          color: "#eef1ff",
          fontFamily: "sans-serif",
          padding: "56px 60px",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, letterSpacing: 8, color: TENUE }}>JUEGOS · SOY REINALDO</div>
        <div style={{ display: "flex", marginTop: 18, fontSize: 70, fontWeight: 800, textAlign: "center" }}>{NOMBRE_JUEGO[juego]}</div>
        <div style={{ display: "flex", marginTop: 6, fontSize: 34, color: TENUE }}>{dia ? `Reto del día #${dia}` : "Práctica"}</div>

        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", marginTop: 20 }}>
          {avance ?? (resultado ? <div style={{ display: "flex", fontSize: 90 }}>{resultado}</div> : null)}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {avance && resultado ? <div style={{ display: "flex", fontSize: 54 }}>{resultado}</div> : null}
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <div style={{ display: "flex", fontSize: 110, fontWeight: 900, color: "#ff9d00", lineHeight: 1 }}>{puntos}</div>
            <div style={{ display: "flex", fontSize: 36, color: TENUE }}>puntos</div>
          </div>
          <div
            style={{
              display: "flex",
              padding: "6px 24px",
              borderRadius: 999,
              border: `3px solid ${COLOR_NIVEL[nivel]}`,
              color: COLOR_NIVEL[nivel],
              fontSize: 30,
              fontWeight: 800,
            }}
          >
            {NIVELES[nivel].nombre}
          </div>
        </div>
        <div style={{ display: "flex", marginTop: 34, fontSize: 38, fontWeight: 800 }}>¿Me superas? soyreinaldo.com/juegos</div>
      </div>
    ),
    { width: 1080, height: 1350, headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } },
  );
}
