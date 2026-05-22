"use client";

import { useState } from "react";
import { joinLeagueByCode } from "./actions";

type Props = {
  league: {
    id: string;
    name: string;
    description: string | null;
    memberCount: number;
  };
};

/**
 * Card de liga privada: muestra nombre + badge "Privada" + botón.
 * Al pulsar el botón, el botón se reemplaza por un input para el código y
 * un botón "Entrar". Se hace submit a `joinLeagueByCode`, que si el código
 * es correcto une al usuario y redirige al ranking.
 */
export default function PrivateLeagueCard({ league }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-500/5 via-zinc-950 to-zinc-950 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold sm:text-lg">{league.name}</h3>
          <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-red-300">
            Privada
          </span>
        </div>
        {league.description && (
          <p className="mt-1 text-sm leading-relaxed text-zinc-400">
            {league.description}
          </p>
        )}
        <p className="mt-1 text-xs text-zinc-500">
          {league.memberCount}{" "}
          {league.memberCount === 1 ? "miembro" : "miembros"} ya dentro
        </p>
      </div>

      <div className="shrink-0">
        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-3 text-sm font-semibold text-zinc-200 transition hover:border-red-400/40 hover:text-white sm:w-auto"
          >
            Unirme
          </button>
        ) : (
          <form
            action={joinLeagueByCode}
            className="flex flex-col gap-2 sm:flex-row sm:items-center"
          >
            <input
              type="text"
              name="code"
              required
              minLength={4}
              maxLength={40}
              autoComplete="off"
              autoCapitalize="characters"
              autoFocus
              placeholder="CÓDIGO"
              className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 font-mono text-sm uppercase tracking-wider text-white placeholder:text-zinc-600 focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400 sm:w-40"
            />
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="rounded-xl bg-indigo-300 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-indigo-200"
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs text-zinc-500 transition hover:text-zinc-300"
                title="Cancelar"
              >
                ✕
              </button>
            </div>
          </form>
        )}
      </div>
    </article>
  );
}
