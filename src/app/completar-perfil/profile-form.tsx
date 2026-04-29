"use client";

import { useActionState } from "react";
import {
  completeProfile,
  type CompleteProfileState,
} from "./actions";

const initial: CompleteProfileState = { status: "idle" };

export default function ProfileForm({
  currentUsername,
  currentPhone,
}: {
  currentUsername: string | null;
  currentPhone: string | null;
}) {
  const [state, action, pending] = useActionState(completeProfile, initial);

  return (
    <form action={action} className="space-y-5">
      <Field
        label="Usuario"
        name="username"
        type="text"
        defaultValue={currentUsername ?? ""}
        placeholder="reinaldor"
        autoComplete="username"
        disabled={pending}
        hint="3-15 caracteres. Solo letras, números, _ - ."
      />
      <Field
        label="Teléfono"
        name="phone_number"
        type="tel"
        defaultValue={currentPhone ?? ""}
        placeholder="+34666123456"
        autoComplete="tel"
        disabled={pending}
        hint="Formato internacional con + y el prefijo del país. Para recordatorios."
      />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-indigo-300 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Guardando..." : "Guardar"}
        </button>
        {state.status === "error" && state.message && (
          <span className="text-sm text-red-300">{state.message}</span>
        )}
        {state.status === "success" && state.message && (
          <span className="text-sm text-emerald-300">✓ {state.message}</span>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type,
  defaultValue,
  placeholder,
  autoComplete,
  disabled,
  hint,
}: {
  label: string;
  name: string;
  type: string;
  defaultValue?: string;
  placeholder?: string;
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
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        className="block w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-base text-white placeholder:text-zinc-600 focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-60"
      />
      {hint && <p className="mt-1.5 text-[11px] text-zinc-500">{hint}</p>}
    </label>
  );
}
