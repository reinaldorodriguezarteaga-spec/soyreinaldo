"use client";

import { useActionState, useEffect, useRef } from "react";
import { addAdjustment, type AdjustmentState } from "../actions";

const initial: AdjustmentState = { status: "idle" };

export default function AddAdjustmentForm({
  leagueId,
  members,
}: {
  leagueId: string;
  members: { user_id: string; display_name: string }[];
}) {
  const [state, action, pending] = useActionState(addAdjustment, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state.status]);

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <input type="hidden" name="league_id" value={leagueId} />
      <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
            Usuario
          </span>
          <select
            name="user_id"
            required
            disabled={pending || members.length === 0}
            defaultValue=""
            className="block h-[42px] w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-white focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="" disabled>
              {members.length === 0 ? "Sin miembros aún" : "Elige un miembro"}
            </option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.display_name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
            Puntos
          </span>
          <input
            type="number"
            name="delta"
            required
            placeholder="-5"
            disabled={pending}
            className="block h-[42px] w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-white tabular-nums focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
          Motivo
        </span>
        <input
          type="text"
          name="reason"
          required
          placeholder="Ej. Spam en el grupo de WhatsApp"
          disabled={pending}
          className="block w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </label>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || members.length === 0}
          className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:border-indigo-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Aplicando..." : "Aplicar ajuste"}
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
