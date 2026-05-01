import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import DonationCard from "@/components/DonationCard";
import MatchWidget from "@/components/MatchWidget";
import { SkeletonBar } from "@/components/Skeleton";
import {
  InstagramLogo,
  WhatsAppLogo,
} from "@/components/social-logos";

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
                Cuento el fútbol desde la pasión culé.{" "}
                <span className="text-indigo-300">+138.000 seguidores</span>{" "}
                entre Instagram, Facebook, TikTok, YouTube y Threads, y más de
                7,7M de visualizaciones al mes solo en Instagram.
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
              className="group mt-3 flex items-center gap-4 overflow-hidden rounded-2xl border border-indigo-400/20 bg-gradient-to-r from-[#a50044]/20 via-zinc-950 to-[#154284]/25 p-5 transition hover:border-indigo-300"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-[0.25em] text-indigo-300 sm:text-xs">
                  Camisetas de Fútbol
                </p>
                <p className="mt-1 text-sm font-semibold sm:text-base">
                  Con código{" "}
                  <span className="font-mono text-indigo-300">REY15</span>
                </p>
              </div>
              <Image
                src="/branding/camisetas-futbol-light.png"
                alt="Camisetas de Fútbol"
                width={140}
                height={70}
                className="h-10 w-auto shrink-0 object-contain transition-transform group-hover:translate-x-0.5 sm:h-12"
                priority
              />
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
              width={1509}
              height={2000}
              className="h-auto w-full object-contain drop-shadow-2xl"
              priority
            />
          </div>
        </div>

        <Suspense
          fallback={
            <section className="mt-12 sm:mt-16">
              <SkeletonBar className="h-3 w-24" />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <SkeletonBar className="h-16" />
                <SkeletonBar className="h-16" />
              </div>
            </section>
          }
        >
          <MatchWidget />
        </Suspense>

        <section className="mt-16 sm:mt-20">
          <h2 className="text-xs uppercase tracking-[0.3em] text-indigo-300">
            Únete a la comunidad
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <a
              href="https://chat.whatsapp.com/IGLfZ6vPgL93t2yBOdJlvq?mode=gi_t"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-6 transition hover:border-[#25D366]/60"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#25D366]/15">
                  <WhatsAppLogo className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-zinc-500">
                    WhatsApp · Grupo
                  </p>
                  <p className="text-base font-semibold">
                    Los conos de WhatsApp
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-zinc-400">
                Charla diaria sobre fútbol con el resto de culés. Avisos de
                directos y debates en tiempo real.
              </p>
              <div className="mt-5 inline-flex items-center text-sm font-medium text-[#25D366]">
                Unirme
                <span className="ml-1 transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </div>
            </a>

            <a
              href="https://www.instagram.com/channel/AbbBGATt0sCKBXEn/"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-6 transition hover:border-pink-500/60"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-yellow-400 via-pink-600 to-purple-700">
                  <InstagramLogo className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-zinc-500">
                    Canal de Instagram
                  </p>
                  <p className="text-base font-semibold">
                    Los conos de Instagram
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    +3.200 conos
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-zinc-400">
                Avisos exclusivos, encuestas y contenido directo en tu
                Instagram. Sin saturar el feed.
              </p>
              <div className="mt-5 inline-flex items-center text-sm font-medium text-pink-400">
                Unirme
                <span className="ml-1 transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </div>
            </a>
          </div>
        </section>

        <section className="mt-12 sm:mt-16">
          <DonationCard />
        </section>

        <footer className="mt-16 flex flex-col gap-3 text-center text-xs text-zinc-600 sm:mt-20 sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <p>
            © {new Date().getFullYear()} Reinaldo Rodríguez · Fútbol con
            Reinaldo
          </p>
          <div className="flex justify-center gap-4 sm:justify-end">
            <Link href="/privacidad" className="transition hover:text-zinc-300">
              Privacidad
            </Link>
            <Link
              href="/eliminar-datos"
              className="transition hover:text-zinc-300"
            >
              Eliminar mis datos
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
