"use client";

import Link from "next/link";
import HeaderSearch from "@/components/HeaderSearch";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import UserMenu from "./UserMenu";
import { COMPETITION_GROUPS } from "@/lib/sports/competitions";

const PRODUCTOS = [
  {
    href: "/asesorias",
    label: "Asesoría 1:1",
    desc: "Sesión 1:1 para impulsar tus redes — 75€",
  },
  {
    href: "/camisetas",
    label: "Camisetas",
    desc: "Tienda partner con tu código de descuento",
  },
];

const NAV_LINKS = [
  { href: "/analisis", label: "Análisis" },
  { href: "/quiniela-liga", label: "Quiniela" },
];

/** Estadios, Redes y Contáctame se agrupan aquí: sueltos eran tres enlaces
 * de los siete de la barra, y el nav se había quedado largo (pedido del
 * dueño: "hay muchas opciones"). */
const CONTACTO = [
  {
    href: "/redes",
    label: "Redes",
    desc: "YouTube, Instagram, TikTok, Facebook y Threads",
  },
  {
    href: "/contacto",
    label: "Contáctame",
    desc: "Colaboraciones, prensa o cualquier consulta",
  },
  {
    href: "/estadios",
    label: "Estadios",
    desc: "Mapa de los estadios que hemos visitado",
  },
];

function Caret() {
  return (
    <svg
      className="caret"
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
    </svg>
  );
}

export type FavoriteNavItem = {
  kind: "competition" | "team" | "player";
  label: string;
  linkPath: string;
};

