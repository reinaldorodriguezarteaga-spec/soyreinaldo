"use client";

import { useActionState } from "react";
import { updateProfile, type ProfileState } from "./actions";

const initialState: ProfileState = { status: "idle" };

export default function ProfileForm({
  defaultName,
  defaultUsername,
  defaultPhone,
}: {
  defaultName: string;
  defaultUsername: string;
  defaultPhone: string;
}) {
  const [state, action, pending] = useActionState(updateProfile, initialState);

  return (
    <form action={action} className="space-y-4">
      <Field
        label="Nombre visible"
        name="display_name"
        type="text"
        defaultValue={defaultName}
        required
        minLength={2}
        maxLength={40}
        disabled={pending}
        hint="Es como apareces en el ranking de la quiniela."
      />
      <Field
        label="Usuario"
        name="username"
        type="text"
        defaultValue={defaultUsername}
        required
        autoComplete="username"
        disabled={pending}
        hint="3-15 caracteres. Solo letras, números, guión, punto o barra baja. Sirve para entrar sin recordar el email."
      />
      <Field
        label="Teléfono"
        name="phone_number"
        type="tel"
        defaultValue={defaultPhone}
        required={false}
        autoComplete="tel"
        disabled={pending}
        hint="Opcional. Formato internacional con +, p. ej. +34666123456. Se usa solo para recordatorios."
      />

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

function Field({
  label,
  name,
  type,
  defaultValue,
  required = true,
  minLength,
  maxLength,
  autoComplete,
  disabled,
  hint,
}: {
  label: string;
  name: string;
  type: string;
  defaultValue?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  autoComplete?: string;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        autoComplete={autoComplete}
        disabled={disabled}
        className="block w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-base text-white focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-60"
      />
      {hint && (
        <span className="mt-2 block text-xs text-zinc-500">{hint}</span>
      )}
    </label>
  );
}
