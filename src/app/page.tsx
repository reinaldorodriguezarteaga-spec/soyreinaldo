import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-20">
      <div className="w-full max-w-3xl">
        <header className="mb-14 text-center sm:text-left">
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">
            Fútbol con Reinaldo
          </p>
          <h1 className="mt-4 text-5xl font-semibold tracking-tight sm:text-6xl">
            Soy <span className="text-indigo-300">Reinaldo</span>.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-zinc-400 sm:mx-0">
            Cuento el fútbol desde la pasión culé. Más de 95.000 personas en
            redes y +1,2M de visualizaciones al mes en YouTube.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/quiniela"
            className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-7 transition hover:border-indigo-300 hover:bg-zinc-900"
          >
            <div className="text-xs uppercase tracking-[0.2em] text-indigo-300">
              Mundial 2026
            </div>
            <h2 className="mt-3 text-2xl font-semibold">Quiniela</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Pronostica los partidos del Mundial con la comunidad.
            </p>
            <div className="mt-8 inline-flex items-center text-sm font-medium text-indigo-300">
              Entrar
              <span className="ml-1 transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </div>
          </Link>

          <Link
            href="/redes"
            className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-7 transition hover:border-indigo-300 hover:bg-zinc-900"
          >
            <div className="text-xs uppercase tracking-[0.2em] text-indigo-300">
              @SoyReinaldoR
            </div>
            <h2 className="mt-3 text-2xl font-semibold">Redes</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              YouTube, Instagram, TikTok y más.
            </p>
            <div className="mt-8 inline-flex items-center text-sm font-medium text-indigo-300">
              Sígueme
              <span className="ml-1 transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </div>
          </Link>
        </div>

        <footer className="mt-20 text-xs text-zinc-600">
          © {new Date().getFullYear()} Reinaldo Rodríguez · Fútbol con Reinaldo
        </footer>
      </div>
    </main>
  );
}
