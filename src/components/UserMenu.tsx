"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/app/login/actions";
import type { User } from "@supabase/supabase-js";

export default function UserMenu({
  initialUser,
}: {
  initialUser: User | null;
}) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [open, setOpen] = useState(false);
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

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
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
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm transition hover:bg-zinc-900"
          >
            Perfil
          </Link>
          <Link
            href="/monedero"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm transition hover:bg-zinc-900"
          >
            Monedero
          </Link>
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
