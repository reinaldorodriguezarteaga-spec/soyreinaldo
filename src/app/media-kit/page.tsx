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
  title: "Media Kit | Soy Reinaldo",
  description:
    "Media Kit oficial de @SoyReinaldoR. Audiencia, métricas, formatos publicitarios y tarifas para colaboraciones con marcas en el mundo del fútbol.",
};

type MetricKey =
  | "interactions"
  | "accounts"
  | "views"
  | "likes"
  | "comments"
  | "shares"
  | "saves"
  | "reposts"
  | "viewers"
  | "newViewers"
  | "subscribers"
  | "watchTime"
  | "playsShort"
  | "playsLong";

type Metric = { key: MetricKey; value: string; label: string };

const platforms = [
  {
    name: "Instagram",
    handle: "@SoyReinaldoR",
    metric: "54.400",
    label: "Seguidores",
    accent: "from-yellow-400 via-pink-600 to-purple-700",
    Logo: InstagramLogo,
  },
  {
    name: "Facebook",
    handle: "Fútbol con Reinaldo",
    metric: "34.001",
    label: "Seguidores",
    accent: "from-blue-500 via-blue-600 to-blue-700",
    Logo: FacebookLogo,
  },
  {
    name: "TikTok",
    handle: "@SoyReinaldoR",
    metric: "34.300",
    label: "Seguidores activos",
    accent: "from-[#25F4EE] via-zinc-700 to-[#FE2C55]",
    Logo: TikTokLogo,
  },
  {
    name: "YouTube",
    handle: "Fútbol con Reinaldo",
    metric: "8.948",
    label: "Suscriptores fieles",
    accent: "from-red-500 via-red-600 to-red-700",
    Logo: YouTubeLogo,
  },
  {
    name: "Threads",
    handle: "@SoyReinaldoR",
    metric: "7.315",
    label: "Seguidores",
    accent: "from-zinc-300 via-zinc-500 to-zinc-700",
    Logo: ThreadsLogo,
  },
] as const;

const TOTAL_FOLLOWERS = platforms.reduce(
  (acc, p) => acc + Number(p.metric.replace(/\./g, "")),
  0,
);

const igStats: Metric[] = [
  { key: "interactions", label: "Interacciones totales", value: "957.600" },
  { key: "accounts", label: "Cuentas alcanzadas", value: "300.936" },
  { key: "views", label: "Visualizaciones", value: "7,69M" },
  { key: "likes", label: "Me gusta", value: "415.848" },
  { key: "comments", label: "Comentarios", value: "11.875" },
  { key: "shares", label: "Veces compartido", value: "190.339" },
  { key: "saves", label: "Veces guardado", value: "23.809" },
  { key: "reposts", label: "Reposts", value: "15.293" },
];

const fbStats: Metric[] = [
  { key: "views", label: "Visualizaciones", value: "2,2M" },
  { key: "viewers", label: "Espectadores", value: "969.673" },
  { key: "interactions", label: "Interacciones", value: "190.972" },
  { key: "playsShort", label: "Reproducciones de 3s", value: "816.435" },
  { key: "playsLong", label: "Reproducciones de 1 min", value: "138.686" },
];

const fbDistribution = [
  { label: "Reels", percent: 85.2, color: "bg-indigo-300" },
  { label: "Foto", percent: 14.4, color: "bg-blue-500" },
];

const tiktokStats: Metric[] = [
  { key: "viewers", label: "Espectadores totales", value: "4,4M" },
  { key: "newViewers", label: "Espectadores nuevos", value: "2,7M" },
  { key: "likes", label: "Me gusta", value: "513K" },
  { key: "shares", label: "Veces compartido", value: "114K" },
  { key: "comments", label: "Comentarios", value: "7,3K" },
];

const ytStats: Metric[] = [
  { key: "subscribers", label: "Suscriptores fieles", value: "+9.000" },
  { key: "views", label: "Visualizaciones / mes", value: "+1,8M" },
  { key: "watchTime", label: "Tiempo visto / mes", value: "6.500h" },
];

const threadsStats: Metric[] = [
  { key: "views", label: "Visualizaciones", value: "670" },
];

