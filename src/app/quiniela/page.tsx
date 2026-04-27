import Link from "next/link";

export const metadata = {
  title: "Quiniela Mundial 2026 | Soy Reinaldo",
  description:
    "Quiniela del Mundial FIFA 2026 con la comunidad de Fútbol con Reinaldo. Pronósticos por fase, ranking en vivo y resultados sincronizados.",
};

export default function QuinielaPage() {
  return (
    <main className="flex flex-1 flex-col px-6 py-16">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href="/"
          className="text-sm text-zinc-500 transition hover:text-white"
        >
          ← Volver
        </Link>

        <header className="mt-8 mb-12">
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">
            Mundial 2026 · 11 jun – 19 jul
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Quiniela del <span className="text-indigo-300">Mundial</span>.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-zinc-400">
            Estamos montando la quiniela para que la disfrutemos juntos durante
            el Mundial. Lanzamiento previsto para el 11 de junio de 2026.
          </p>
        </header>

        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950 p-8">
          <p className="text-xs uppercase tracking-widest text-indigo-300">
            Próximamente
          </p>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-zinc-300">
            <li>· Registro con email</li>
            <li>· Pronósticos por fase (grupos, octavos, cuartos…)</li>
            <li>· Ranking en vivo</li>
            <li>· Resultados sincronizados con la API oficial</li>
            <li>· Aforo limitado a 100 personas</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
