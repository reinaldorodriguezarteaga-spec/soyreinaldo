import Link from "next/link";
import {
  FacebookLogo,
  InstagramLogo,
  ThreadsLogo,
  TikTokLogo,
  YouTubeLogo,
} from "@/components/social-logos";

export const metadata = {
  title: "Contáctame | Soy Reinaldo",
  description:
    "Contacta con Reinaldo Rodríguez (@SoyReinaldoR) para colaboraciones de marca, prensa o consultas.",
};

const emails = ["reinaldortv@outlook.com", "reinaldo_r@live.com"];
const telefonos = [
  { display: "696 140 935", e164: "+34696140935" },
  { display: "658 751 785", e164: "+34658751785" },
];

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-5 w-5" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75A2.25 2.25 0 014.5 4.5h15a2.25 2.25 0 012.25 2.25v10.5A2.25 2.25 0 0119.5 19.5h-15a2.25 2.25 0 01-2.25-2.25V6.75z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 7l9.5 6.5L21.5 7" />
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-5 w-5" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
    </svg>
  );
}

const SOCIALS = [
  { href: "https://www.youtube.com/@SoyReinaldoR", Logo: YouTubeLogo, label: "YouTube" },
  { href: "https://www.instagram.com/soyreinaldor/", Logo: InstagramLogo, label: "Instagram" },
  { href: "https://www.tiktok.com/@soyreinaldor", Logo: TikTokLogo, label: "TikTok" },
  { href: "https://www.facebook.com/SoyReinaldo", Logo: FacebookLogo, label: "Facebook" },
  { href: "https://www.threads.com/@soyreinaldor", Logo: ThreadsLogo, label: "Threads" },
];

export default function ContactoPage() {
  return (
    <main className="page">
      <section className="phero">
        <div className="wrap">
          <p className="eyebrow">Hablemos</p>
          <h1 className="phero__title">
            Contáctame<span className="dot">.</span>
          </h1>
          <p className="phero__lede">
            Para colaboraciones de marca, prensa o cualquier propuesta. Te
            respondo en menos de 48h.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="formgrid">
            {/* Datos directos */}
            <div className="contact-aside">
              <div className="shead" style={{ marginBottom: 6 }}>
                <h2>Datos directos</h2>
              </div>

              {emails.map((e) => (
                <a key={e} href={`mailto:${e}`} className="contact-line">
                  <span className="ci"><MailIcon /></span>
                  <span className="ct">
                    <b>{e}</b>
                    <span>Colaboraciones y prensa</span>
                  </span>
                </a>
              ))}

              {telefonos.map((t) => (
                <a key={t.e164} href={`tel:${t.e164}`} className="contact-line">
                  <span className="ci"><PhoneIcon /></span>
                  <span className="ct">
                    <b>{t.display}</b>
                    <span>Llamada o WhatsApp</span>
                  </span>
                </a>
              ))}

              <a
                href="https://www.instagram.com/soyreinaldor/"
                target="_blank"
                rel="noopener noreferrer"
                className="contact-line"
              >
                <span className="ci"><InstagramLogo className="h-5 w-5" /></span>
                <span className="ct">
                  <b>@SoyReinaldoR</b>
                  <span>DM abiertos en Instagram</span>
                </span>
              </a>

              <Link href="/media-kit" className="btn btn--ghost" style={{ marginTop: 8, alignSelf: "flex-start" }}>
                Descargar media kit <span className="arr">→</span>
              </Link>
            </div>

            {/* Redes */}
            <div>
              <div className="shead" style={{ marginBottom: 6 }}>
                <h2>Mis redes</h2>
              </div>
              <div className="grid2">
                {SOCIALS.map(({ href, Logo, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="plat"
                    style={{ minHeight: 0, padding: 22 }}
                  >
                    <div className="plat__top">
                      <span className="plat__icon"><Logo className="h-6 w-6" /></span>
                      <span className="plat__go">
                        Abrir <span className="arr">→</span>
                      </span>
                    </div>
                    <div className="plat__h" style={{ fontSize: "1.3rem" }}>{label}</div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
