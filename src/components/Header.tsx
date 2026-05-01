"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import UserMenu from "./UserMenu";

const productos = [
  {
    href: "/camisetas",
    label: "Camisetas",
    desc: "Tienda partner con tu código de descuento",
  },
  // Oculto temporalmente — solo añadía ruido. La página /bot sigue accesible
  // por URL para no romper enlaces externos:
  // { href: "/bot", label: "Bot de Comentarios", desc: "IA que responde comentarios de YouTube en mi voz" },
];

type League = { id: string; name: string };

export default function Header({
  initialUser,
  userLeagues = [],
}: {
  initialUser: User | null;
  userLeagues?: League[];
}) {
  const [openProductos, setOpenProductos] = useState(false);
  const [openQuiniela, setOpenQuiniela] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileProductosOpen, setMobileProductosOpen] = useState(false);
  const [mobileQuinielaOpen, setMobileQuinielaOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const quinielaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openProductos) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpenProductos(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openProductos]);

  useEffect(() => {
    if (!openQuiniela) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        quinielaRef.current &&
        !quinielaRef.current.contains(event.target as Node)
      ) {
        setOpenQuiniela(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openQuiniela]);

  const hasLeagues = userLeagues.length > 0;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-900 bg-black/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="text-base font-semibold tracking-tight"
          onClick={() => setMobileOpen(false)}
        >
          Soy <span className="text-indigo-300">Reinaldo</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setOpenProductos((o) => !o)}
              aria-expanded={openProductos}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:text-white"
            >
              Productos
              <svg
                className={`h-3.5 w-3.5 transition-transform ${openProductos ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {openProductos && (
              <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl">
                {productos.map((p) => (
                  <Link
                    key={p.href}
                    href={p.href}
                    onClick={() => setOpenProductos(false)}
                    className="block rounded-lg px-3 py-2.5 transition hover:bg-zinc-900"
                  >
                    <div className="text-sm font-medium text-white">
                      {p.label}
                    </div>
                    <div className="mt-0.5 text-xs text-zinc-400">{p.desc}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          {hasLeagues ? (
            <div ref={quinielaRef} className="relative">
              <button
                type="button"
                onClick={() => setOpenQuiniela((o) => !o)}
                aria-expanded={openQuiniela}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:text-white"
              >
                Quiniela
                <svg
                  className={`h-3.5 w-3.5 transition-transform ${openQuiniela ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {openQuiniela && (
                <div className="absolute right-0 mt-2 w-72 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl">
                  <DropdownItem
                    href="/quiniela/partidos"
                    title="Predicciones"
                    onClose={() => setOpenQuiniela(false)}
                  />
                  <DropdownItem
                    href="/quiniela/picks"
                    title="Picks especiales"
                    onClose={() => setOpenQuiniela(false)}
                  />
                  <DropdownItem
                    href="/quiniela/grupos"
                    title="Tabla de clasificación por equipos"
                    onClose={() => setOpenQuiniela(false)}
                  />
                  <DropdownItem
                    href="/quiniela/bracket"
                    title="Bracket"
                    onClose={() => setOpenQuiniela(false)}
                  />
                  <div className="my-1 border-t border-zinc-900" />
                  <p className="px-3 pb-1 pt-1 text-[10px] uppercase tracking-widest text-zinc-600">
                    Rankings
                  </p>
                  {userLeagues.map((l) => (
                    <DropdownItem
                      key={l.id}
                      href={`/quiniela/ranking/${l.id}`}
                      title={l.name}
                      onClose={() => setOpenQuiniela(false)}
                    />
                  ))}
                  <div className="my-1 border-t border-zinc-900" />
                  <DropdownItem
                    href="/quiniela/puntos"
                    title="Cómo se puntúa"
                    muted
                    onClose={() => setOpenQuiniela(false)}
                  />
                  <DropdownItem
                    href="/quiniela"
                    title="Mi quiniela"
                    muted
                    onClose={() => setOpenQuiniela(false)}
                  />
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/quiniela"
              className="rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:text-white"
            >
              Quiniela
            </Link>
          )}
          <Link
            href="/laliga"
            className="rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:text-white"
          >
            LaLiga
          </Link>
          <Link
            href="/estadios"
            className="rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:text-white"
          >
            Estadios
          </Link>
          <Link
            href="/contacto"
            className="rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:text-white"
          >
            Contáctame
          </Link>
          <div className="ml-2 border-l border-zinc-800 pl-3">
            <UserMenu initialUser={initialUser} />
          </div>
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          <UserMenu initialUser={initialUser} />
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={mobileOpen}
            className="rounded-lg p-2 text-zinc-300 transition hover:text-white"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {mobileOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-zinc-900 bg-zinc-950 px-6 py-4 md:hidden">
          <button
            type="button"
            onClick={() => setMobileProductosOpen((o) => !o)}
            aria-expanded={mobileProductosOpen}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition hover:bg-zinc-900"
          >
            <span>Productos</span>
            <svg
              className={`h-3.5 w-3.5 text-zinc-400 transition-transform ${mobileProductosOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {mobileProductosOpen && (
            <div className="mt-1 flex flex-col gap-1 pl-2">
              {productos.map((p) => (
                <Link
                  key={p.href}
                  href={p.href}
                  onClick={() => {
                    setMobileOpen(false);
                    setMobileProductosOpen(false);
                  }}
                  className="rounded-lg px-3 py-2.5 transition hover:bg-zinc-900"
                >
                  <div className="text-sm font-medium">{p.label}</div>
                  <div className="mt-0.5 text-xs text-zinc-400">{p.desc}</div>
                </Link>
              ))}
            </div>
          )}

          <div className="mt-2 border-t border-zinc-900 pt-2">
            {hasLeagues ? (
              <>
                <button
                  type="button"
                  onClick={() => setMobileQuinielaOpen((o) => !o)}
                  aria-expanded={mobileQuinielaOpen}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition hover:bg-zinc-900"
                >
                  <span>Quiniela</span>
                  <svg
                    className={`h-3.5 w-3.5 text-zinc-400 transition-transform ${mobileQuinielaOpen ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {mobileQuinielaOpen && (
                  <div className="mt-1 flex flex-col gap-0.5 pl-2">
                    <MobileItem
                      href="/quiniela/partidos"
                      title="Predicciones"
                      onClose={() => {
                        setMobileOpen(false);
                        setMobileQuinielaOpen(false);
                      }}
                    />
                    <MobileItem
                      href="/quiniela/picks"
                      title="Picks especiales"
                      onClose={() => {
                        setMobileOpen(false);
                        setMobileQuinielaOpen(false);
                      }}
                    />
                    <MobileItem
                      href="/quiniela/grupos"
                      title="Tabla de clasificación por equipos"
                      onClose={() => {
                        setMobileOpen(false);
                        setMobileQuinielaOpen(false);
                      }}
                    />
                    <MobileItem
                      href="/quiniela/bracket"
                      title="Bracket"
                      onClose={() => {
                        setMobileOpen(false);
                        setMobileQuinielaOpen(false);
                      }}
                    />
                    <div className="my-1 border-t border-zinc-900" />
                    <p className="px-3 pb-1 pt-1 text-[10px] uppercase tracking-widest text-zinc-600">
                      Rankings
                    </p>
                    {userLeagues.map((l) => (
                      <MobileItem
                        key={l.id}
                        href={`/quiniela/ranking/${l.id}`}
                        title={l.name}
                        onClose={() => {
                          setMobileOpen(false);
                          setMobileQuinielaOpen(false);
                        }}
                      />
                    ))}
                    <div className="my-1 border-t border-zinc-900" />
                    <MobileItem
                      href="/quiniela/puntos"
                      title="Cómo se puntúa"
                      onClose={() => {
                        setMobileOpen(false);
                        setMobileQuinielaOpen(false);
                      }}
                    />
                    <MobileItem
                      href="/quiniela"
                      title="Mi quiniela"
                      muted
                      onClose={() => {
                        setMobileOpen(false);
                        setMobileQuinielaOpen(false);
                      }}
                    />
                  </div>
                )}
              </>
            ) : (
              <Link
                href="/quiniela"
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium transition hover:bg-zinc-900"
              >
                Quiniela
              </Link>
            )}
            <Link
              href="/laliga"
              onClick={() => setMobileOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium transition hover:bg-zinc-900"
            >
              LaLiga
            </Link>
            <Link
              href="/estadios"
              onClick={() => setMobileOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium transition hover:bg-zinc-900"
            >
              Estadios
            </Link>
            <Link
              href="/contacto"
              onClick={() => setMobileOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium transition hover:bg-zinc-900"
            >
              Contáctame
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

function DropdownItem({
  href,
  title,
  suffix,
  muted,
  onClose,
}: {
  href: string;
  title: string;
  suffix?: string;
  muted?: boolean;
  onClose: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition hover:bg-zinc-900 ${
        muted ? "text-zinc-400" : "text-white"
      }`}
    >
      <span>{title}</span>
      {suffix && (
        <span className="truncate text-xs text-zinc-500">{suffix}</span>
      )}
    </Link>
  );
}

function MobileItem({
  href,
  title,
  suffix,
  muted,
  onClose,
}: {
  href: string;
  title: string;
  suffix?: string;
  muted?: boolean;
  onClose: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition hover:bg-zinc-900 ${
        muted ? "text-zinc-400" : "text-white"
      }`}
    >
      <span>{title}</span>
      {suffix && <span className="text-xs text-zinc-500">{suffix}</span>}
    </Link>
  );
}
