import Link from "next/link";

const sections = [
  {
    href: "/quiniela",
    title: "Quiniela Mundial 2026",
    description: "Pronostica los partidos del Mundial con la comunidad.",
  },
  {
    href: "/media-kit",
    title: "Media kit",
    description: "Datos, audiencia y contacto para marcas.",
  },
  {
    href: "/redes",
    title: "Redes",
    description: "Sígueme en YouTube, Instagram, TikTok y X.",
  },
  {
    href: "/contacto",
    title: "Contacto",
    description: "Escríbeme para colaboraciones o dudas.",
  },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl">
        <header className="mb-12">
          <p className="text-sm uppercase tracking-widest text-zinc-500">
            Fútbol con Reinaldo
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
            Soy Reinaldo.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
            Cuento el fútbol desde la pasión culé. Aquí tienes mi quiniela del
            Mundial, mi media kit y todas mis redes en un mismo sitio.
          </p>
        </header>

        <nav className="grid gap-3 sm:grid-cols-2">
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group rounded-xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-900 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-100"
            >
              <h2 className="text-base font-semibold">
                {section.title}
                <span className="ml-1 inline-block transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {section.description}
              </p>
            </Link>
          ))}
        </nav>

        <footer className="mt-16 text-sm text-zinc-500">
          © {new Date().getFullYear()} Reinaldo Rodríguez
        </footer>
      </div>
    </main>
  );
}
