"use client";

import { useActionState, useRef } from "react";
import { updatePassword, type PasswordState } from "./actions";

const initialState: PasswordState = { status: "idle" };

export default function PasswordForm({
  hasPassword,
}: {
  hasPassword: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(async (
    prev: PasswordState,
    formData: FormData,
  ) => {
    const result = await updatePassword(prev, formData);
    if (result.status === "success") formRef.current?.reset();
    return result;
  }, initialState);

  const heading = hasPassword
    ? "Cambiar contraseña"
    : "Establecer contraseña";
  const helper = hasPassword
    ? "Cambia tu contraseña en cualquier momento."
    : "Si quieres entrar con email y contraseña en lugar del enlace mágico, ponle una aquí.";

  return (
    <div>
      <h2 className="text-base font-semibold">{heading}</h2>
      <p className="mt-1 text-sm text-zinc-400">{helper}</p>

      <form ref={formRef} action={action} className="mt-5 space-y-4">
        <Field
          label="Nueva contraseña"
          name="password"
          autoComplete="new-password"
          disabled={pending}
        />
        <Field
          label="Confirmar contraseña"
          name="confirm"
          autoComplete="new-password"
          disabled={pending}
        />

        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-indigo-300 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending
            ? "Guardando..."
            : hasPassword
              ? "Cambiar contraseña"
              : "Establecer contraseña"}
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
    </div>
  );
}

function Field({
  label,
  name,
  autoComplete,
  disabled,
}: {
  label: string;
  name: string;
  autoComplete?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </span>
      <input
        type="password"
        name={name}
        required
        minLength={6}
        autoComplete={autoComplete}
        placeholder="Mínimo 6 caracteres"
        disabled={disabled}
        className="block w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-base text-white placeholder:text-zinc-600 focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-60"
      />
    </label>
  );
}
