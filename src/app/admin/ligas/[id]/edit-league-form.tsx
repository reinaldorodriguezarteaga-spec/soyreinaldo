"use client";

import { useActionState } from "react";
import { updateLeague, type UpdateLeagueState } from "../actions";

const initial: UpdateLeagueState = { status: "idle" };

export default function EditLeagueForm({
  league,
}: {
  league: {
    id: string;
    name: string;
    code: string;
    description: string | null;
  };
}) {
  const [state, action, pending] = useActionState(updateLeague, initial);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={league.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Nombre"
          name="name"
          defaultValue={league.name}
          disabled={pending}
        />
        <Field
          label="Código"
          name="code"
          defaultValue={league.code}
          disabled={pending}
          mono
        />
      </div>
      <Field
        label="Descripción"
        name="description"
        defaultValue={league.description ?? ""}
        disabled={pending}
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-indigo-300 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Guardando..." : "Guardar cambios"}
        </button>
        {state.status === "error" && state.message && (
          <span className="text-sm text-red-300">{state.message}</span>
        )}
        {state.status === "success" && state.message && (
          <span className="text-sm text-emerald-300">{state.message}</span>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  disabled,
  mono,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  disabled?: boolean;
  mono?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </span>
      <input
        type="text"
        name={name}
        defaultValue={defaultValue}
        disabled={disabled}
        className={`block w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-60 ${mono ? "font-mono uppercase" : ""}`}
      />
    </label>
  );
}
