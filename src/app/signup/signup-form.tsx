"use client";

import Link from "next/link";
import { useActionState } from "react";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { signUp, type SignupState } from "./actions";

const initialState: SignupState = { status: "idle" };

export default function SignupForm() {
  const [state, action, pending] = useActionState(signUp, initialState);

  return (
    <div className="space-y-5">
      <GoogleSignInButton redirect="/quiniela" label="Registrarme con Google" />

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-zinc-800" />
        <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">
          o con email
        </span>
        <div className="h-px flex-1 bg-zinc-800" />
      </div>

      <form action={action} className="space-y-4">
      <Field
        label="Nombre"
        name="display_name"
        type="text"
        placeholder="Cómo apareces en el ranking"
        autoComplete="nickname"
        disabled={pending}
      />
      <Field
        label="Email"
        name="email"
        type="email"
        placeholder="tu@email.com"
        autoComplete="email"
        disabled={pending}
      />
      <Field
        label="Contraseña"
        name="password"
        type="password"
        placeholder="Mínimo 6 caracteres"
        autoComplete="new-password"
        disabled={pending}
      />
      <Field
        label="Confirmar contraseña"
        name="confirm"
        type="password"
        placeholder="Repite tu contraseña"
        autoComplete="new-password"
        disabled={pending}
      />

      <button
        type="submit"
        disabled={pending || state.status === "success"}
        className="w-full rounded-xl bg-indigo-300 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending
          ? "Creando cuenta..."
          : state.status === "success"
            ? "Email enviado"
            : "Crear cuenta"}
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

        <p className="text-center text-sm text-zinc-400">
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/login"
            className="font-medium text-indigo-300 hover:text-indigo-200"
          >
            Iniciar sesión
          </Link>
        </p>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type,
  placeholder,
  autoComplete,
  disabled,
}: {
  label: string;
  name: string;
  type: string;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </span>
      <input
        type={type}
        name={name}
        required
        autoComplete={autoComplete}
        placeholder={placeholder}
        disabled={disabled}
        className="block w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-base text-white placeholder:text-zinc-600 focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-60"
      />
    </label>
  );
}
