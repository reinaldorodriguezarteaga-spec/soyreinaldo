"use client";

import { useActionState } from "react";
import { updateDisplayName, type ProfileState } from "./actions";

const initialState: ProfileState = { status: "idle" };

export default function ProfileForm({
  defaultName,
}: {
  defaultName: string;
}) {
  const [state, action, pending] = useActionState(
    updateDisplayName,
    initialState,
  );

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
          Nombre visible
        </span>
        <input
          type="text"
          name="display_name"
          defaultValue={defaultName}
          required
          minLength={2}
          maxLength={40}
          disabled={pending}
          className="block w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-base text-white focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <span className="mt-2 block text-xs text-zinc-500">
          Es como apareces en el ranking de la quiniela.
        </span>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-indigo-300 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Guardando..." : "Guardar"}
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
