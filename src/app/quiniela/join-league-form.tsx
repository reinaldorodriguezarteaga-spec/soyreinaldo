"use client";

import { useActionState } from "react";
import { joinLeague, type JoinLeagueState } from "./actions";

const initialState: JoinLeagueState = { status: "idle" };

export default function JoinLeagueForm() {
  const [state, action, pending] = useActionState(joinLeague, initialState);

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
          Código de acceso
        </span>
        <input
          type="text"
          name="code"
          required
          autoComplete="off"
          autoCapitalize="characters"
          placeholder="REINALDO-FAM"
          disabled={pending}
          className="block w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-base font-mono uppercase text-white placeholder:text-zinc-700 focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-indigo-300 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Entrando..." : "Entrar a la liga"}
      </button>

      {state.status === "error" && state.message && (
        <p className="rounded-lg border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-200">
          {state.message}
        </p>
      )}
      {state.status === "success" && state.message && (
        <p className="rounded-lg border border-emerald-900/60 bg-emerald-950/40 p-3 text-sm text-emerald-200">
          {state.message}
        </p>
      )}
    </form>
  );
}
