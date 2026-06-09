import Link from "next/link";
import {
  YouTubeLogo,
  InstagramLogo,
  TikTokLogo,
  ThreadsLogo,
  WhatsAppLogo,
} from "@/components/social-logos";

const SOCIALS = [
  { href: "https://www.youtube.com/@futbolconreinaldo", Logo: YouTubeLogo, label: "YouTube" },
  { href: "https://www.instagram.com/soyreinaldor/", Logo: InstagramLogo, label: "Instagram" },
  { href: "https://www.tiktok.com/@soyreinaldor", Logo: TikTokLogo, label: "TikTok" },
  { href: "https://www.threads.com/@soyreinaldor", Logo: ThreadsLogo, label: "Threads" },
  { href: "https://chat.whatsapp.com/Hgw7vhK85i13E8aLxGTlIQ?mode=gi_t", Logo: WhatsAppLogo, label: "WhatsApp" },
];

export default function Footer() {
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot__word">
          Soy Reinaldo<span className="dot">.</span>
        </div>
        <div className="foot__cols">
          <nav className="foot__links">
            <Link href="/quiniela">Quiniela</Link>
            <Link href="/laliga">LaLiga</Link>
            <Link href="/estadios">Estadios</Link>
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
        <p className="foot__copy">
          © {new Date().getFullYear()} Reinaldo Rodríguez · Fútbol con Reinaldo
        </p>
      </div>
    </footer>
  );
}
