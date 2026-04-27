"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const productos = [
  {
    href: "/bot",
    label: "Bot de Comentarios",
    desc: "IA que responde comentarios de YouTube en mi voz",
  },
  {
    href: "/media-kit",
    label: "Media Kit",
    desc: "Audiencia, tarifas y formatos para marcas",
  },
  {
    href: "/contacto",
    label: "Contáctame",
    desc: "Email y redes para colaboraciones",
  },
];

export default function Header() {
  const [openProductos, setOpenProductos] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

        <nav className="hidden md:block">
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
        </nav>

        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={mobileOpen}
          className="rounded-lg p-2 text-zinc-300 transition hover:text-white md:hidden"
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

      {mobileOpen && (
        <div className="border-t border-zinc-900 bg-zinc-950 px-6 py-5 md:hidden">
          <div className="mb-3 text-xs uppercase tracking-[0.2em] text-zinc-500">
            Productos
          </div>
          <div className="flex flex-col gap-1">
            {productos.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 transition hover:bg-zinc-900"
              >
                <div className="text-sm font-medium">{p.label}</div>
                <div className="mt-0.5 text-xs text-zinc-400">{p.desc}</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
