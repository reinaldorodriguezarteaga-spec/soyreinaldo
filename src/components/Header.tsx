"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import UserMenu from "./UserMenu";
import { WORLD_CUP } from "@/lib/sports/api-football";

type League = { id: string; name: string };

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

const QUINIELA_LINKS = [
  { href: "/quiniela/partidos", label: "Predicciones" },
  { href: "/quiniela/picks", label: "Picks especiales" },
  { href: "/quiniela/grupos", label: "Tabla por equipos" },
  { href: "/quiniela/bracket", label: "Bracket" },
];

const QUINIELA_FOOT = [
  { href: "/quiniela/puntos", label: "Cómo se puntúa" },
  { href: "/quiniela", label: "Mi quiniela" },
];

const NAV_LINKS = [
  { href: "/mundial", label: "Mundial 2026" },
  { href: "/estadios", label: "Estadios" },
  { href: "/redes", label: "Redes" },
  { href: "/contacto", label: "Contáctame" },
];

const KICKOFF_MS = new Date(WORLD_CUP.startUtc).getTime();
const pad = (n: number) => n.toString().padStart(2, "0");

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

export default function Header({
  initialUser,
  userLeagues = [],
}: {
  initialUser: User | null;
  userLeagues?: League[];
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<"quiniela" | "productos" | null>(
    null,
  );
  const [mAcc, setMAcc] = useState<"quiniela" | "productos" | null>(null);
  const [left, setLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(
    null,
  );
  const linksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tick = () => {
      const ms = KICKOFF_MS - Date.now();
      if (ms <= 0) {
        setLeft(null);
        return;
      }
      const t = Math.floor(ms / 1000);
      setLeft({
        d: Math.floor(t / 86400),
        h: Math.floor((t % 86400) / 3600),
        m: Math.floor((t % 3600) / 60),
        s: t % 60,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

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

  const isActive = (href: string) =>
    href === "/quiniela" ? pathname.startsWith("/quiniela") : pathname === href;

  const hasLeagues = userLeagues.length > 0;
  const showQuinielaMenu = !!initialUser;

  return (
    <>
      {/* Ticker */}
      <div className="ticker">
        <div className="wrap">
          <div className="ticker__in">
            <span className="ticker__dot" />
            <span>Mundial 2026</span>
            {left ? (
              <span className="ticker__clock">
                <b>{pad(left.d)}d</b>
                <span className="ticker__seg">:</span>
                <b>{pad(left.h)}h</b>
                <span className="ticker__seg">:</span>
                <b>{pad(left.m)}m</b>
                <span className="ticker__seg">:</span>
                <b suppressHydrationWarning>{pad(left.s)}s</b>
              </span>
            ) : (
              <span className="ticker__clock">
                <b>EN JUEGO</b>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="nav">
        <div className="wrap">
          <div className="nav__in">
            <Link href="/" className="brand" onClick={() => setMobileOpen(false)}>
              <span className="brand__mark">R</span>
              <span>Soy Reinaldo</span>
            </Link>

            <div className="nav__links" ref={linksRef}>
              {/* Quiniela */}
              {showQuinielaMenu ? (
                <div className="navdrop">
                  <button
                    type="button"
                    className={`navdrop__btn ${pathname.startsWith("/quiniela") ? "is-active" : ""}`}
                    aria-expanded={openMenu === "quiniela"}
                    onClick={() =>
                      setOpenMenu((m) => (m === "quiniela" ? null : "quiniela"))
                    }
                  >
                    Quiniela <Caret />
                  </button>
                  {openMenu === "quiniela" && (
                    <div className="navdrop__menu">
                      {QUINIELA_LINKS.map((l) => (
                        <Link key={l.href} href={l.href} className="navdrop__item">
                          {l.label}
                        </Link>
                      ))}
                      {hasLeagues && (
                        <>
                          <div className="navdrop__sep" />
                          <p className="navdrop__label">Rankings</p>
                          {userLeagues.map((l) => (
                            <Link
                              key={l.id}
                              href={`/quiniela/ranking/${l.id}`}
                              className="navdrop__item"
                            >
                              {l.name}
                            </Link>
                          ))}
                        </>
                      )}
                      <div className="navdrop__sep" />
                      {QUINIELA_FOOT.map((l) => (
                        <Link
                          key={l.href}
                          href={l.href}
                          className="navdrop__item navdrop__item--muted"
                        >
                          {l.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/quiniela"
                  className={isActive("/quiniela") ? "is-active" : ""}
                >
                  Quiniela
                </Link>
              )}

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
              {initialUser ? (
                <UserMenu initialUser={initialUser} />
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
                {/* Quiniela acordeón */}
                {showQuinielaMenu ? (
                  <>
                    <button
                      type="button"
                      className="navacc__btn"
                      aria-expanded={mAcc === "quiniela"}
                      onClick={() =>
                        setMAcc((m) => (m === "quiniela" ? null : "quiniela"))
                      }
                    >
                      Quiniela <Caret />
                    </button>
                    {mAcc === "quiniela" && (
                      <div className="navacc__sub">
                        {QUINIELA_LINKS.map((l) => (
                          <Link key={l.href} href={l.href}>
                            {l.label}
                          </Link>
                        ))}
                        {hasLeagues && (
                          <>
                            <p className="navacc__sublabel">Rankings</p>
                            {userLeagues.map((l) => (
                              <Link key={l.id} href={`/quiniela/ranking/${l.id}`}>
                                {l.name}
                              </Link>
                            ))}
                          </>
                        )}
                        {QUINIELA_FOOT.map((l) => (
                          <Link key={l.href} href={l.href}>
                            {l.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <MobileLink href="/quiniela">Quiniela</MobileLink>
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