export default function Header({
  initialUser,
  hasLiveMatch = false,
  favorites = [],
  isAdmin = false,
}: {
  initialUser: User | null;
  hasLiveMatch?: boolean;
  favorites?: FavoriteNavItem[];
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<
    "favoritos" | "competiciones" | "contacto" | "productos" | null
  >(null);
  const [mAcc, setMAcc] = useState<
    "favoritos" | "competiciones" | "contacto" | "productos" | null
  >(null);
  const linksRef = useRef<HTMLDivElement>(null);
  // Buscador desplegable del header: mientras está abierto, los enlaces del
  // nav se apartan hacia abajo y la barra ocupa su sitio.
  const [buscando, setBuscando] = useState(false);

  // Cerrar dropdowns al hacer click fuera
  useEffect(() => {
    if (!openMenu) return;
    function onDown(e: MouseEvent) {
      if (linksRef.current && !linksRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [openMenu]);

  // Cerrar todo al navegar. Ajuste DURANTE EL RENDER (patrón de react.dev
  // "adjusting state when props change") en vez de un efecto: hacerlo con
  // setState dentro de useEffect provoca renders en cascada — y además así
  // los menús no llegan a pintarse abiertos un frame en la página nueva.
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setOpenMenu(null);
    setMobileOpen(false);
    setMAcc(null);
    setBuscando(false);
  }

  const isActive = (href: string) => pathname === href;

  return (
    <>
      {/* Nav */}
      <nav className="nav">
        <div className="wrap">
          <div className="nav__in">
            <Link href="/" className="brand" onClick={() => setMobileOpen(false)}>
              <span className="brand__mark">R</span>
              <span>Soy Reinaldo</span>
            </Link>

            {hasLiveMatch && (
              <Link
                href="/en-vivo"
                className="navlive"
                onClick={() => setMobileOpen(false)}
                title="Hay partidos en juego — verlos todos"
              >
                <span className="livepulse" />
                EN VIVO
              </Link>
            )}

            <div
              className={`nav__links${buscando ? " nav__links--fuera" : ""}`}
              ref={linksRef}
            >
              {/* Favoritos — primero, así lo tuyo se ve antes que las 9 competiciones */}
              {favorites.length > 0 && (
                <div className="navdrop">
                  <button
                    type="button"
                    className="navdrop__btn"
                    aria-expanded={openMenu === "favoritos"}
                    onClick={() =>
                      setOpenMenu((m) => (m === "favoritos" ? null : "favoritos"))
                    }
                  >
                    Favoritos <Caret />
                  </button>
                  {openMenu === "favoritos" && (
                    <div className="navdrop__menu">
                      {favorites.map((f) => (
                        <Link
                          key={`${f.kind}-${f.linkPath}`}
                          href={f.linkPath}
                          className="navdrop__item"
                        >
                          {f.label}
                          <span className="d">
                            {f.kind === "competition"
                              ? "Liga"
                              : f.kind === "team"
                                ? "Equipo"
                                : "Jugador"}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Competiciones */}
              <div className="navdrop">
                <button
                  type="button"
                  className={`navdrop__btn ${pathname.startsWith("/liga") ? "is-active" : ""}`}
                  aria-expanded={openMenu === "competiciones"}
                  onClick={() =>
                    setOpenMenu((m) => (m === "competiciones" ? null : "competiciones"))
                  }
                >
                  Competiciones <Caret />
                </button>
                {openMenu === "competiciones" && (
                  <div className="navdrop__menu">
                    {COMPETITION_GROUPS.map((g) => (
                      <div key={g.region}>
                        <p className="navdrop__label">{g.region}</p>
                        {g.competitions.map((c) => (
                          <Link key={c.slug} href={`/liga/${c.slug}`} className="navdrop__item">
                            {c.name}
                          </Link>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Links simples */}
              {NAV_LINKS.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className={isActive(n.href) ? "is-active" : ""}
                >
                  {n.label}
                </Link>
              ))}

              {/* Contacto y redes */}
              <div className="navdrop">
                <button
                  type="button"
                  className="navdrop__btn"
                  aria-expanded={openMenu === "contacto"}
                  onClick={() =>
                    setOpenMenu((m) => (m === "contacto" ? null : "contacto"))
                  }
                >
                  Contacto y redes <Caret />
                </button>
                {openMenu === "contacto" && (
                  <div className="navdrop__menu">
                    {CONTACTO.map((c) => (
                      <Link key={c.href} href={c.href} className="navdrop__item">
                        {c.label}
                        <span className="d">{c.desc}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Productos */}
              <div className="navdrop">
                <button
                  type="button"
                  className="navdrop__btn"
                  aria-expanded={openMenu === "productos"}
                  onClick={() =>
                    setOpenMenu((m) => (m === "productos" ? null : "productos"))
                  }
                >
                  Productos <Caret />
                </button>
                {openMenu === "productos" && (
                  <div className="navdrop__menu">
                    {PRODUCTOS.map((p) => (
                      <Link key={p.href} href={p.href} className="navdrop__item">
                        {p.label}
                        <span className="d">{p.desc}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="nav__cta">
              <HeaderSearch
                abierto={buscando}
                onAbrir={() => setBuscando(true)}
                onCerrar={() => setBuscando(false)}
              />
              {initialUser ? (
                <UserMenu initialUser={initialUser} isAdmin={isAdmin} />
              ) : (
                <Link href="/login" className="btn btn--ghost hidden sm:inline-flex">
                  Iniciar sesión
                </Link>
              )}
              {/* Botón menú móvil */}
              <button
                type="button"
                aria-label="Menú"
                onClick={() => setMobileOpen((v) => !v)}
                className="md:hidden grid h-10 w-10 place-items-center rounded-[4px] border border-[var(--line-strong)] text-[var(--text)]"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
                  {mobileOpen ? (
                    <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                  ) : (
                    <path strokeLinecap="round" d="M3 6h18M3 12h18M3 18h18" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Menú móvil desplegable */}
          {mobileOpen && (
            <div className="md:hidden border-t border-[var(--line)] py-3">
              <div className="flex flex-col gap-1">
                {/* Favoritos acordeón — primero */}
                {favorites.length > 0 && (
                  <>
                    <button
                      type="button"
                      className="navacc__btn"
                      aria-expanded={mAcc === "favoritos"}
                      onClick={() =>
                        setMAcc((m) => (m === "favoritos" ? null : "favoritos"))
                      }
                    >
                      Favoritos <Caret />
                    </button>
                    {mAcc === "favoritos" && (
                      <div className="navacc__sub">
                        {favorites.map((f) => (
                          <Link key={`${f.kind}-${f.linkPath}`} href={f.linkPath}>
                            {f.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* Competiciones acordeón */}
                <button
                  type="button"
                  className="navacc__btn"
                  aria-expanded={mAcc === "competiciones"}
                  onClick={() =>
                    setMAcc((m) => (m === "competiciones" ? null : "competiciones"))
                  }
                >
                  Competiciones <Caret />
                </button>
                {mAcc === "competiciones" && (
                  <div className="navacc__sub">
                    {COMPETITION_GROUPS.map((g) => (
                      <div key={g.region}>
                        <p className="navacc__sublabel">{g.region}</p>
                        {g.competitions.map((c) => (
                          <Link key={c.slug} href={`/liga/${c.slug}`}>
                            {c.name}
                          </Link>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {NAV_LINKS.map((n) => (
                  <MobileLink key={n.href} href={n.href}>
                    {n.label}
                  </MobileLink>
                ))}

                {/* Contacto y redes acordeón */}
                <button
                  type="button"
                  className="navacc__btn"
                  aria-expanded={mAcc === "contacto"}
                  onClick={() =>
                    setMAcc((m) => (m === "contacto" ? null : "contacto"))
                  }
                >
                  Contacto y redes <Caret />
                </button>
                {mAcc === "contacto" && (
                  <div className="navacc__sub">
                    {CONTACTO.map((c) => (
                      <Link key={c.href} href={c.href}>
                        {c.label}
                      </Link>
                    ))}
                  </div>
                )}

                {/* Productos acordeón */}
                <button
                  type="button"
                  className="navacc__btn"
                  aria-expanded={mAcc === "productos"}
                  onClick={() =>
                    setMAcc((m) => (m === "productos" ? null : "productos"))
                  }
                >
                  Productos <Caret />
                </button>
                {mAcc === "productos" && (
                  <div className="navacc__sub">
                    {PRODUCTOS.map((p) => (
                      <Link key={p.href} href={p.href}>
                        {p.label}
                      </Link>
                    ))}
                  </div>
                )}

                {!initialUser && (
                  <Link href="/login" className="btn btn--accent mt-2 justify-center">
                    Iniciar sesión
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Móvil: el aviso de "en vivo" vive abajo, no en el header. Dentro del
          header ahogaba al buscador (medido: la barra caía de 235 a 124 px en
          una pantalla de 375). Va FUERA del <nav> a propósito: el
          backdrop-filter del header lo convierte en marco de referencia de los
          elementos fijos, y anclado ahí dentro la pastilla se quedaba arriba. */}
      {hasLiveMatch && (
        <Link
          href="/en-vivo"
          className="livepill"
          onClick={() => setMobileOpen(false)}
          title="Hay partidos en juego — verlos todos"
        >
          <span className="livepulse" />
          EN VIVO
        </Link>
      )}
    </>
  );
}

function MobileLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-[4px] px-3 py-3 text-sm font-semibold text-[var(--text-dim)] transition hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
    >
      {children}
    </Link>
  );
}
