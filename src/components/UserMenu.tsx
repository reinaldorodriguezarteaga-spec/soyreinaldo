"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/app/login/actions";
import type { User } from "@supabase/supabase-js";

type AdminLink = { href: string; label: string; externo?: boolean };

// Escribir va primero: es lo que más se usa y lo único que no puede copiar
// la competencia. El resto de apps y URLs de un directo (multichat,
// marcadores para OBS) van aparte, en la subpestaña "Directos" — de aquí
// no se toca nada más entre partido y partido.
const ADMIN_LINKS: AdminLink[] = [
  { href: "/admin/analisis", label: "Escribir análisis" },
  { href: "/admin/ligas", label: "Ligas" },
  { href: "/admin/quiniela-liga", label: "Final Quiniela LaLiga" },
  { href: "/admin/seguidores", label: "Redes (seguidores)" },
  { href: "/admin/imagenes", label: "Imágenes (extractor)" },
];

// Apps hermanas fuera de esta web y URLs para pegar en OBS — todo lo que
// hace falta a mano durante un directo, agrupado aparte porque antes había
// que ir pidiéndolo enlace a enlace.
const DIRECTOS_LINKS: AdminLink[] = [
  { href: "https://chat.soyreinaldo.com", label: "Multichat", externo: true },
  {
    href: "https://chat.soyreinaldo.com/marcador/control",
    label: "Marcador en vivo (control)",
    externo: true,
  },
  // La URL que se pega en OBS como fuente de navegador (overlay 1920×200).
  {
    href: "https://chat.soyreinaldo.com/marcador",
    label: "Marcador overlay (URL para OBS)",
    externo: true,
  },
  // Marcador completo vertical (720×1280): alineaciones, estadísticas y
  // cambios, también como fuente de navegador en OBS.
  {
    href: "https://chat.soyreinaldo.com/marcador/completo",
    label: "Marcador completo (URL para OBS)",
    externo: true,
  },
];

function AdminLinkItem({ a, onClick }: { a: AdminLink; onClick: () => void }) {
  const className =
    "rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-white";
  if (a.externo) {
    return (
      <a
        href={a.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        className={className}
      >
        {a.label} ↗
      </a>
    );
  }
  return (
    <Link href={a.href} onClick={onClick} className={className}>
      {a.label}
    </Link>
  );
}

export default function UserMenu({
  initialUser,
  isAdmin = false,
}: {
  initialUser: User | null;
  isAdmin?: boolean;
}) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [open, setOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [directosOpen, setDirectosOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Cierra el menú entero y, con él, el acordeón "Admin" — así no queda
  // desplegado la próxima vez que se abra.
  function closeMenu() {
    setOpen(false);
    setAdminOpen(false);
    setDirectosOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        closeMenu();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-lg bg-indigo-300 px-3.5 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-indigo-200"
      >
        Iniciar sesión
      </Link>
    );
  }

  const displayName =
    (user.user_metadata?.display_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "Tú";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm transition hover:border-zinc-700"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-300/20 text-xs font-semibold text-indigo-200">
          {displayName.charAt(0).toUpperCase()}
        </span>
        <span className="hidden max-w-[140px] truncate font-medium sm:inline">
          {displayName}
        </span>
        <svg
          className={`h-3.5 w-3.5 text-zinc-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
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

      {open && (
        <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl">
          <div className="px-3 pb-2 pt-1">
            <div className="text-sm font-medium">{displayName}</div>
            <div className="truncate text-xs text-zinc-500">{user.email}</div>
          </div>
          <div className="my-1 h-px bg-zinc-900" />
          <Link
            href="/perfil"
            onClick={closeMenu}
            className="block rounded-lg px-3 py-2 text-sm transition hover:bg-zinc-900"
          >
            Perfil
          </Link>

          {isAdmin && (
            <>
              <button
                type="button"
                onClick={() => setAdminOpen((o) => !o)}
                aria-expanded={adminOpen}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition hover:bg-zinc-900"
              >
                <span>Admin</span>
                <svg
                  className={`h-3.5 w-3.5 text-zinc-400 transition-transform ${
                    adminOpen ? "rotate-180" : ""
                  }`}
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
              {adminOpen && (
                <div className="ml-2 mt-0.5 flex flex-col gap-0.5 border-l border-zinc-900 pl-2">
                  {ADMIN_LINKS.map((a) => (
                    <AdminLinkItem key={a.href} a={a} onClick={closeMenu} />
                  ))}

                  <button
                    type="button"
                    onClick={() => setDirectosOpen((o) => !o)}
                    aria-expanded={directosOpen}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
                  >
                    <span>Directos</span>
                    <svg
                      className={`h-3.5 w-3.5 transition-transform ${
                        directosOpen ? "rotate-180" : ""
                      }`}
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
                  {directosOpen && (
                    <div className="ml-2 flex flex-col gap-0.5 border-l border-zinc-900 pl-2">
                      {DIRECTOS_LINKS.map((a) => (
                        <AdminLinkItem key={a.href} a={a} onClick={closeMenu} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <div className="my-1 h-px bg-zinc-900" />
          <form action={signOut}>
            <button
              type="submit"
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-300 transition hover:bg-zinc-900"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
