"use client";

import { useActionState } from "react";
import { updateEmail, type EmailState } from "./actions";

const initialState: EmailState = { status: "idle" };

export default function EmailForm({ currentEmail }: { currentEmail: string }) {
  const [state, action, pending] = useActionState(updateEmail, initialState);
  const succeeded = state.status === "success";

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
          Email actual
        </span>
        <p className="text-base font-medium text-zinc-200">{currentEmail}</p>
      </label>

      <label className="block">
        <span className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
          Nuevo email
        </span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="nuevo@email.com"
          disabled={pending || succeeded}
          className="block w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-base text-white focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <span className="mt-2 block text-xs text-zinc-500">
          Te enviaremos un enlace de confirmación a la nueva dirección. Hasta
          que pulses el enlace seguirás entrando con el email actual.
        </span>
      </label>

      <button
        type="submit"
        disabled={pending || succeeded}
        className="rounded-xl bg-indigo-300 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Enviando..." : succeeded ? "Email enviado" : "Cambiar email"}
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
