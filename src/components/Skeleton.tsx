/**
 * Skeleton genérico — barras animadas para placeholders.
 * Se usa en loading.tsx files para dar feedback visual instantáneo
 * durante navegaciones. Tema Blaugrana Neón (tokens de globals.css).
 */
export function SkeletonBar({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse ${className}`}
      style={{
        borderRadius: "var(--radius)",
        background: "color-mix(in oklch, var(--line) 70%, transparent)",
      }}
      aria-hidden
    />
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse panel ${className}`} style={{ padding: 26 }} aria-hidden>
      <div
        className="mb-3 h-3 w-24"
        style={{
          borderRadius: 4,
          background: "color-mix(in oklch, var(--line) 70%, transparent)",
        }}
      />
      <div
        className="mb-2 h-5 w-2/3"
        style={{
          borderRadius: 4,
          background: "color-mix(in oklch, var(--line) 70%, transparent)",
        }}
      />
      <div
        className="h-3 w-full"
        style={{
          borderRadius: 4,
          background: "color-mix(in oklch, var(--line) 70%, transparent)",
        }}
      />
    </div>
  );
}

export function PageSkeleton({
  title = "Cargando…",
}: {
  title?: string;
}) {
  // 31-oct: con la forma de las páginas nuevas (título grande + lista).
  return (
    <main className="page">
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="wrap ios">
          <span className="skel" style={{ width: 180, height: 40 }} aria-hidden />
          <SkeletonLista filas={6} etiqueta={title} />
        </div>
      </section>
    </main>
  );
}

/**
 * Lista agrupada que «late» mientras llegan los datos (31-oct, estilo iOS):
 * misma forma que `.lista` (icono, dos líneas), para que al cargar no salte
 * nada. Para partidos, tablas y listas de la portada.
 */
export function SkeletonLista({ filas = 4, etiqueta = "Cargando…" }: { filas?: number; etiqueta?: string }) {
  return (
    <div className="lista skel-lista" role="status">
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className="lista__fila" aria-hidden>
          <span className="skel skel--icono" />
          <span className="lista__txt" style={{ gap: 6 }}>
            <span className="skel" style={{ width: `${55 + ((i * 17) % 30)}%`, height: 12 }} />
            <span className="skel" style={{ width: `${30 + ((i * 11) % 25)}%`, height: 10 }} />
          </span>
        </div>
      ))}
      <span className="sr-only">{etiqueta}</span>
    </div>
  );
}
