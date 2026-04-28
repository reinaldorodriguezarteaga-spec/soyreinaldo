import Image from "next/image";
import Link from "next/link";
import DonationCard from "@/components/DonationCard";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center px-6 py-12 sm:py-20">
      <div className="w-full max-w-5xl">
        <div className="flex flex-col-reverse gap-10 sm:grid sm:grid-cols-[1fr_320px] sm:items-center sm:gap-12 lg:grid-cols-[1fr_400px]">
          <div>
            <header className="mb-10 text-center sm:text-left">
              <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">
                Fútbol con Reinaldo
              </p>
              <h1 className="mt-4 text-5xl font-semibold tracking-tight sm:text-6xl">
                Soy <span className="text-indigo-300">Reinaldo</span>.
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-zinc-400 sm:mx-0 sm:text-lg">
                Cuento el fútbol desde la pasión culé. Más de{" "}
                <span className="text-indigo-300">7,7M de visualizaciones</span>{" "}
                en Instagram, +1,2M al mes en YouTube y 95.000 seguidores entre
                todas mis redes.
              </p>
            </header>

            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href="/quiniela"
                className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-6 transition hover:border-indigo-300 hover:bg-zinc-900"
              >
                <div className="text-xs uppercase tracking-[0.2em] text-indigo-300">
                  Mundial 2026
                </div>
                <h2 className="mt-3 text-xl font-semibold sm:text-2xl">
                  Quiniela
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  Pronostica los partidos del Mundial con la comunidad.
                </p>
                <div className="mt-6 inline-flex items-center text-sm font-medium text-indigo-300">
                  Entrar
                  <span className="ml-1 transition-transform group-hover:translate-x-0.5">
                    →
                  </span>
                </div>
              </Link>

              <Link
                href="/redes"
                className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-6 transition hover:border-indigo-300 hover:bg-zinc-900"
              >
                <div className="text-xs uppercase tracking-[0.2em] text-indigo-300">
                  @SoyReinaldoR
                </div>
                <h2 className="mt-3 text-xl font-semibold sm:text-2xl">
                  Redes
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  YouTube, Instagram, TikTok y más.
                </p>
                <div className="mt-6 inline-flex items-center text-sm font-medium text-indigo-300">
                  Sígueme
                  <span className="ml-1 transition-transform group-hover:translate-x-0.5">
                    →
                  </span>
                </div>
              </Link>
            </div>

            <Link
              href="/camisetas"
              className="group mt-3 flex items-center justify-between gap-4 overflow-hidden rounded-2xl border border-indigo-400/20 bg-gradient-to-r from-[#a50044]/20 via-zinc-950 to-[#154284]/25 p-5 transition hover:border-indigo-300"
            >
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.25em] text-indigo-300 sm:text-xs">
                  Tienda partner
                </p>
                <p className="mt-1 text-sm font-semibold sm:text-base">
                  Camisetas con código{" "}
                  <span className="font-mono text-indigo-300">REY15</span>
                </p>
              </div>
              <span className="shrink-0 text-sm font-medium text-indigo-300 transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </Link>
          </div>

          <div className="relative mx-auto w-full max-w-[280px] sm:max-w-none">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-4 top-12 bottom-8 -z-10 rounded-full bg-indigo-500/25 blur-3xl"
            />
            <Image
              src="/branding/retrato.png"
              alt="Reinaldo con la camiseta del FC Barcelona"
              width={1200}
              height={1840}
              className="h-auto w-full object-contain drop-shadow-2xl"
              priority
            />
          </div>
        </div>

        <section className="mt-16 sm:mt-20">
          <DonationCard />
        </section>

        <footer className="mt-16 text-center text-xs text-zinc-600 sm:mt-20 sm:text-left">
          © {new Date().getFullYear()} Reinaldo Rodríguez · Fútbol con Reinaldo
        </footer>
      </div>
    </main>
  );
}
