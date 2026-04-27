import Link from "next/link";

export const metadata = {
  title: "Bot de Comentarios | Soy Reinaldo",
  description:
    "IA que responde a los comentarios de mi canal de YouTube en mi voz. Construido con Claude (Anthropic) y la API de YouTube.",
};

const features = [
  {
    title: "Clasifica antes de responder",
    desc: "Detecta si el comentario es un ataque personal, un apoyo, una mentira sobre el vídeo, un troleo al Barça o un mensaje neutral. Cada tipo lleva un tono distinto.",
  },
  {
    title: "Mi voz, no genérica",
    desc: "Mensajes cortos por defecto, sarcasmo culé, sin la palabra 'hermano', emojis con cabeza, y análisis técnico cuando el comentario lo merece.",
  },
  {
    title: "Detecta ironía",
    desc: "Antes de responder, evalúa si el comentario habla en serio o en broma. Esto evita morder el anzuelo en comentarios irónicos que parecen ataques.",
  },
  {
    title: "Contexto de fútbol vivo",
    desc: "Tiene un fichero de contexto actualizable con datos de La Liga, Champions, jugadores y figuras mediáticas (Chiringuito, Roncero, etc.) para no quedarse desfasado.",
  },
];

const stack = [
  { label: "Modelo", value: "Claude (Anthropic)" },
  { label: "Lenguaje", value: "Python 3" },
  { label: "API externa", value: "YouTube Data API v3" },
  { label: "Logs", value: "CSV con histórico de respuestas" },
];

export default function BotPage() {
  return (
    <main className="flex flex-1 flex-col px-6 py-16">
      <div className="mx-auto w-full max-w-3xl">
        <Link
          href="/"
          className="text-sm text-zinc-500 transition hover:text-white"
        >
          ← Volver
        </Link>

        <header className="mt-8 mb-14">
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">
            Producto · Side project
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Bot de <span className="text-indigo-300">Comentarios</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">
            Una IA que lee los comentarios de mis vídeos en YouTube y responde
            como respondería yo. Sarcasmo culé, mensajes cortos, y análisis
            técnico cuando toca.
          </p>
        </header>

        <section className="mb-14">
          <h2 className="text-xs font-medium uppercase tracking-[0.25em] text-zinc-500">
            Cómo funciona
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
              >
                <h3 className="text-base font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-14">
          <h2 className="text-xs font-medium uppercase tracking-[0.25em] text-zinc-500">
            Stack
          </h2>
          <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
            {stack.map((s, idx) => (
              <div
                key={s.label}
                className={`flex items-center justify-between px-6 py-4 ${
                  idx > 0 ? "border-t border-zinc-900" : ""
                }`}
              >
                <span className="text-sm text-zinc-400">{s.label}</span>
                <span className="text-sm font-medium">{s.value}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8">
          <h2 className="text-xl font-semibold">
            ¿Por qué este proyecto?
          </h2>
          <p className="mt-4 leading-relaxed text-zinc-400">
            Mi canal recibe cientos de comentarios por vídeo. Responder a todos
            con calidad es imposible — y los que más necesitan respuesta son los
            ataques personales o las mentiras sobre el contenido. El bot se
            encarga del 80% que es repetitivo (defensas tipo, troleos, apoyos)
            para que yo me centre en los comentarios que aportan algo de
            verdad.
          </p>
        </section>
      </div>
    </main>
  );
}
