import Image from "next/image";
import Link from "next/link";
import DonationBlock from "@/components/DonationBlock";
import HomeMatchWidget from "@/components/HomeMatchWidget";
import { InstagramLogo, WhatsAppLogo } from "@/components/social-logos";
import { getSocialStats } from "@/lib/social-stats";
import { isAppRequest } from "@/lib/is-app";
import { getCompetitionStandings, type StandingRow } from "@/lib/sports/api-football";
import { COMPETITIONS } from "@/lib/sports/competitions";
import { StandingsTableView } from "@/components/competition/tab-views";

const MARQUEE = [
  "Culé",
  "Fútbol",
  "Comunidad",
  "LaLiga",
  "Champions League",
  "Debate",
];

async function getStandingsSnapshot() {
  const competitions = COMPETITIONS.filter((c) => c.standingsMode === "table");
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
  const [stats, inApp, standingsSnapshot] = await Promise.all([
    getSocialStats(),
    isAppRequest(),
    getStandingsSnapshot(),
  ]);

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
            <p className="eyebrow hero__eyebrow">LaLiga · Champions League — en directo</p>
            <h1 className="hero__title">
              El fútbol,
              <br />
              en vivo<span className="dot">.</span>
            </h1>
            <p className="hero__lede">
              Marcadores minuto a minuto, estadísticas y clasificación de
              LaLiga y la Champions League — contado desde la pasión de{" "}
              <strong style={{ color: "var(--text)" }}>@SoyReinaldoR</strong>.
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

      {/* MARCADOR EN VIVO (protagonista: justo bajo el hero, solo cuando hay
          partidos que enseñar) */}
      <HomeMatchWidget />

      {/* MARQUEE */}
      <div className="marquee" aria-hidden>
        <div className="marquee__track">
          {[...MARQUEE, ...MARQUEE].map((w, i) => (
            <span key={i}>{w}</span>
          ))}
        </div>
      </div>

      {/* TABLA — resumen de las 2 competiciones */}
      {standingsSnapshot.some((s) => s.standings.length > 0) && (
        <section className="section">
          <div className="wrap">
            <div className="shead">
              <div>
                <p className="eyebrow">Clasificación</p>
                <h2 className="feat__title">La tabla, en corto.</h2>
              </div>
            </div>
            <div className="grid2" style={{ alignItems: "start" }}>
              {standingsSnapshot.map(({ competition, standings }) =>
                standings.length > 0 ? (
                  <div key={competition.slug}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 12,
                      }}
                    >
                      <h3
                        style={{
                          margin: 0,
                          fontFamily: "var(--font-display-stack)",
                          fontWeight: 800,
                          fontSize: "1.1rem",
                        }}
                      >
                        {competition.name}
                      </h3>
                      <Link
                        href={`/liga/${competition.slug}?v=tabla`}
                        className="match__when"
                        style={{ color: "var(--accent)", textDecoration: "none" }}
                      >
                        Ver tabla completa →
                      </Link>
                    </div>
                    <StandingsTableView
                      competition={{ ...competition, koStructure: undefined }}
                      standings={standings.slice(0, 5)}
                    />
                  </div>
                ) : null,
              )}
            </div>
          </div>
        </section>
      )}

      {/* FEATURES */}
      <section className="section">
        <div className="wrap">
          <div className="feat__head">
            <div>
              <p className="eyebrow">Explora</p>
              <h2 className="feat__title">Qué hacemos.</h2>
            </div>
          </div>
          <div className="cards" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
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
