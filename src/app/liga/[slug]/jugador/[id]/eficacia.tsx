/**
 * Indicadores de eficacia de la ficha de jugador (23-nov-2026).
 *
 * Salen de los totales que ya da la API, sin nada inventado. La fuente no
 * trae xG, xA ni grandes ocasiones por jugador, y una «xG» calculada solo con
 * el número de tiros sería un recuento disfrazado: probado con 5.230
 * partidos-equipo contra el xG real, falla de media casi un tercio.
 */

export type DatosEficacia = {
  minutos: number;
  goles: number;
  tiros: number | null;
  tirosPuerta: number | null;
  pasesClave: number | null;
  penMarcados: number | null;
  penFallados: number | null;
};

/** Con menos muestra los cocientes engañan (1 gol en 1 tiro = 100 %). */
const MIN_MINUTOS = 270;
const MIN_TIROS = 5;

const fmt = (n: number, dec = 1) =>
  n.toLocaleString("es-ES", { minimumFractionDigits: dec, maximumFractionDigits: dec });

export default function Eficacia({ d }: { d: DatosEficacia }) {
  const { minutos, goles } = d;
  if (minutos < MIN_MINUTOS) return null;
  const tiros = d.tiros ?? 0;
  const pens = (d.penMarcados ?? 0) + (d.penFallados ?? 0);
  // Sin penaltis: un penalti marcado no dice nada de su acierto en juego.
  const tirosJuego = tiros - pens;
  const golesJuego = goles - (d.penMarcados ?? 0);

  const items: { label: string; value: string; ayuda: string }[] = [];
  if (tiros >= MIN_TIROS && d.tirosPuerta != null) {
    items.push({
      label: "Tiros a puerta",
      value: `${fmt((100 * d.tirosPuerta) / tiros, 0)} %`,
      ayuda: "de sus tiros van entre los tres palos",
    });
  }
  if (d.tiros != null && tirosJuego >= MIN_TIROS && golesJuego >= 0) {
    items.push({
      label: "Acierto de cara a puerta",
      value: `${fmt((100 * golesJuego) / tirosJuego, 0)} %`,
      ayuda: pens > 0 ? "de sus tiros acaban en gol, sin contar penaltis" : "de sus tiros acaban en gol",
    });
  }
  if (d.tiros != null) {
    items.push({
      label: "Tiros por 90 minutos",
      value: fmt((tiros * 90) / minutos),
      ayuda: "cuánto llega a zona de remate",
    });
  }
  if (d.pasesClave != null) {
    items.push({
      label: "Pases clave por 90 minutos",
      value: fmt((d.pasesClave * 90) / minutos),
      ayuda: "pases que acaban en tiro de un compañero",
    });
  }
  if (goles > 0) {
    items.push({
      label: "Minutos por gol",
      value: `${Math.round(minutos / goles)}'`,
      ayuda: "cada cuánto marca",
    });
  }
  if (items.length === 0) return null;

  return (
    <div style={{ borderTop: "1px solid var(--line)", padding: "12px 16px 6px" }}>
      <h3 style={{ fontSize: "0.95rem", margin: 0 }}>Eficacia</h3>
      {items.map((it) => (
        <div
          key={it.label}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: 12,
            padding: "8px 0",
            fontSize: "0.9rem",
          }}
        >
          <span style={{ color: "var(--text-dim)" }}>
            {it.label}
            <span style={{ display: "block", fontSize: "0.75rem", opacity: 0.8 }}>{it.ayuda}</span>
          </span>
          <b className="tabular-nums">{it.value}</b>
        </div>
      ))}
    </div>
  );
}
