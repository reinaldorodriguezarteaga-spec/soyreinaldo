import Link from "next/link";
import {
  FacebookLogo,
  InstagramLogo,
  ThreadsLogo,
  TikTokLogo,
  YouTubeLogo,
} from "@/components/social-logos";
import { getSocialStats } from "@/lib/social-stats";

export const metadata = {
  alternates: { canonical: "/media-kit" },
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

/**
 * Metadatos fijos de cada plataforma (nombre, handle, logo, etiqueta). El
 * número de seguidores NO va aquí — sale de `getSocialStats()` (misma
 * fuente que portada/redes/contacto y el admin en /admin/seguidores) para
 * no tener que tocar código cada vez que cambian las cifras.
 */
const PLATFORM_META = [
  {
    key: "ig_followers",
    name: "Instagram",
    handle: "@SoyReinaldoR",
    label: "Seguidores",
    Logo: InstagramLogo,
  },
  {
    key: "fb_followers",
    name: "Facebook",
    handle: "Fútbol con Reinaldo",
    label: "Seguidores",
    Logo: FacebookLogo,
  },
  {
    key: "tt_followers",
    name: "TikTok",
    handle: "@SoyReinaldoR",
    label: "Seguidores activos",
    Logo: TikTokLogo,
  },
  {
    key: "yt_subscribers",
    name: "YouTube",
    handle: "Fútbol con Reinaldo",
    label: "Suscriptores fieles",
    Logo: YouTubeLogo,
  },
  {
    key: "threads_followers",
    name: "Threads",
    handle: "@SoyReinaldoR",
    label: "Seguidores",
    Logo: ThreadsLogo,
  },
] as const;

/**
 * Periodo de las estadísticas de Instagram y de la audiencia: el panel
 * profesional de Meta, «últimos 30 días» a fecha de la captura. Al
 * actualizar las cifras, cambiar también esta fecha (una marca desconfía
 * de unos «últimos 30 días» sin fecha).
 */
const PERIODO_IG = "13 oct – 11 nov 2026";

const CORREO = "reinaldorodriguezarteaga@gmail.com";

const igStats: Metric[] = [
  { key: "views", label: "Reproducciones", value: "15,6M" },
  { key: "viewers", label: "Espectadores únicos", value: "5,85M" },
  { key: "accounts", label: "Vistas de no seguidores", value: "8,8M" },
  { key: "subscribers", label: "Vistas de seguidores", value: "1,25M" },
];

/** Audiencia de Instagram, mismo periodo (pestaña «Público» del panel). */
const genero = [
  { label: "Hombres", percent: 91.0 },
  { label: "Mujeres", percent: 9.0 },
];

const edades = [
  { label: "13-17", percent: 5.3 },
  { label: "18-24", percent: 16.2 },
  { label: "25-34", percent: 34.1 },
  { label: "35-44", percent: 23.8 },
  { label: "45-54", percent: 12.7 },
  { label: "55-64", percent: 5.2 },
  { label: "65+", percent: 2.8 },
];

const paises = [
  { label: "España", percent: 18.6 },
  { label: "Venezuela", percent: 11.9 },
  { label: "Estados Unidos", percent: 10.5 },
  { label: "Cuba", percent: 7.6 },
  { label: "México", percent: 5.7 },
];

const idiomas = [
  { label: "Español", percent: 82.7 },
  { label: "Inglés", percent: 8.0 },
  { label: "Árabe", percent: 2.8 },
  { label: "Francés", percent: 2.2 },
  { label: "Portugués", percent: 1.2 },
];

const fbStats: Metric[] = [
  { key: "views", label: "Visualizaciones", value: "8,4M" },
  { key: "viewers", label: "Espectadores", value: "969.673" },
  { key: "interactions", label: "Interacciones", value: "190.972" },
  { key: "playsShort", label: "Reproducciones de 3s", value: "816.435" },
  { key: "playsLong", label: "Reproducciones de 1 min", value: "138.686" },
];

const fbDistribution = [
  { label: "Reels", percent: 85.2 },
  { label: "Foto", percent: 14.4 },
];

const tiktokStats: Metric[] = [
  { key: "viewers", label: "Espectadores totales", value: "4,4M" },
  { key: "newViewers", label: "Espectadores nuevos", value: "2,7M" },
  { key: "likes", label: "Me gusta", value: "513K" },
  { key: "shares", label: "Veces compartido", value: "114K" },
  { key: "comments", label: "Comentarios", value: "7,3K" },
];

const ytStats: Metric[] = [
  { key: "subscribers", label: "Suscriptores fieles", value: "+9.300" },
  { key: "views", label: "Visualizaciones / mes", value: "+1,8M" },
  { key: "watchTime", label: "Tiempo visto / mes", value: "6.500h" },
];

const threadsStats: Metric[] = [
  { key: "views", label: "Visualizaciones", value: "670" },
];

// Reels 13M · publicaciones 1,9M · historias 332K (los reels incluyen sus
// vistas en Facebook, como las cuenta el panel de Meta).
const igDistribution = [
  { label: "Reels", percent: 85.3 },
  { label: "Publicaciones", percent: 12.5 },
  { label: "Historias", percent: 2.2 },
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
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
        </svg>
      );
  }
}

