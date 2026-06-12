import Image from "next/image";
import Link from "next/link";
import DonationBlock from "@/components/DonationBlock";
import MatchWidget from "@/components/MatchWidget";
import { InstagramLogo, WhatsAppLogo } from "@/components/social-logos";
import { getSocialStats } from "@/lib/social-stats";

const MARQUEE = [
  "Culé",
  "Fútbol",
  "Comunidad",
  "Quiniela",
  "Mundial 2026",
  "Debate",
];

export default async function Home() {
  const stats = await getSocialStats();

  return (
    <main className="page">
      {/* HERO */}
      <section className="hero">
        <div className="hero__bgphoto">
          <Image
            src="/branding/retrato.png"
            alt="Reinaldo con la camiseta del FC Barcelona"
            width={1509}
            height={2000}
            priority
          />
        </div>
        <div className="hero__scrim" />
        <div className="hero__badge">@SoyReinaldoR</div>

        <div className="wrap">
          <div className="hero__content">
            <p className="eyebrow hero__eyebrow">Fútbol con Reinaldo</p>
            <h1 className="hero__title">
              Soy
              <br />
              Reinaldo<span className="dot">.</span>
            </h1>
            <p className="hero__lede">
              Cuento el fútbol desde la pasión culé. Quinielas, debate y
              comunidad con +{stats.total_followers.replace(/^\+/, "")}{" "}
              siguiéndome entre todas mis redes.
            </p>
            <div className="hero__actions">
              <Link href="/quiniela" className="btn btn--accent">
                Entrar a la Quiniela <span className="arr">→</span>
              </Link>
              <Link href="/redes" className="btn btn--ghost">
                Ver mis redes <span className="arr">→</span>
              </Link>
            </div>

            <div className="stats">
              <div className="stat">
                <div className="stat__num">{stats.total_followers}</div>
                <div className="stat__lbl">Seguidores</div>
              </div>
              <div className="stat">
                <div className="stat__num">
                  {stats.ig_views_monthly.replace(/^\+/, "")}
                </div>
                <div className="stat__lbl">Visualizaciones/mes</div>
              </div>
              <div className="stat">
                <div className="stat__num">
                  5<span>+</span>
                </div>
                <div className="stat__lbl">Plataformas</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <div className="marquee" aria-hidden>
        <div className="marquee__track">
          {[...MARQUEE, ...MARQUEE].map((w, i) => (
            <span key={i}>{w}</span>
          ))}
        </div>
      </div>

      {/* MARCADOR EN VIVO (solo cuando hay partidos que enseñar) */}
      <MatchWidget />

      {/* FEATURES */}
      <section className="section" id="quiniela">
        <div className="wrap">
          <div className="feat__head">
            <div>
              <p className="eyebrow">Explora</p>
              <h2 className="feat__title">Qué hacemos.</h2>
            </div>
          </div>
          <div className="cards">
            <Link href="/quiniela" className="card card--accent">
              <div>
                <p className="card__tag">Mundial 2026</p>
                <h3 className="card__h">Quiniela</h3>
                <p className="card__p">
                  Pronostica los partidos del Mundial con la comunidad culé y
                  compite por el primer puesto.
                </p>
              </div>
              <span className="card__go">
                Entrar <span className="arr">→</span>
              </span>
              <span className="card__big">26</span>
            </Link>

            <Link href="/redes" className="card">
              <div>
                <p className="card__tag">@SoyReinaldoR</p>
                <h3 className="card__h">Redes</h3>
                <p className="card__p">
                  YouTube, Instagram, TikTok, Facebook y Threads. Todo mi
                  contenido en un sitio.
                </p>
              </div>
              <span className="card__go">
                Sígueme <span className="arr">→</span>
              </span>
            </Link>

            <Link href="/camisetas" className="card">
              <div>
                <p className="card__tag">Tienda partner</p>
                <h3 className="card__h">Camisetas</h3>
                <p className="card__p">
                  Camisetas de fútbol con tu código{" "}
                  <strong style={{ color: "var(--accent)" }}>REY15</strong> de
                  descuento.
                </p>
              </div>
              <span className="card__go">
                Ver tienda <span className="arr">→</span>
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* COMUNIDAD */}
      <section className="comu">
        <div className="wrap section">
          <div className="feat__head">
            <div>
              <p className="eyebrow">Únete</p>
              <h2 className="feat__title">Los conos.</h2>
            </div>
          </div>
          <div className="comu__grid">
            <div className="join">
              <div className="join__top">
                <span className="join__icon">
                  <WhatsAppLogo className="h-6 w-6" />
                </span>
                <span className="join__count">Grupo · WhatsApp</span>
              </div>
              <div>
                <h3 className="join__h">Los conos de WhatsApp</h3>
                <p className="join__p">
                  Charla diaria sobre fútbol con el resto de culés. Avisos de
                  directos y debate en tiempo real.
                </p>
              </div>
              <a
                href="https://chat.whatsapp.com/Hgw7vhK85i13E8aLxGTlIQ?mode=gi_t"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn--accent"
              >
                Unirme <span className="arr">→</span>
              </a>
            </div>

            <div className="join">
              <div className="join__top">
                <span className="join__icon">
                  <InstagramLogo className="h-6 w-6" />
                </span>
                <span className="join__count">+3.200 conos</span>
              </div>
              <div>
                <h3 className="join__h">Canal de Instagram</h3>
                <p className="join__p">
                  Avisos exclusivos, encuestas y contenido directo en tu
                  Instagram. Sin saturar el feed.
                </p>
              </div>
              <a
                href="https://www.instagram.com/channel/AbbBGATt0sCKBXEn/"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn--accent"
              >
                Unirme <span className="arr">→</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* DONACIÓN */}
      <section className="section" id="cafe">
        <div className="wrap">
          <div className="dona__grid">
            <div>
              <p className="eyebrow">Apoya el proyecto</p>
              <h2 className="dona__title">
                Invítame a<br />un café<span className="dot" style={{ color: "var(--accent)" }}>.</span>
              </h2>
              <p className="dona__p">
                Tu donación ayuda a mantener viva la web, las quinielas y el
                contenido. Sin obligaciones — lo que tú quieras.
              </p>
            </div>
            <DonationBlock />
          </div>
        </div>
      </section>
    </main>
  );
}
