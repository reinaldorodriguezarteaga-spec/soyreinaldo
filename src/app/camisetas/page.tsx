import Image from "next/image";

export const metadata = {
  title: "Camisetas con descuento | Soy Reinaldo",
  description:
    "Camisetas de fútbol con descuento usando el código REY15. Selección de mi tienda partner.",
};

const AFFILIATE_URL =
  "https://www.camisetasfutbol.vip/?utm_source=CF-Reinaldo&utm_medium=CF-Reinaldo&utm_campaign=CF-Reinaldo&utm_term=CF-Reinaldo&utm_content=CF-Reinaldo";

const beneficios = [
  {
    title: "Réplicas de calidad",
    desc: "Camisetas y equipaciones de los principales equipos y selecciones, en réplica de buena calidad.",
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
    <main className="page">
      <section className="phero">
        <div className="wrap">
          <p className="eyebrow">Camisetas de Fútbol</p>
          <h1 className="phero__title">
            Camisetas con{" "}
            <span style={{ color: "var(--accent)" }}>descuento</span>
            <span className="dot">.</span>
          </h1>
          <p className="phero__lede">
            Mi tienda de confianza para camisetas del Barça, la selección y
            cualquier equipo grande. Con tu código personal te llevas el
            descuento aplicado al pasar por caja.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="wrap" style={{ maxWidth: 760 }}>
          <div className="brandband">
            <Image
              src="/branding/camisetas-futbol-light.png"
              alt="Camisetas de Fútbol"
              width={240}
              height={120}
              className="mb-6 h-auto w-40 object-contain sm:w-48"
              priority
            />
            <p className="brandband__label">Tu código</p>
            <div style={{ marginTop: 10 }}>
              <span className="bignum bignum--mono">REY15</span>
            </div>
            <p
              className="phero__lede"
              style={{ marginTop: 16, fontSize: "0.95rem", maxWidth: "44ch" }}
            >
              Aplícalo en el carrito antes de pagar. Funciona sobre cualquier
              camiseta de la tienda.
            </p>
            <a
              href={AFFILIATE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--accent"
              style={{ marginTop: 22 }}
            >
              Ir a la tienda <span className="arr">→</span>
            </a>
          </div>

          <div className="shead" style={{ marginTop: 56 }}>
            <h2>Por qué la recomiendo</h2>
          </div>
          <div className="grid2">
            {beneficios.map((b) => (
              <div key={b.title} className="infocard">
                <h3>{b.title}</h3>
                <p>{b.desc}</p>
              </div>
            ))}
          </div>

          <p
            className="phero__lede"
            style={{ marginTop: 40, fontSize: "0.85rem" }}
          >
            Si compras a través de mi link soy parte del programa de afiliados de
            la tienda — me apoyas sin coste extra para ti.
          </p>
        </div>
      </section>
    </main>
  );
}
