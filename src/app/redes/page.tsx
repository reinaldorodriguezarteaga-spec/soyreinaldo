import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Redes | Soy Reinaldo",
  description:
    "Todas las redes de @SoyReinaldoR: YouTube, Instagram y TikTok. Más de 95.000 personas siguiéndome.",
};

function VerifiedBadge({ color = "#3897F0" }: { color?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      aria-label="Verificado"
    >
      <path
        fill={color}
        d="M12 1.5l2.6 1.9 3.2-.4 1 3.1 2.6 1.9-1 3.1 1 3.1-2.6 1.9-1 3.1-3.2-.4L12 22.5l-2.6-1.9-3.2.4-1-3.1-2.6-1.9 1-3.1-1-3.1 2.6-1.9 1-3.1 3.2.4L12 1.5z"
      />
      <path
        fill="#fff"
        d="M10.5 15.3l-3-3 1.4-1.4 1.6 1.6 4.6-4.6 1.4 1.4z"
      />
    </svg>
  );
}

function Avatar({ ring }: { ring?: string }) {
  return (
    <div
      className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-zinc-800 ${
        ring ?? "ring-2 ring-zinc-700"
      }`}
    >
      <Image
        src="/branding/retrato.png"
        alt="Reinaldo"
        fill
        sizes="64px"
        className="object-cover"
        style={{ objectPosition: "center 18%" }}
      />
    </div>
  );
}

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

        <div className="space-y-4">
          {/* YouTube */}
          <a
            href="https://www.youtube.com/@SoyReinaldoR"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 transition hover:border-zinc-700"
          >
            <Avatar ring="ring-2 ring-zinc-700" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="truncate text-base font-semibold sm:text-lg">
                  Fútbol con Reinaldo
                </h2>
                <VerifiedBadge color="#FF0000" />
              </div>
              <p className="mt-1 text-xs text-zinc-400 sm:text-sm">
                9K suscriptores · +1,2M visualizaciones/mes
              </p>
            </div>
            <span className="hidden shrink-0 rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition group-hover:bg-red-700 sm:inline-block">
              Suscribirme
            </span>
            <span className="shrink-0 rounded-full bg-red-600 px-3 py-2 text-xs font-semibold text-white transition group-hover:bg-red-700 sm:hidden">
              Suscribirme
            </span>
          </a>

          {/* Instagram */}
          <a
            href="https://www.instagram.com/soyreinaldor/"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 transition hover:border-zinc-700"
          >
            <div className="relative h-16 w-16 shrink-0 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-600 to-purple-700 p-[2px]">
              <div className="relative h-full w-full overflow-hidden rounded-full bg-zinc-950">
                <Image
                  src="/branding/retrato.png"
                  alt="Reinaldo"
                  fill
                  sizes="64px"
                  className="object-cover"
                  style={{ objectPosition: "center 18%" }}
                />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="truncate text-base font-semibold sm:text-lg">
                  @SoyReinaldoR
                </h2>
                <VerifiedBadge color="#3897F0" />
              </div>
              <p className="mt-1 text-xs text-zinc-400 sm:text-sm">
                54K seguidores · +7,7M visualizaciones/mes
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-600 to-purple-700 px-5 py-2.5 text-sm font-semibold text-white transition group-hover:opacity-90">
              Seguir
            </span>
          </a>

          {/* TikTok */}
          <a
            href="https://www.tiktok.com/@soyreinaldor"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-5 transition hover:border-zinc-700"
          >
            <Avatar ring="ring-2 ring-zinc-700" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="truncate text-base font-semibold sm:text-lg">
                  @SoyReinaldoR
                </h2>
                <VerifiedBadge color="#25F4EE" />
              </div>
              <p className="mt-1 text-xs text-zinc-400 sm:text-sm">
                32K seguidores · +7M visualizaciones/mes
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-[#FE2C55] px-5 py-2.5 text-sm font-semibold text-white transition group-hover:bg-[#e6234a]">
              Seguir
            </span>
          </a>
        </div>

        <p className="mt-10 text-center text-xs text-zinc-600">
          Más de 95.000 personas en redes · 513K me gusta acumulados en TikTok
        </p>
      </div>
    </main>
  );
}
