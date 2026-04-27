import Link from "next/link";

export const metadata = {
  title: "Media Kit | Soy Reinaldo",
  description:
    "Media Kit oficial de @SoyReinaldoR. Audiencia, métricas, formatos publicitarios y tarifas para colaboraciones con marcas en el mundo del fútbol.",
};

const platforms = [
  {
    name: "Instagram",
    handle: "@SoyReinaldoR",
    metric: "54K",
    label: "Seguidores",
  },
  {
    name: "TikTok",
    handle: "@SoyReinaldoR",
    metric: "32K",
    label: "Seguidores activos",
  },
  {
    name: "YouTube",
    handle: "Fútbol con Reinaldo",
    metric: "9K",
    label: "Suscriptores fieles",
  },
];

const igStats = [
  { label: "Interacciones totales", value: "957.600" },
  { label: "Cuentas que interactuaron", value: "300.936" },
  { label: "Visualizaciones", value: "7,69M" },
  { label: "Me gusta", value: "415.848" },
  { label: "Comentarios", value: "11.875" },
  { label: "Veces compartido", value: "190.339" },
  { label: "Veces guardado", value: "23.809" },
  { label: "Reposts", value: "15.293" },
];

const tiktokStats = [
  { label: "Espectadores totales", value: "4,4M" },
  { label: "Espectadores nuevos", value: "2,7M" },
  { label: "Visualizaciones de vídeo", value: "7M" },
  { label: "Me gusta", value: "513K" },
  { label: "Veces compartido", value: "114K" },
  { label: "Comentarios", value: "7,3K" },
];

const ytStats = [
  { label: "Suscriptores fieles", value: "+8.000" },
  { label: "Visualizaciones / mes", value: "+1,2M" },
  { label: "Tiempo visto / mes", value: "6.500h" },
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
  {
    title: "Historia",
    price: "100$",
    extra: "Pack 3 historias: 220$",
  },
  {
    title: "Reel",
    price: "200$",
    extra: "Vídeo dedicado en Instagram",
  },
  {
    title: "Mensual",
    price: "800$",
    extra:
      "Tu marca etiquetada en todos mis vídeos del mes (sin mención obligatoria)",
  },
];

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="text-2xl font-semibold tracking-tight sm:text-3xl">
        {value}
      </div>
      <div className="mt-1 text-xs text-zinc-400">{label}</div>
    </div>
  );
}

export default function MediaKitPage() {
  return (
    <main className="flex flex-1 flex-col px-6 py-16">
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-16">
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">
            Media Kit
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">
            <span className="text-indigo-300">@SoyReinaldoR</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">
            Toda la información sobre mis perfiles, métricas y opciones de
            colaboración. Si crees que hay encaje con tu marca, hablemos.
          </p>
        </header>

        <section className="mb-16">
          <h2 className="text-xs font-medium uppercase tracking-[0.25em] text-zinc-500">
            Presencia en redes
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {platforms.map((p) => (
              <div
                key={p.name}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
              >
                <div className="text-5xl font-semibold tracking-tight text-indigo-300">
                  {p.metric}
                </div>
                <div className="mt-3 text-sm font-medium">{p.name}</div>
                <div className="mt-1 text-xs text-zinc-500">{p.handle}</div>
                <div className="mt-3 text-xs text-zinc-400">{p.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <div className="mb-5 flex items-baseline justify-between">
            <h2 className="text-xs font-medium uppercase tracking-[0.25em] text-zinc-500">
              Estadísticas Instagram
            </h2>
            <span className="text-xs text-zinc-600">últimos 30 días</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {igStats.map((s) => (
              <Stat key={s.label} value={s.value} label={s.label} />
            ))}
          </div>
          <p className="mt-5 text-sm text-zinc-400">
            Distribución de contenido: Reels 71,9% · Publicaciones 22,0% ·
            Historias 6,1%
          </p>
        </section>

        <section className="mb-16">
          <div className="mb-5 flex items-baseline justify-between">
            <h2 className="text-xs font-medium uppercase tracking-[0.25em] text-zinc-500">
              Estadísticas TikTok
            </h2>
            <span className="text-xs text-zinc-600">últimos 30 días</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tiktokStats.map((s) => (
              <Stat key={s.label} value={s.value} label={s.label} />
            ))}
          </div>
        </section>

        <section className="mb-16">
          <div className="mb-5 flex items-baseline justify-between">
            <h2 className="text-xs font-medium uppercase tracking-[0.25em] text-zinc-500">
              Estadísticas YouTube
            </h2>
            <span className="text-xs text-zinc-600">recurrente / mes</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {ytStats.map((s) => (
              <Stat key={s.label} value={s.value} label={s.label} />
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
