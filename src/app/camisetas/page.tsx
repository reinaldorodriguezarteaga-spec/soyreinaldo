import Link from "next/link";

export const metadata = {
  title: "Camisetas oficiales con descuento | Soy Reinaldo",
  description:
    "Camisetas de fútbol oficiales con descuento usando el código REY15. Selección de mi tienda partner.",
};

const AFFILIATE_URL =
  "https://www.camisetasfutbol.vip/?utm_source=CF-Reinaldo&utm_medium=CF-Reinaldo&utm_campaign=CF-Reinaldo&utm_term=CF-Reinaldo&utm_content=CF-Reinaldo";

const beneficios = [
  {
    title: "Réplicas oficiales",
    desc: "Camisetas y equipaciones de los principales equipos y selecciones, en réplica oficial.",
  },
  {
    title: "Personalización",
    desc: "Pon tu nombre, tu jugador favorito o el dorsal que quieras antes de enviarlo.",
  },
  {
    title: "Envío internacional",
    desc: "Envío rápido a España y Latinoamérica con seguimiento.",
  },
  {
    title: "Soporte directo",
    desc: "Atención al cliente real, no bots, antes y después de comprar.",
  },
];

export default function CamisetasPage() {
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
            Tienda partner
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Camisetas{" "}
            <span className="text-indigo-300">con descuento</span>.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-zinc-400">
            Mi tienda de confianza para camisetas oficiales del Barça, la
            selección y cualquier equipo grande. Con tu código personal te
            llevas el descuento aplicado al pasar por caja.
          </p>
        </header>

        <section className="mb-10 overflow-hidden rounded-3xl border border-indigo-400/30 bg-gradient-to-br from-[#a50044]/30 via-zinc-950 to-[#154284]/30 p-8 sm:p-10">
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">
            Tu código
          </p>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="font-mono text-5xl font-bold tracking-tight text-white sm:text-6xl">
              REY15
            </span>
          </div>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-zinc-300">
            Aplícalo en el carrito antes de pagar. Funciona sobre cualquier
            camiseta de la tienda.
          </p>
          <a
            href={AFFILIATE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-300 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-indigo-200"
          >
            Ir a la tienda
            <span>→</span>
          </a>
        </section>

        <section className="mb-10">
          <h2 className="text-xs font-medium uppercase tracking-[0.25em] text-zinc-500">
            Por qué la recomiendo
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {beneficios.map((b) => (
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

        <p className="text-xs text-zinc-500">
          Si compras a través de mi link soy parte del programa de afiliados de
          la tienda — me apoyas sin coste extra para ti.
        </p>
      </div>
    </main>
  );
}
