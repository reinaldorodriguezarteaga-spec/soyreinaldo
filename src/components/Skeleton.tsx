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
  return (
    <main className="page">
      <section className="phero">
        <div className="wrap">
          <SkeletonBar className="h-3 w-20" />
          <SkeletonBar className="mt-6 h-12 w-80" />
        </div>
      </section>
      <section className="section">
        <div className="wrap">
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </section>
      <p className="sr-only">{title}</p>
    </main>
  );
}
