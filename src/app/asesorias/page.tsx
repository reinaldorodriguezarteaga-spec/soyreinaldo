import AsesoriaCheckoutButton from "@/components/AsesoriaCheckoutButton";
import Link from "next/link";
import { isAppRequest } from "@/lib/is-app";

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

export default async function AsesoriasPage() {
  const inApp = await isAppRequest();
  return (
    <main className="page">
      <section className="phero">
        <div className="wrap">
          <p className="eyebrow">Asesoría 1:1</p>
          <h1 className="phero__title">
            Aprende a impulsar{" "}
            <span style={{ color: "var(--accent)" }}>tus redes</span> conmigo
            <span className="dot">.</span>
          </h1>
          <p className="phero__lede">
            Una llamada de 2-3 horas en la que te paso todo lo que sé: análisis
            de tus videos, trucos de edición en CapCut, qué publica la gente que
            crece y cómo aplicarlo a tu cuenta.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="wrap" style={{ maxWidth: 880 }}>
          <div className="brandband">
            <p className="brandband__label">Precio</p>
            <div
              className="flex items-baseline gap-3"
              style={{ marginTop: 10 }}
            >
              <span className="bignum bignum--mono">75€</span>
              <span style={{ color: "var(--text-dim)" }}>por sesión</span>
            </div>
            <p
              className="phero__lede"
              style={{ marginTop: 16, fontSize: "0.95rem", maxWidth: "44ch" }}
            >
              Pago único. Tras el pago eliges fecha y hora en mi calendario,
              según mis huecos disponibles.
            </p>
            {!inApp && (
              <div style={{ marginTop: 22 }}>
                <AsesoriaCheckoutButton />
              </div>
            )}
          </div>

          <div className="shead" style={{ marginTop: 56 }}>
            <h2>Qué incluye</h2>
            <span className="sh-note">
              Sesión 100% personalizada — no hay dos asesorías iguales.
            </span>
          </div>
          <div className="grid2">
            {incluye.map((b) => (
              <div key={b.title} className="infocard">
                <h3>{b.title}</h3>
                <p>{b.desc}</p>
              </div>
            ))}
          </div>

          <div className="shead" style={{ marginTop: 56 }}>
            <h2>Preguntas frecuentes</h2>
          </div>
          <div className="faqs">
            {faqs.map((f) => (
              <details key={f.q} className="faq">
                <summary>
                  {f.q}
                  <span className="chev">▾</span>
                </summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>

          <p
            className="phero__lede"
            style={{ marginTop: 40, fontSize: "0.88rem" }}
          >
            ¿Dudas antes de reservar?{" "}
            <Link href="/contacto" style={{ color: "var(--accent)" }}>
              Escríbeme →
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
