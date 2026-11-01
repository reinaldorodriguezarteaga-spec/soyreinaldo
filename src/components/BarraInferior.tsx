"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useEnApp } from "@/components/EnApp";

/**
 * Barra de pestañas de abajo en el móvil y la app (31-oct, pedido del dueño,
 * «como FotMob»): cuatro secciones en una cápsula de cristal y la lupa
 * aparte (Análisis sustituyó a Pizarra el 31-oct; la Pizarra sigue en el ☰
 * y en la página de Análisis). En el ordenador no se ve
 * (globals.css, .tabbar).
 */
const PESTANAS = [
  {
    href: "/analisis",
    label: "Análisis",
    activa: (p: string) => p.startsWith("/analisis"),
    icono: (
      <>
        <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
        <path d="M18 14h-8M15 18h-5M10 6h8v4h-8z" />
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
    // En la app nunca «quiniela» (termino.ts); «Liga de pronósticos» no cabe.
    labelApp: "Pronósticos",
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

/**
 * Encoge la barra al bajar y la recupera al subir (2-nov, «como Instagram»):
 * pone o quita `tabbar-mini` en <html>; el resto es CSS. Ignora los saltos
 * de menos de `UMBRAL` px para no parpadear, y arriba del todo va siempre
 * grande.
 */
const UMBRAL = 8;
function useEncogerAlBajar(pathname: string) {
  useEffect(() => {
    const raiz = document.documentElement;
    raiz.classList.remove("tabbar-mini");
    let ultima = window.scrollY;
    let pendiente = false;
    const mirar = () => {
      pendiente = false;
      const y = window.scrollY;
      if (y < 40) raiz.classList.remove("tabbar-mini");
      else if (y - ultima > UMBRAL) raiz.classList.add("tabbar-mini");
      else if (ultima - y > UMBRAL) raiz.classList.remove("tabbar-mini");
      else return;
      ultima = y;
    };
    const alDesplazar = () => {
      if (!pendiente) {
        pendiente = true;
        requestAnimationFrame(mirar);
      }
    };
    window.addEventListener("scroll", alDesplazar, { passive: true });
    return () => {
      window.removeEventListener("scroll", alDesplazar);
      raiz.classList.remove("tabbar-mini");
    };
  }, [pathname]);
}

export default function BarraInferior() {
  const pathname = usePathname() ?? "/";
  const enApp = useEnApp();
  useEncogerAlBajar(pathname);
  const enlace = (t: (typeof PESTANAS)[number], clase?: string) => {
    const activa = t.activa(pathname);
    const label = enApp && "labelApp" in t ? t.labelApp : t.label;
    return (
      <Link
        key={t.href}
        href={t.href}
        className={[clase, activa ? "is-on" : ""].filter(Boolean).join(" ")}
        aria-current={activa ? "page" : undefined}
        aria-label={clase ? label : undefined}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          {t.icono}
        </svg>
        {!clase && <span>{label}</span>}
      </Link>
    );
  };
  // La lupa va aparte, en su círculo (como FotMob).
  const buscar = PESTANAS[PESTANAS.length - 1];
  return (
    <nav className="tabbar" aria-label="Secciones">
      <div className="tabbar__grupo">{PESTANAS.slice(0, -1).map((t) => enlace(t))}</div>
      {enlace(buscar, "tabbar__buscar")}
    </nav>
  );
}
