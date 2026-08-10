export const metadata = {
  title: "Selecciones especiales · Quiniela LaLiga 2026-27 | Soy Reinaldo",
};

/**
 * Selecciones especiales de temporada (campeón, pichichi, descensos…). La
 * feature completa —selectores, bloqueo al arranque de LaLiga y puntos— se
 * construye en el siguiente paso; de momento la pestaña existe con su aviso.
 */
export default function QuinielaLigaPicksPage() {
  return (
    <main className="page">
      <section className="section" style={{ paddingTop: 24 }}>
        <div className="wrap">
          <div
            className="panel"
            style={{
              padding: 32,
              textAlign: "center",
              borderStyle: "dashed",
              color: "var(--text-dim)",
            }}
          >
            <h2 style={{ marginTop: 0, color: "var(--text)" }}>
              Selecciones especiales
            </h2>
            <p style={{ maxWidth: 460, margin: "12px auto 0" }}>
              Muy pronto: pronostica <b>campeón de LaLiga</b>, <b>pichichi</b> y
              los <b>3 descendidos</b> antes de que arranque la temporada, con
              puntos extra que suman a tu clasificación.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
