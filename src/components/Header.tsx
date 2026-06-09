"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import UserMenu from "./UserMenu";
import { WORLD_CUP } from "@/lib/sports/api-football";

const NAV = [
  { href: "/quiniela", label: "Quiniela" },
  { href: "/laliga", label: "LaLiga" },
  { href: "/estadios", label: "Estadios" },
  { href: "/redes", label: "Redes" },
  { href: "/contacto", label: "Contáctame" },
];

const KICKOFF_MS = new Date(WORLD_CUP.startUtc).getTime();
const pad = (n: number) => n.toString().padStart(2, "0");

type League = { id: string; name: string };

export default function Header({
  initialUser,
}: {
  initialUser: User | null;
  userLeagues?: League[];
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [left, setLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(
    null,
  );

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

  const isActive = (href: string) =>
    href === "/quiniela" ? pathname.startsWith("/quiniela") : pathname === href;

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
            <Link
              href="/"
              className="brand"
              onClick={() => setMobileOpen(false)}
            >
              <span className="brand__mark">R</span>
              <span>Soy Reinaldo</span>
            </Link>

            <div className="nav__links">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className={isActive(n.href) ? "is-active" : ""}
                >
                  {n.label}
                </Link>
              ))}
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
                {NAV.map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-[4px] px-3 py-3 text-sm font-semibold text-[var(--text-dim)] transition hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                  >
                    {n.label}
                  </Link>
                ))}
                {!initialUser && (
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="btn btn--accent mt-2 justify-center"
                  >
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
