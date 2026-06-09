import { getSocialStats } from "@/lib/social-stats";
import {
  FacebookLogo,
  InstagramLogo,
  ThreadsLogo,
  TikTokLogo,
  YouTubeLogo,
} from "@/components/social-logos";

export const metadata = {
  title: "Mis redes | Soy Reinaldo",
  description:
    "Todas las redes de @SoyReinaldoR: YouTube, Instagram, TikTok, Facebook y Threads.",
};

/** Separa el sufijo (K/M/+) para pintarlo en color de acento. */
function Foll({ value }: { value: string }) {
  const m = value.match(/^([\d.,\s]+)(.*)$/);
  if (!m) return <>{value}</>;
  return (
    <>
      {m[1].trim()}
      {m[2] && <span>{m[2]}</span>}
    </>
  );
}

export default async function RedesPage() {
  const s = await getSocialStats();

  const platforms = [
    {
      name: "Instagram",
      handle: "@SoyReinaldoR",
      foll: s.ig_followers,
      href: "https://www.instagram.com/soyreinaldor/",
      Logo: InstagramLogo,
    },
    {
      name: "TikTok",
      handle: "@SoyReinaldoR",
      foll: s.tt_followers,
      href: "https://www.tiktok.com/@soyreinaldor",
      Logo: TikTokLogo,
    },
    {
      name: "Facebook",
      handle: "Fútbol con Reinaldo",
      foll: s.fb_followers,
      href: "https://www.facebook.com/SoyReinaldo",
      Logo: FacebookLogo,
    },
    {
      name: "YouTube",
      handle: "Fútbol con Reinaldo",
      foll: s.yt_subscribers,
      href: "https://www.youtube.com/@SoyReinaldoR",
      Logo: YouTubeLogo,
    },
    {
      name: "Threads",
      handle: "@SoyReinaldoR",
      foll: s.threads_followers,
      href: "https://www.threads.com/@soyreinaldor",
      Logo: ThreadsLogo,
    },
  ];

  return (
    <main className="page">
      <section className="phero">
        <div className="wrap">
          <p className="eyebrow">@SoyReinaldoR</p>
          <h1 className="phero__title">
            Mis redes<span className="dot">.</span>
          </h1>
          <p className="phero__lede">
            Sígueme donde más uses. Análisis, reacciones y debate de fútbol —
            siempre desde la pasión culé.
          </p>
          <div className="phero__meta">
            <div className="mi">
              <b><Foll value={s.total_followers} /></b>
              <span className="l">Seguidores</span>
            </div>
            <div className="mi">
              <b><Foll value={s.ig_views_monthly} /></b>
              <span className="l">Visualizaciones/mes</span>
            </div>
            <div className="mi">
              <b>5<span>+</span></b>
              <span className="l">Plataformas</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="grid3">
            {platforms.map((p) => (
              <a
                key={p.name}
                className="plat"
                href={p.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="plat__top">
                  <span className="plat__icon">
                    <p.Logo className="h-6 w-6" />
                  </span>
                </div>
                <div>
                  <div className="plat__h">{p.name}</div>
                  <div className="plat__handle">{p.handle}</div>
                </div>
                <div className="plat__foll">
                  <Foll value={p.foll} />
                </div>
                <span className="plat__go">
                  Seguir <span className="arr">→</span>
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="comu">
        <div className="wrap section">
          <div
            className="panel"
            style={{ padding: "clamp(28px,5vw,56px)", textAlign: "center" }}
          >
            <p className="eyebrow" style={{ justifyContent: "center" }}>
              Comunidad total
            </p>
            <div
              className="display"
              style={{ fontSize: "clamp(3rem,9vw,6rem)", marginTop: 14 }}
            >
              <Foll value={s.total_followers} />
            </div>
            <p style={{ color: "var(--text-dim)", marginTop: 10 }}>
              personas siguiéndome en redes
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
