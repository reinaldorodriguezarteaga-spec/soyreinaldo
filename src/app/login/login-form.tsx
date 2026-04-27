"use client";

import { useActionState } from "react";
import { signInWithMagicLink, type LoginState } from "./actions";

const initialState: LoginState = { status: "idle" };

export default function LoginForm({ redirect }: { redirect: string }) {
  const [state, formAction, isPending] = useActionState(
    signInWithMagicLink,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="redirect" value={redirect} />
      <label className="block">
        <span className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
          Email
        </span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="tu@email.com"
          disabled={isPending || state.status === "success"}
          className="block w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-base text-white placeholder:text-zinc-600 focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </label>

      <button
        type="submit"
        disabled={isPending || state.status === "success"}
        className="w-full rounded-xl bg-indigo-300 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending
          ? "Enviando..."
          : state.status === "success"
            ? "Email enviado"
            : "Recibir enlace de acceso"}
      </button>

      {state.status === "error" && state.message && (
        <p className="rounded-lg border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-200">
          {state.message}
        </p>
      )}

      {state.status === "success" && state.message && (
        <p className="rounded-lg border border-emerald-900/60 bg-emerald-950/40 p-3 text-sm text-emerald-200">
          {state.message}
          <br />
          <span className="text-xs text-emerald-300/70">
            Si no lo ves, revisa la carpeta de spam.
          </span>
        </p>
      )}
    </form>
  );
}
