import Link from "next/link";

export const metadata = {
  title: "Redes | Soy Reinaldo",
  description:
    "Todas las redes de @SoyReinaldoR: YouTube, Instagram y TikTok. Más de 95.000 personas siguiéndome.",
};

const redes = [
  {
    name: "YouTube",
    handle: "@SoyReinaldoR",
    audience: "9K suscriptores · +1,2M visualizaciones/mes",
    href: "https://www.youtube.com/@SoyReinaldoR",
  },
  {
    name: "Instagram",
    handle: "@SoyReinaldoR",
    audience: "54K seguidores · +7,7M visualizaciones/mes",
    href: "https://www.instagram.com/soyreinaldor/",
  },
  {
    name: "TikTok",
    handle: "@SoyReinaldoR",
    audience: "32K seguidores · +7M visualizaciones/mes",
    href: "https://www.tiktok.com/@soyreinaldor",
  },
];

export default function RedesPage() {
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
            @SoyReinaldoR
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Mis <span className="text-indigo-300">redes</span>.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-zinc-400">
            Sígueme donde más uses. Subo análisis, reacciones y debates de
            fútbol — siempre desde la pasión culé.
          </p>
        </header>

        <div className="grid gap-3">
          {redes.map((r) => (
            <a
              key={r.name}
              href={r.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950 p-6 transition hover:border-indigo-300"
            >
              <div>
                <div className="text-xs uppercase tracking-widest text-indigo-300">
                  {r.name}
                </div>
                <div className="mt-2 text-lg font-semibold">{r.handle}</div>
                <div className="mt-1 text-xs text-zinc-500">{r.audience}</div>
              </div>
              <span className="text-zinc-500 transition group-hover:translate-x-0.5 group-hover:text-indigo-300">
                →
              </span>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
