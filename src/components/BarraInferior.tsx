"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Barra de pestañas de abajo en el móvil y la app (31-oct, pedido del dueño,
 * «como FotMob»): cuatro secciones y la lupa. En el ordenador no se ve
 * (globals.css, .tabbar).
 */
const PESTANAS = [
  {
    href: "/pizarras",
    label: "Pizarra",
    activa: (p: string) => p.startsWith("/pizarra") || p.startsWith("/comparador"),
    icono: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M12 4v16M3 12h4M17 12h4" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
  },
  {
    href: "/juegos",
    label: "Juegos",
    activa: (p: string) => p.startsWith("/juegos") || p.startsWith("/reto"),
    icono: (
      <>
        <rect x="2.5" y="7" width="19" height="11" rx="5.5" />
        <path d="M7 11v3M5.5 12.5h3" />
        <circle cx="15.5" cy="11.5" r="0.9" fill="currentColor" />
        <circle cx="17.5" cy="13.8" r="0.9" fill="currentColor" />
      </>
    ),
  },
  {
    href: "/quiniela-liga",
    label: "Quiniela",
    activa: (p: string) => p.startsWith("/quiniela") || p.startsWith("/mi-jornada") || p.startsWith("/mi-temporada"),
    icono: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 8h3M8 12h3M8 16h3M14.5 8l1 1 2-2M14.5 12l1 1 2-2" />
      </>
    ),
  },
  {
    href: "/favoritos",
    label: "Favoritos",
    activa: (p: string) => p.startsWith("/favoritos"),
    icono: <path strokeLinejoin="round" d="M12 2.5l2.9 6.6 7.1.7-5.4 4.8 1.6 7-6.2-3.8-6.2 3.8 1.6-7-5.4-4.8 7.1-.7z" />,
  },
  {
    href: "/buscar",
    label: "Buscar",
    activa: (p: string) => p.startsWith("/buscar"),
    icono: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
      </>
    ),
  },
];

export default function BarraInferior() {
  const pathname = usePathname() ?? "/";
  return (
    <nav className="tabbar" aria-label="Secciones">
      {PESTANAS.map((t) => {
        const activa = t.activa(pathname);
        return (
          <Link key={t.href} href={t.href} className={activa ? "is-on" : ""} aria-current={activa ? "page" : undefined}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              {t.icono}
            </svg>
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
