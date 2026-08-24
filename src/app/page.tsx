import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import DonationBlock from "@/components/DonationBlock";
import HomeScoreboard from "@/components/HomeScoreboard";
import HomeAnalysisCard from "@/components/HomeAnalysisCard";
import NewsCard from "@/components/NewsCard";
import TransfersCard from "@/components/TransfersCard";
import RailStandings from "@/components/RailStandings";
import { InstagramLogo, WhatsAppLogo } from "@/components/social-logos";
import { getSocialStats } from "@/lib/social-stats";
import { isAppRequest } from "@/lib/is-app";
import { getCompetitionStandings, type StandingRow } from "@/lib/sports/api-football";
import { COMPETITIONS } from "@/lib/sports/competitions";
import { getBaremoPublico } from "@/lib/quiniela-liga/baremo";

/** La portada es la URL que más señales recibe (ápice, http, enlaces de
 * redes): sin canónica propia, Google las trataba como versiones sueltas. */
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const MARQUEE = [
  "Culé",
  "LaLiga",
  "Champions",
  "Premier League",
  "Serie A",
  "Europa League",
  "Comunidad",
  "Debate",
];

/** Las dos tablas de la portada (rails del feed de 3 columnas): LaLiga a la
 * izquierda, Premier a la derecha — pedido del dueño. El resto de tablas
 * viven en su /liga/[slug]. */
const HOME_ALWAYS_SHOW = ["laliga", "premier"];

async function getStandingsSnapshot() {
  const competitions = COMPETITIONS.filter((c) =>
    HOME_ALWAYS_SHOW.includes(c.slug),
  );
  return Promise.all(
    competitions.map(async (competition) => {
      try {
        const rows = (await getCompetitionStandings(competition)) as StandingRow[] | null;
        return { competition, standings: rows ?? [] };
      } catch {
        return { competition, standings: [] as StandingRow[] };
      }
    }),
  );
}

export default async function Home() {
  const baremo = await getBaremoPublico();
  const [stats, inApp, standingsSnapshot] = await Promise.all([
    getSocialStats(),
    isAppRequest(),
    getStandingsSnapshot(),
  ]);

  // Rails del layout de 3 columnas: LaLiga a la izquierda, Premier a la
  // derecha (pedido explícito). El resto de tablas viven en su /liga/[slug].
  const laligaSnapshot =
    standingsSnapshot.find(
      (s) => s.competition.slug === "laliga" && s.standings.length > 0,
    ) ?? null;
  const premierSnapshot =
    standingsSnapshot.find(
      (s) => s.competition.slug === "premier" && s.standings.length > 0,
    ) ?? null;

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
            <p className="eyebrow hero__eyebrow">
              LaLiga, Champions, Premier y más — en directo
            </p>
            <h1 className="hero__title">
              El fútbol,
              <br />
              en vivo<span className="dot">.</span>
            </h1>
            <p className="hero__lede">
              Marcadores minuto a minuto, estadísticas y clasificación de las
              grandes ligas y competiciones europeas — contado desde la pasión
              de <strong style={{ color: "var(--text)" }}>@SoyReinaldoR</strong>.
            </p>
            <div className="hero__actions">
              <Link href="/liga/laliga" className="btn btn--accent">
                Ver LaLiga <span className="arr">→</span>
              </Link>
              <Link href="/liga/champions" className="btn btn--ghost">
                Ver Champions <span className="arr">→</span>
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

      {/* FEED PRINCIPAL — 3 columnas en escritorio (estilo FotMob, pedido
          18-ago: "a los lados se pierde mucho espacio"): LaLiga + Fichajes a
          la izquierda, marcador/calendario al centro, Premier + Noticias a
          la derecha. En móvil se apila: feed primero, rails después. */}
      <section className="section" style={{ paddingTop: 44, paddingBottom: 10 }}>
        <div className="wrap">
          <div className="home3col">
            <aside className="home3col__side home3col__left">
              {laligaSnapshot && (
                <div>
                  <div className="subhead">
                    <h3>LaLiga</h3>
                    <Link href="/liga/laliga?v=tabla">Tabla completa →</Link>
                  </div>
                  <RailStandings slug="laliga" standings={laligaSnapshot.standings} />
                </div>
              )}
              <Suspense fallback={null}>
                <TransfersCard />
              </Suspense>
            </aside>

            <div className="home3col__main" style={{ display: "grid", gap: 20 }}>
              <HomeScoreboard />
              {/* Últimos análisis publicados — debajo del calendario y FUERA
                  de su caja de scroll (.hmcal-scroll), para que no quede
                  atrapado dentro. Si no hay nada publicado, no pinta nada. */}
              <Suspense fallback={null}>
                <HomeAnalysisCard />
              </Suspense>
            </div>

            <aside className="home3col__side home3col__right">
              {premierSnapshot && (
                <div>
                  <div className="subhead">
                    <h3>Premier League</h3>
                    <Link href="/liga/premier?v=tabla">Tabla completa →</Link>
                  </div>
                  <RailStandings slug="premier" standings={premierSnapshot.standings} />
                </div>
              )}
              <Suspense fallback={null}>
                <NewsCard />
              </Suspense>
            </aside>
          </div>
        </div>
      </section>

      {/* QUINIELA — promo del juego gratuito (la joya nueva). */}
      <section className="section" style={{ paddingTop: 24, paddingBottom: 8 }}>
        <div className="wrap">
          <Link href="/quiniela-liga" className="panel promopanel">
            <p className="eyebrow">🏆 Nuevo · Gratis</p>
            <h2
              className="feat__title"
              style={{ fontSize: "clamp(1.7rem, 3.4vw, 2.6rem)", marginTop: 4 }}
            >
              La Quiniela de LaLiga.
            </h2>
            <p
              style={{
                color: "var(--text-dim)",
                maxWidth: 560,
                marginTop: 10,
                lineHeight: 1.5,
              }}
            >
              Pronostica cada jornada, marcador exacto{" "}
              <b style={{ color: "var(--text)" }}>{baremo.exacto} pts</b>, y
              compite en la clasificación pública. Sin código: entras de un
              toque y a jugar.
            </p>
            <span className="btn btn--accent" style={{ marginTop: 18 }}>
              Jugar gratis <span className="arr">→</span>
            </span>
          </Link>
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

      {/* Las tablas viven ahora en los rails del feed de 3 columnas de
          arriba (LaLiga izquierda, Premier derecha) — la antigua sección
          "La tabla, en corto" se retiró para no duplicarlas. */}

      {/* FEATURES */}
      <section className="section">
        <div className="wrap">
          <div className="feat__head">
            <div>
              <p className="eyebrow">Explora</p>
              <h2 className="feat__title">Qué hacemos.</h2>
            </div>
          </div>
          <div className="cards cards--2">
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
            {!inApp && <DonationBlock />}
          </div>
        </div>
      </section>
    </main>
  );
}