const igDistribution = [
  { label: "Reels", percent: 71.9, color: "bg-indigo-300" },
  { label: "Publicaciones", percent: 22.0, color: "bg-pink-500" },
  { label: "Historias", percent: 6.1, color: "bg-amber-400" },
];

const marketing = [
  {
    title: "Inserts publicitarios",
    desc: "Botón animado de 3-5 segundos mostrando el perfil del patrocinador.",
  },
  {
    title: "Giveaways patrocinados",
    desc: "Sorteos con productos de la marca para potenciar alcance.",
  },
  {
    title: "Co-branding en retos",
    desc: "Desafíos patrocinados con participación de seguidores.",
  },
  {
    title: "Product placement",
    desc: "Integración sutil de productos en los videos.",
  },
];

const colaboraciones = [
  {
    title: "Colaboraciones exclusivas",
    desc: "Vídeo de 60 segundos dedicado a la marca y sus productos.",
  },
  {
    title: "Historias y encuestas",
    desc: "Menciones directas y encuestas interactivas relacionadas con la marca.",
  },
  {
    title: "Etiquetas y menciones",
    desc: "Llamados a la acción con enlaces directos al perfil del patrocinador.",
  },
  {
    title: "Hashtags de campaña",
    desc: "Hashtags exclusivos para campañas específicas.",
  },
];

const precios = [
  { title: "Historia", price: "100$", extra: "Pack 3 historias: 220$" },
  { title: "Reel", price: "200$", extra: "Vídeo dedicado en Instagram" },
  {
    title: "Mensual",
    price: "800$",
    extra:
      "Tu marca etiquetada en todos mis vídeos del mes (sin mención obligatoria)",
  },
];

function MetricIcon({ name }: { name: MetricKey }) {
  const props = {
    className: "h-4 w-4",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    viewBox: "0 0 24 24",
    "aria-hidden": true,
  } as const;
  switch (name) {
    case "interactions":
      return (
        <svg {...props}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 3L4 14h7l-1 7 9-11h-7l1-7z"
          />
        </svg>
      );
    case "accounts":
      return (
        <svg {...props}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17 20h5v-2a3 3 0 00-5.36-1.86M9 20H4v-2a3 3 0 015.36-1.86M9 20a3 3 0 013-3h0a3 3 0 013 3m-7-9a3 3 0 116 0 3 3 0 01-6 0zm10 1a2 2 0 100-4 2 2 0 000 4zM5 12a2 2 0 100-4 2 2 0 000 4z"
          />
        </svg>
      );
    case "views":
    case "viewers":
    case "newViewers":
      return (
        <svg {...props}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z"
          />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "likes":
      return (
        <svg {...props}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 21s-7-4.5-9.5-9.5C.5 7.5 4 4 7.5 5.5 9.5 6.5 12 9 12 9s2.5-2.5 4.5-3.5C20 4 23.5 7.5 21.5 11.5 19 16.5 12 21 12 21z"
          />
        </svg>
      );
    case "comments":
      return (
        <svg {...props}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 12c0 4-4 7-9 7-1.5 0-2.9-.2-4.2-.7L3 20l1.7-4.5C3.6 14.2 3 13.1 3 12c0-4 4-7 9-7s9 3 9 7z"
          />
        </svg>
      );
    case "shares":
      return (
        <svg {...props}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M16 6l-4-4-4 4M12 2v14"
          />
        </svg>
      );
    case "saves":
      return (
        <svg {...props}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z"
          />
        </svg>
      );
    case "reposts":
      return (
        <svg {...props}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3"
          />
        </svg>
      );
    case "subscribers":
      return (
        <svg {...props}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M22 11l-3-3m0 0l-3 3m3-3v8M9 11a4 4 0 100-8 4 4 0 000 8z"
          />
        </svg>
      );
    case "watchTime":
    case "playsShort":
    case "playsLong":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 7v5l3 3"
          />
        </svg>
      );
  }
}

function MetricCard({ metric }: { metric: Metric }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="flex items-center justify-between">
        <div className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {metric.value}
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-indigo-300">
          <MetricIcon name={metric.key} />
        </div>
      </div>
      <div className="mt-2 text-xs text-zinc-400">{metric.label}</div>
    </div>
  );
}

