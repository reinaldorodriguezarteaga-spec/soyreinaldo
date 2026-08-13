"use client";

import Link from "next/link";
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
  { href: "/quiniela-liga", label: "Quiniela" },
  { href: "/estadios", label: "Estadios" },
  { href: "/redes", label: "Redes" },
  { href: "/contacto", label: "Contáctame" },
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
    "favoritos" | "competiciones" | "productos" | null
  >(null);
  const [mAcc, setMAcc] = useState<
    "favoritos" | "competiciones" | "productos" | null
  >(null);
  const linksRef = useRef<HTMLDivElement>(null);

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

  // Cerrar todo al navegar
  useEffect(() => {
    setOpenMenu(null);
    setMobileOpen(false);
    setMAcc(null);
  }, [pathname]);

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
                href="/"
                className="navlive"
                onClick={() => setMobileOpen(false)}
                title="Hay partido en juego — ver el marcador en vivo"
              >
                <span className="livepulse" />
                EN VIVO
              </Link>
            )}

            <div className="nav__links" ref={linksRef}>
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
              <Link
                href="/liga/laliga/buscar"
                aria-label="Buscar equipo o jugador"
                title="Buscar equipo o jugador"
                className="grid h-10 w-10 place-items-center rounded-[4px] border border-[var(--line-strong)] text-[var(--text)]"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <circle cx="11" cy="11" r="7" />
                  <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
                </svg>
              </Link>
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
