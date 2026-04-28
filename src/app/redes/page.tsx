import Image from "next/image";
import Link from "next/link";
import {
  FacebookLogo,
  InstagramLogo,
  ThreadsLogo,
  TikTokLogo,
  YouTubeLogo,
} from "@/components/social-logos";

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
      <path fill="#fff" d="M10.5 15.3l-3-3 1.4-1.4 1.6 1.6 4.6-4.6 1.4 1.4z" />
    </svg>
  );
}

function AvatarWithLogo({
  ring,
  logo,
  bgClass,
}: {
  ring?: string;
  logo: React.ReactNode;
  bgClass?: string;
}) {
  return (
    <div className="relative shrink-0">
      <Image
        src="/branding/avatar.jpg"
        alt="Reinaldo"
        width={160}
        height={160}
        className={`h-16 w-16 rounded-full object-cover ${ring ?? "ring-2 ring-zinc-700"}`}
      />
      <div
        className={`absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full ring-2 ring-zinc-950 ${bgClass ?? "bg-zinc-950"}`}
      >
        {logo}
      </div>
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
          <a
            href="https://www.youtube.com/@SoyReinaldoR"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 transition hover:border-zinc-700"
          >
            <AvatarWithLogo logo={<YouTubeLogo className="h-4 w-4" />} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="truncate text-base font-semibold sm:text-lg">
                  Fútbol con Reinaldo
                </h2>
                <VerifiedBadge color="#FF0000" />
              </div>
              <p className="mt-1 text-xs text-zinc-400 sm:text-sm">
                YouTube · +9.000 suscriptores · +1,8M visualizaciones/mes
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white transition group-hover:bg-red-700 sm:px-5 sm:py-2.5 sm:text-sm">
              Suscribirme
            </span>
          </a>

          <a
            href="https://www.instagram.com/soyreinaldor/"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 transition hover:border-zinc-700"
          >
            <div className="relative shrink-0">
              <div className="rounded-full bg-gradient-to-tr from-yellow-400 via-pink-600 to-purple-700 p-[2px]">
                <Image
                  src="/branding/avatar.jpg"
                  alt="Reinaldo"
                  width={160}
                  height={160}
                  className="block h-[60px] w-[60px] rounded-full bg-zinc-950 object-cover"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-zinc-950 ring-2 ring-zinc-950">
                <InstagramLogo className="h-4 w-4" />
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
                Instagram · 54,4K seguidores · +7,7M visualizaciones/mes
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-600 to-purple-700 px-4 py-2 text-xs font-semibold text-white transition group-hover:opacity-90 sm:px-5 sm:py-2.5 sm:text-sm">
              Seguir
            </span>
          </a>

          <a
            href="https://www.tiktok.com/@soyreinaldor"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 transition hover:border-zinc-700"
          >
            <AvatarWithLogo logo={<TikTokLogo className="h-4 w-4" />} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="truncate text-base font-semibold sm:text-lg">
                  @SoyReinaldoR
                </h2>
                <VerifiedBadge color="#25F4EE" />
              </div>
              <p className="mt-1 text-xs text-zinc-400 sm:text-sm">
                TikTok · 34,3K seguidores · +4M visualizaciones/mes
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-[#FE2C55] px-4 py-2 text-xs font-semibold text-white transition group-hover:bg-[#e6234a] sm:px-5 sm:py-2.5 sm:text-sm">
              Seguir
            </span>
          </a>

          <a
            href="https://www.facebook.com/SoyReinaldo"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 transition hover:border-zinc-700"
          >
            <AvatarWithLogo logo={<FacebookLogo className="h-4 w-4" />} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="truncate text-base font-semibold sm:text-lg">
                  Fútbol con Reinaldo
                </h2>
                <VerifiedBadge color="#1877F2" />
              </div>
              <p className="mt-1 text-xs text-zinc-400 sm:text-sm">
                Facebook · 34K seguidores · +2,2M visualizaciones/mes
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-[#1877F2] px-4 py-2 text-xs font-semibold text-white transition group-hover:bg-[#1465d8] sm:px-5 sm:py-2.5 sm:text-sm">
              Seguir
            </span>
          </a>

          <a
            href="https://www.threads.com/@soyreinaldor"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 transition hover:border-zinc-700"
          >
            <AvatarWithLogo logo={<ThreadsLogo className="h-4 w-4 text-white" />} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="truncate text-base font-semibold sm:text-lg">
                  @SoyReinaldoR
                </h2>
                <VerifiedBadge color="#a1a1aa" />
              </div>
              <p className="mt-1 text-xs text-zinc-400 sm:text-sm">
                Threads · 7,3K seguidores
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-white px-4 py-2 text-xs font-semibold text-black transition group-hover:bg-zinc-200 sm:px-5 sm:py-2.5 sm:text-sm">
              Seguir
            </span>
          </a>
        </div>

        <p className="mt-10 text-center text-xs text-zinc-600">
          +138.000 personas en mis redes · 513K me gusta acumulados en TikTok
        </p>
      </div>
    </main>
  );
}