function DistributionBars({
  data,
}: {
  data: { label: string; percent: number; color: string }[];
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
        Distribución de contenido
      </div>
      <div className="mt-4 space-y-3">
        {data.map((row) => (
          <div key={row.label}>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-zinc-300">{row.label}</span>
              <span className="tabular-nums text-zinc-400">
                {row.percent.toLocaleString("es-ES")}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-900">
              <div
                className={`h-full rounded-full ${row.color}`}
                style={{ width: `${row.percent}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DonutChart({
  followersPercent,
  centerValue,
  centerLabel,
}: {
  followersPercent: number;
  centerValue: string;
  centerLabel: string;
}) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const followersArc = (followersPercent / 100) * circumference;

  return (
    <div className="relative flex aspect-square w-full max-w-[220px] items-center justify-center">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#27272a"
          strokeWidth="14"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#a5b4fc"
          strokeWidth="14"
          strokeDasharray={`${followersArc} ${circumference}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="text-2xl font-semibold tracking-tight">
          {centerValue}
        </div>
        <div className="mt-1 px-3 text-[10px] uppercase tracking-widest text-zinc-500">
          {centerLabel}
        </div>
      </div>
    </div>
  );
}

function PlatformHeader({
  Logo,
  name,
  period,
}: {
  Logo: React.ComponentType<{ className?: string }>;
  name: string;
  period?: string;
}) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-950 ring-1 ring-zinc-800">
          <Logo className="h-6 w-6" />
        </div>
        <h2 className="text-base font-semibold sm:text-lg">{name}</h2>
      </div>
      {period && <span className="text-xs text-zinc-600">{period}</span>}
    </div>
  );
}

export default function MediaKitPage() {
  return (
    <main className="flex flex-1 flex-col px-6 py-16">
      <div className="mx-auto w-full max-w-4xl">
        <header className="relative mb-12 overflow-hidden rounded-3xl border border-zinc-800">
          <div className="relative aspect-[16/9]">
            <Image
              src="/branding/stream-cinematica.jpg"
              alt="Set de SoyReinaldoR con trofeos del Barça, camiseta de Raphinha, balón de oro y copa de Champions"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 1024px"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/65 to-black/20" />
            <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10 lg:p-12">
              <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">
                Media Kit
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight drop-shadow-lg sm:text-5xl lg:text-6xl">
                <span className="text-indigo-300">@SoyReinaldoR</span>
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-200 drop-shadow sm:text-base lg:text-lg">
                Toda la información sobre mis perfiles, métricas y opciones de
                colaboración. Si crees que hay encaje con tu marca, hablemos.
              </p>
            </div>
          </div>
        </header>

        <section className="mb-12 overflow-hidden rounded-3xl border border-indigo-400/20 bg-gradient-to-br from-indigo-950/40 via-zinc-950 to-zinc-950 p-8 sm:p-10">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">
                Audiencia total
              </p>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-5xl font-semibold tracking-tight text-white sm:text-6xl">
                  {TOTAL_FOLLOWERS.toLocaleString("es-ES")}
                </span>
                <span className="text-base text-zinc-400">seguidores</span>
              </div>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-400">
                Sumando Instagram, Facebook, TikTok, YouTube y Threads. La
                comunidad culé que escucha cada vez que abro un directo.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {platforms.map((p) => (
                <div
                  key={p.name}
                  className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1.5"
                >
                  <p.Logo className="h-4 w-4" />
                  <span className="text-xs font-medium tabular-nums text-zinc-300">
                    {p.metric}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-xs font-medium uppercase tracking-[0.25em] text-zinc-500">
            Presencia en redes
          </h2>
          <div className="mt-5 flex flex-wrap justify-center gap-4">
            {platforms.map((p) => (
              <div
                key={p.name}
                className="relative w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-6 sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.667rem)]"
              >
                <div
                  aria-hidden
                  className={`pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br opacity-15 blur-2xl ${p.accent}`}
                />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 ring-1 ring-zinc-800">
                      <p.Logo className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] uppercase tracking-widest text-zinc-500">
                      {p.name}
                    </span>
                  </div>
                  <div className="mt-5 text-4xl font-semibold tracking-tight text-indigo-300 sm:text-5xl">
                    {p.metric}
                  </div>
                  <div className="mt-1 text-sm text-zinc-300">{p.label}</div>
                  <div className="mt-2 text-xs text-zinc-500">{p.handle}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <PlatformHeader
            Logo={InstagramLogo}
            name="Estadísticas Instagram"
            period="últimos 30 días"
          />

          <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
            <div className="grid gap-3 sm:grid-cols-2">
              {igStats.map((s) => (
                <MetricCard key={s.label} metric={s} />
              ))}
            </div>

            <div className="flex flex-col items-center rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
              <DonutChart
                followersPercent={41.9}
                centerValue="41,9%"
                centerLabel="seguidores que interactúan"
              />
              <div className="mt-3 w-full space-y-1.5 text-xs text-zinc-400">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-indigo-300" />
                    Seguidores
                  </div>
                  <span className="tabular-nums text-zinc-300">41,9%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-zinc-700" />
                    No seguidores
                  </div>
                  <span className="tabular-nums text-zinc-300">58,1%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <DistributionBars data={igDistribution} />
          </div>
        </section>

        <section className="mb-16">
          <PlatformHeader
            Logo={FacebookLogo}
            name="Estadísticas Facebook"
            period="últimos 30 días"
          />
          <div className="flex flex-wrap justify-center gap-3">
            {fbStats.map((s) => (
              <div
                key={s.label}
                className="w-full sm:w-[calc(50%-0.375rem)] lg:w-[calc(33.333%-0.5rem)]"
              >
                <MetricCard metric={s} />
              </div>
            ))}
          </div>
          <div className="mt-5">
            <DistributionBars data={fbDistribution} />
          </div>
        </section>

        <section className="mb-16">
          <PlatformHeader
            Logo={TikTokLogo}
            name="Estadísticas TikTok"
            period="últimos 30 días"
          />
          <div className="flex flex-wrap justify-center gap-3">
            {tiktokStats.map((s) => (
              <div
                key={s.label}
                className="w-full sm:w-[calc(50%-0.375rem)] lg:w-[calc(33.333%-0.5rem)]"
              >
                <MetricCard metric={s} />
              </div>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <PlatformHeader
            Logo={YouTubeLogo}
            name="Estadísticas YouTube"
            period="recurrente / mes"
          />
          <div className="grid gap-3 sm:grid-cols-3">
            {ytStats.map((s) => (
              <MetricCard key={s.label} metric={s} />
            ))}
          </div>
        </section>

        <section className="mb-16">
          <PlatformHeader
            Logo={ThreadsLogo}
            name="Estadísticas Threads"
            period="últimos 30 días"
          />
          <div className="grid gap-3 sm:grid-cols-3">
            {threadsStats.map((s) => (
              <MetricCard key={s.label} metric={s} />
            ))}
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-xs font-medium uppercase tracking-[0.25em] text-zinc-500">
            Estrategias de marketing
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {marketing.map((m) => (
              <div
                key={m.title}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
              >
                <h3 className="text-base font-semibold">{m.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  {m.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-xs font-medium uppercase tracking-[0.25em] text-zinc-500">
            Opciones de colaboración
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {colaboraciones.map((c) => (
              <div
                key={c.title}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
              >
                <h3 className="text-base font-semibold">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  {c.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-xs font-medium uppercase tracking-[0.25em] text-zinc-500">
            Tarifas
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {precios.map((p) => (
              <div
                key={p.title}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
              >
                <div className="text-xs uppercase tracking-widest text-indigo-300">
                  {p.title}
                </div>
                <div className="mt-3 text-4xl font-semibold tracking-tight">
                  {p.price}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-zinc-400">
                  {p.extra}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-zinc-500">
            Tarifas orientativas. Para campañas a medida, escríbeme.
          </p>
        </section>

        <section className="rounded-2xl border border-indigo-400/20 bg-gradient-to-br from-indigo-950/40 to-zinc-950 p-8 sm:p-10">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            ¿Hablamos?
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-300">
            Gracias por considerarme como aliado para potenciar tu marca en el
            mundo del fútbol. Si crees que hay encaje, ponte en contacto y
            vemos qué podemos hacer juntos.
          </p>
          <Link
            href="/contacto"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-300 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-indigo-200"
          >
            Contáctame
            <span>→</span>
          </Link>
        </section>
      </div>
    </main>
  );
}
