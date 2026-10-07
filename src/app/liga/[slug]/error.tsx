"use client";

/**
 * Error temporal de las páginas de /liga/[slug]/* — sobre todo cuando
 * API-Football se queda sin cuota del día: la ficha no se puede construir,
 * pero tampoco "no existe" (eso sería un 404 y Google la borraría).
 */
export default function LigaError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="page">
      <div className="wrap" style={{ padding: "64px 0", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.4rem", margin: "0 0 10px" }}>
          Estos datos no están disponibles ahora mismo
        </h1>
        <p style={{ color: "var(--text-dim)", margin: "0 0 20px" }}>
          Nuestro proveedor de datos no responde en este momento. Vuelve a intentarlo en un rato.
        </p>
        <button type="button" className="btn btn--accent" onClick={reset}>
          Reintentar
        </button>
      </div>
    </main>
  );
}
