import Link from "next/link";
import AsesoriaCheckoutButton from "@/components/AsesoriaCheckoutButton";

export const metadata = {
  title: "Asesoría 1:1 con Reinaldo | Soy Reinaldo",
  description:
    "Sesión 1:1 de 2-3 horas para impulsar tus redes sociales: análisis de tus videos, edición en CapCut, trucos y recomendaciones personalizadas. 75€.",
};

const incluye = [
  {
    title: "Análisis de tus videos",
    desc: "Reviso lo que tienes publicado y te digo qué funciona, qué arreglar y qué probar nuevo.",
  },
  {
    title: "Cómo impulsar tus redes",
    desc: "Mis trucos reales para crecer en Instagram, TikTok y YouTube. Lo que funciona hoy, no hace 5 años.",
  },
  {
    title: "Edición en CapCut",
    desc: "Te muestro mi flujo: cortes, transiciones, ritmo, hooks. Lo que hace que un video funcione.",
  },
  {
    title: "Tips y recomendaciones",
    desc: "Salidas concretas para tu contenido, según el nicho que trabajes y tu estilo.",
  },
];

const faqs = [
  {
    q: "¿Cuánto dura?",
    a: "Entre 2 y 3 horas. Si necesitamos un poco más, sin problema — el objetivo es que salgas con un plan claro.",
  },
  {
    q: "¿Cómo es la sesión?",
    a: "Por videollamada (Google Meet o Zoom, lo que prefieras). Pantalla compartida en ambos lados.",
  },
  {
    q: "¿Qué tengo que llevar preparado?",
    a: "Acceso a tus redes, lista de tus mejores y peores videos, y dudas concretas que tengas. Lo demás lo hablamos.",
  },
  {
    q: "¿Puedo cambiar la fecha?",
    a: "Sí — cambia la cita desde el email de confirmación de Cal.com hasta 24h antes. Después tendría que pagarse de nuevo.",
  },
  {
    q: "¿Hay reembolso?",
    a: "Si por motivo mío no podemos hacerla, te devuelvo el 100%. Si es por motivo tuyo y avisas con +24h, lo movemos a otra fecha. Sin reembolso si no avisas.",
  },
];

export default function AsesoriasPage() {
  return (
    <main className="flex flex-1 flex-col px-6 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-3xl">
        <Link
          href="/"
          className="text-sm text-zinc-500 transition hover:text-white"
        >
          ← Volver
        </Link>

        <header className="mt-8 mb-12">
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">
            Asesoría 1:1
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Aprende a impulsar{" "}
            <span className="text-indigo-300">tus redes</span> conmigo.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-zinc-400">
            Una llamada de 2-3 horas en la que te paso todo lo que sé:
            análisis de tus videos, trucos de edición en CapCut, qué publica
            la gente que crece y cómo aplicarlo a tu cuenta.
          </p>
        </header>

        <section className="mb-10 overflow-hidden rounded-3xl border border-indigo-400/30 bg-gradient-to-br from-[#a50044]/30 via-zinc-950 to-[#154284]/30 p-8 sm:p-10">
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">
            Precio
          </p>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="font-mono text-5xl font-bold tracking-tight text-white sm:text-6xl">
              75€
            </span>
            <span className="text-sm text-zinc-400">por sesión</span>
          </div>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-zinc-300">
            Pago único. Tras el pago eliges fecha y hora en mi calendario,
            según mis huecos disponibles.
          </p>
          <div className="mt-6">
            <AsesoriaCheckoutButton />
          </div>
        </section>

        <section className="mb-10">
          <h2 className="mb-1 text-base font-semibold">Qué incluye</h2>
          <p className="mb-5 text-xs text-zinc-500">
            Sesión 100% personalizada — no hay dos asesorías iguales.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {incluye.map((b) => (
              <div
                key={b.title}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
              >
                <h3 className="text-sm font-semibold">{b.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  {b.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="mb-5 text-base font-semibold">Preguntas frecuentes</h2>
          <div className="space-y-3">
            {faqs.map((f) => (
              <details
                key={f.q}
                className="group rounded-2xl border border-zinc-800 bg-zinc-950 px-5 py-4 [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex cursor-pointer items-center justify-between text-sm font-medium">
                  {f.q}
                  <span className="text-zinc-500 transition group-open:rotate-180">
                    ▾
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        <p className="text-xs text-zinc-500">
          ¿Dudas antes de reservar?{" "}
          <Link
            href="/contacto"
            className="text-indigo-300 hover:text-indigo-200"
          >
            Escríbeme →
          </Link>
        </p>
      </div>
    </main>
  );
}
