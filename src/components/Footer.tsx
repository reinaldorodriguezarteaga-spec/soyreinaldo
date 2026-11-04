import Link from "next/link";
import {
  YouTubeLogo,
  InstagramLogo,
  TikTokLogo,
  ThreadsLogo,
  WhatsAppLogo,
} from "@/components/social-logos";

const SOCIALS = [
  { href: "https://www.youtube.com/@SoyReinaldoR", Logo: YouTubeLogo, label: "YouTube" },
  { href: "https://www.instagram.com/soyreinaldor/", Logo: InstagramLogo, label: "Instagram" },
  { href: "https://www.tiktok.com/@soyreinaldor", Logo: TikTokLogo, label: "TikTok" },
  { href: "https://www.threads.com/@soyreinaldor", Logo: ThreadsLogo, label: "Threads" },
  { href: "https://chat.whatsapp.com/Hgw7vhK85i13E8aLxGTlIQ?mode=gi_t", Logo: WhatsAppLogo, label: "WhatsApp" },
];

/** La app de iOS (aprobada el 28-oct-2026). */
export const APP_STORE_URL = "https://apps.apple.com/es/app/id6822903408";
/** La de Android (en Google Play desde el 1-nov-2026). */
export const GOOGLE_PLAY_URL = "https://play.google.com/store/apps/details?id=com.soyreinaldo.app";

export default function Footer({ enApp = false }: { enApp?: boolean }) {
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot__word">
          Soy Reinaldo<span className="dot">.</span>
        </div>
        <div className="foot__cols">
          <nav className="foot__links">
            <Link href="/estadios">Estadios</Link>
            <Link href="/sobre-reinaldo">Sobre Reinaldo</Link>
            <Link href="/redes">Redes</Link>
            <Link href="/contacto">Contáctame</Link>
            <Link href="/privacidad">Privacidad</Link>
            <Link href="/eliminar-datos">Eliminar mis datos</Link>
          </nav>
          <div className="foot__social">
            {SOCIALS.map(({ href, Logo, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
              >
                <Logo className="h-[18px] w-[18px]" />
              </a>
            ))}
          </div>
        </div>
        {/* Dentro de la app no tiene sentido invitar a descargarla. */}
        {!enApp && (
          <div className="foot__stores">
            <a className="foot__store" href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
              {/* Insignia oficial de Apple (no se puede redibujar ni recolorear). */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/app-store-es.svg" alt="Descárgalo en el App Store" width={120} height={40} />
            </a>
            <a className="foot__store" href={GOOGLE_PLAY_URL} target="_blank" rel="noopener noreferrer">
              {/* Insignia oficial de Google Play, servida por Google. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://play.google.com/intl/en_us/badges/static/images/badges/es_badge_web_generic.png"
                alt="Disponible en Google Play"
                width={155}
                height={60}
                className="foot__store--play"
              />
            </a>
          </div>
        )}
        <p className="foot__copy">
          © {new Date().getFullYear()} Reinaldo Rodríguez · Fútbol con Reinaldo
        </p>
      </div>
    </footer>
  );
}
