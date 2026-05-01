/**
 * Skeleton genérico — barras grises animadas para placeholders.
 * Se usa en loading.tsx files para dar feedback visual instantáneo
 * durante navegaciones.
 */
export function SkeletonBar({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-zinc-800/60 ${className}`}
      aria-hidden
    />
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-2xl border border-zinc-800 bg-zinc-950 p-6 ${className}`}
      aria-hidden
    >
      <div className="mb-3 h-3 w-24 rounded bg-zinc-800/60" />
      <div className="mb-2 h-5 w-2/3 rounded bg-zinc-800/60" />
      <div className="h-3 w-full rounded bg-zinc-800/60" />
    </div>
  );
}

export function PageSkeleton({
  title = "Cargando…",
}: {
  title?: string;
}) {
  return (
    <main className="flex flex-1 flex-col px-6 py-12">
      <div className="mx-auto w-full max-w-4xl">
        <SkeletonBar className="h-3 w-20" />
        <header className="mt-8 mb-10">
          <SkeletonBar className="h-3 w-32" />
          <SkeletonBar className="mt-4 h-10 w-64" />
        </header>
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <p className="sr-only">{title}</p>
      </div>
    </main>
  );
}