function MetricCard({ metric }: { metric: Metric }) {
  return (
    <div className="mcard">
      <div className="mcard__top">
        <div className="mcard__v">{metric.value}</div>
        <div className="mcard__icon">
          <MetricIcon name={metric.key} />
        </div>
      </div>
      <div className="mcard__l">{metric.label}</div>
    </div>
  );
}

function DistributionBars({
  data,
  titulo = "Distribución de contenido",
}: {
  data: { label: string; percent: number }[];
  titulo?: string;
}) {
  // La barra más larga llena la pista: con el porcentaje tal cual, un
  // 18,6% (el país que más pesa) se quedaba en una raya.
  const max = Math.max(...data.map((r) => r.percent));
  return (
    <div className="bars">
      <div className="bars__h">{titulo}</div>
      {data.map((row) => (
        <div key={row.label} className="bar">
          <div className="bar__top">
            <span className="lbl">{row.label}</span>
            <span className="pct">
              {row.percent.toLocaleString("es-ES")}%
            </span>
          </div>
          <div className="bar__track">
            <div className="bar__fill" style={{ width: `${(row.percent / max) * 100}%` }} />
          </div>
        </div>
      ))}
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
          stroke="var(--surface-2)"
          strokeWidth="14"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="14"
          strokeDasharray={`${followersArc} ${circumference}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div
          className="display"
          style={{ fontSize: "1.6rem", lineHeight: 1 }}
        >
          {centerValue}
        </div>
        <div
          className="mono"
          style={{ marginTop: 4, padding: "0 12px", fontSize: "0.56rem" }}
        >
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
    <div className="shead">
      <div className="flex items-center gap-3">
        <span className="mcard__icon">
          <Logo className="h-5 w-5" />
        </span>
        <h2>{name}</h2>
      </div>
      {period && <span className="sh-note">{period}</span>}
    </div>
  );
}

export default async function MediaKitPage() {
  const stats = await getSocialStats();
  const platforms = PLATFORM_META.map((p) => ({
    ...p,
    metric: stats[p.key],
  }));
  const ytStatsLive: Metric[] = [
    { key: "subscribers", label: "Suscriptores fieles", value: stats.yt_subscribers },
    { key: "views", label: "Visualizaciones / mes", value: stats.yt_views_monthly },
    ytStats[2],
  ];

  return (
    <main className="page">
      <section className="phero">
        <div className="wrap">
          <p className="eyebrow">Media Kit</p>
          <h1 className="phero__title">
            @SoyReinaldoR<span className="dot">.</span>
          </h1>
          <p className="phero__lede">
            Toda la información sobre mis perfiles, métricas y opciones de
            colaboración. Si crees que hay encaje con tu marca, hablemos.
          </p>
          <p className="mk-contacto">
            <a href={`mailto:${CORREO}`}>{CORREO}</a>
            <span>Instagram y audiencia: {PERIODO_IG}</span>
          </p>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          {/* Audiencia total */}
          <div className="brandband">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="brandband__label">Audiencia total</p>
                <div
                  className="flex items-baseline gap-3"
                  style={{ marginTop: 10 }}
                >
                  <span className="bignum">{stats.total_followers}</span>
                  <span style={{ color: "var(--text-dim)" }}>seguidores</span>
                </div>
                <p
                  className="phero__lede"
                  style={{
                    marginTop: 14,
                    fontSize: "0.95rem",
                    maxWidth: "42ch",
                  }}
                >
                  Sumando Instagram, Facebook, TikTok, YouTube y Threads. La
                  comunidad culé que escucha cada vez que abro un directo.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {platforms.map((p) => (
                  <div
                    key={p.name}
                    className="mono flex items-center gap-2"
                    style={{
                      padding: "8px 12px",
                      borderRadius: "var(--radius)",
                      border: "1px solid var(--line)",
                      background: "var(--surface-2)",
                      color: "var(--text)",
                    }}
                  >
                    <p.Logo className="h-4 w-4" />
                    <span>{p.metric}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Presencia en redes */}
          <div className="shead" style={{ marginTop: 56 }}>
            <h2>Presencia en redes</h2>
          </div>
          <div className="grid3">
            {platforms.map((p) => (
              <div key={p.name} className="mcard">
                <div className="mcard__top">
                  <span className="mcard__icon">
                    <p.Logo className="h-5 w-5" />
                  </span>
                  <span className="mono" style={{ color: "var(--text-dim)" }}>
                    {p.name}
                  </span>
                </div>
                <div
                  className="mcard__v"
                  style={{
                    marginTop: 16,
                    fontSize: "2.6rem",
                    color: "var(--accent)",
                  }}
                >
                  {p.metric}
                </div>
                <div style={{ marginTop: 4 }}>{p.label}</div>
                <div
                  className="mono"
                  style={{ marginTop: 4, color: "var(--text-dim)" }}
                >
                  {p.handle}
                </div>
              </div>
            ))}
          </div>

          {/* Audiencia */}
          <div style={{ marginTop: 64 }}>
            <PlatformHeader
              Logo={InstagramLogo}
              name="Mi audiencia"
              period={PERIODO_IG}
            />
            <div className="grid2">
              <DistributionBars data={paises} titulo="Top países" />
              <DistributionBars data={edades} titulo="Edad" />
              <DistributionBars data={genero} titulo="Género" />
              <DistributionBars data={idiomas} titulo="Idiomas" />
            </div>
            <div className="mcard" style={{ marginTop: 16 }}>
              <div className="bars__h">Cuándo están más activos</div>
              <p style={{ marginTop: 10 }}>
                Domingos de 18 a 21 h y lunes de 18 a 00 h (hora de España).
                El 58% tiene entre 25 y 44 años: público adulto, con poder de
                compra, repartido entre España, Latinoamérica y EE. UU.
              </p>
            </div>
          </div>

          {/* Instagram */}
          <div style={{ marginTop: 64 }}>
            <PlatformHeader
              Logo={InstagramLogo}
              name="Estadísticas Instagram"
              period={PERIODO_IG}
            />
            <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
              <div className="grid2">
                {igStats.map((s) => (
                  <MetricCard key={s.label} metric={s} />
                ))}
              </div>
              <div className="mcard flex flex-col items-center">
                <DonutChart
                  followersPercent={87.6}
                  centerValue="87,6%"
                  centerLabel="de las vistas, de gente que aún no me sigue"
                />
                <div
                  className="w-full"
                  style={{ marginTop: 14, fontSize: "0.82rem" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "var(--accent)",
                        }}
                      />
                      No seguidores
                    </span>
                    <span className="mono" style={{ color: "var(--text-dim)" }}>
                      87,6%
                    </span>
                  </div>
                  <div
                    className="flex items-center justify-between"
                    style={{ marginTop: 6 }}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "var(--surface-2)",
                        }}
                      />
                      Seguidores
                    </span>
                    <span className="mono" style={{ color: "var(--text-dim)" }}>
                      12,4%
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <DistributionBars data={igDistribution} />
            </div>
            <p className="hint" style={{ marginTop: 12 }}>
              Panel profesional de Meta. Las reproducciones de los reels
              incluyen las que tienen en Facebook.
            </p>
          </div>

          {/* Facebook */}
          <div style={{ marginTop: 64 }}>
            <PlatformHeader
              Logo={FacebookLogo}
              name="Estadísticas Facebook"
              period="30 días · mayo 2026"
            />
            <div className="grid3">
              {fbStats.map((s) => (
                <MetricCard key={s.label} metric={s} />
              ))}
            </div>
            <div style={{ marginTop: 16 }}>
              <DistributionBars data={fbDistribution} />
            </div>
          </div>

          {/* TikTok */}
          <div style={{ marginTop: 64 }}>
            <PlatformHeader
              Logo={TikTokLogo}
              name="Estadísticas TikTok"
              period="30 días · abril 2026"
            />
            <div className="grid3">
              {tiktokStats.map((s) => (
                <MetricCard key={s.label} metric={s} />
              ))}
            </div>
          </div>

          {/* YouTube */}
          <div style={{ marginTop: 64 }}>
            <PlatformHeader
              Logo={YouTubeLogo}
              name="Estadísticas YouTube"
              period="recurrente / mes"
            />
            <div className="grid3">
              {ytStatsLive.map((s) => (
                <MetricCard key={s.label} metric={s} />
              ))}
            </div>
          </div>

          {/* Threads */}
          <div style={{ marginTop: 64 }}>
            <PlatformHeader
              Logo={ThreadsLogo}
              name="Estadísticas Threads"
              period="30 días · abril 2026"
            />
            <div className="grid3">
              {threadsStats.map((s) => (
                <MetricCard key={s.label} metric={s} />
              ))}
            </div>
          </div>

          {/* Marketing */}
          <div className="shead" style={{ marginTop: 64 }}>
            <h2>Estrategias de marketing</h2>
          </div>
          <div className="grid2">
            {marketing.map((m) => (
              <div key={m.title} className="infocard">
                <h3>{m.title}</h3>
                <p>{m.desc}</p>
              </div>
            ))}
          </div>

          {/* Colaboraciones */}
          <div className="shead" style={{ marginTop: 56 }}>
            <h2>Opciones de colaboración</h2>
          </div>
          <div className="grid2">
            {colaboraciones.map((c) => (
              <div key={c.title} className="infocard">
                <h3>{c.title}</h3>
                <p>{c.desc}</p>
              </div>
            ))}
          </div>

          {/* Tarifas */}
          <div className="shead" style={{ marginTop: 56 }}>
            <h2>Tarifas</h2>
          </div>
          <div className="grid3">
            {precios.map((p) => (
              <div key={p.title} className="infocard">
                <span className="infocard__tag">{p.title}</span>
                <div
                  className="bignum"
                  style={{ fontSize: "2.8rem", margin: "12px 0 0" }}
                >
                  {p.price}
                </div>
                <p>{p.extra}</p>
              </div>
            ))}
          </div>
          <p className="hint" style={{ marginTop: 16 }}>
            Tarifas orientativas. Para campañas a medida, escríbeme.
          </p>

          {/* CTA */}
          <div className="brandband" style={{ marginTop: 56 }}>
            <h2 className="display" style={{ fontSize: "2.4rem" }}>
              ¿Hablamos?
            </h2>
            <p
              className="phero__lede"
              style={{ marginTop: 14, fontSize: "0.98rem" }}
            >
              Gracias por considerarme como aliado para potenciar tu marca en el
              mundo del fútbol. Si crees que hay encaje, ponte en contacto y
              vemos qué podemos hacer juntos.
            </p>
            <div className="flex flex-wrap gap-3" style={{ marginTop: 22 }}>
              <a href={`mailto:${CORREO}`} className="btn btn--accent">
                {CORREO}
              </a>
              <Link href="/contacto" className="btn btn--ghost">
                Formulario de contacto <span className="arr">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
