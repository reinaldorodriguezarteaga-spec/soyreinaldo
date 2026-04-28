"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import OAuthButton from "@/components/OAuthButton";
import {
  signInWithMagicLink,
  signInWithPassword,
  type AuthState,
} from "./actions";

const initialState: AuthState = { status: "idle" };

type Tab = "password" | "magic";

export default function LoginForm({ redirect }: { redirect: string }) {
  const [tab, setTab] = useState<Tab>("password");
  const [pwState, pwAction, pwPending] = useActionState(
    signInWithPassword,
    initialState,
  );
  const [mlState, mlAction, mlPending] = useActionState(
    signInWithMagicLink,
    initialState,
  );

  return (
    <div className="space-y-5">
      <OAuthButton provider="google" redirect={redirect} />
      {/* Facebook OAuth disabled until business/individual verification is approved.
          Keep <OAuthButton provider="facebook" /> ready to re-enable. */}

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-zinc-800" />
        <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">
          o con email
        </span>
        <div className="h-px flex-1 bg-zinc-800" />
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-xl border border-zinc-800 bg-zinc-950 p-1">
        <button
          type="button"
          onClick={() => setTab("password")}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
            tab === "password"
              ? "bg-zinc-800 text-white"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Email y contraseña
        </button>
        <button
          type="button"
          onClick={() => setTab("magic")}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
            tab === "magic"
              ? "bg-zinc-800 text-white"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Enlace mágico
        </button>
      </div>

      {tab === "password" ? (
        <form action={pwAction} className="space-y-4">
          <input type="hidden" name="redirect" value={redirect} />
          <Field
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="tu@email.com"
            disabled={pwPending}
          />
          <Field
            label="Contraseña"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Mínimo 6 caracteres"
            disabled={pwPending}
          />
          <button
            type="submit"
            disabled={pwPending}
            className="w-full rounded-xl bg-indigo-300 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pwPending ? "Entrando..." : "Entrar"}
          </button>
          {pwState.status === "error" && pwState.message && (
            <ErrorBox message={pwState.message} />
          )}
          <p className="text-center text-sm text-zinc-400">
            ¿No tienes cuenta?{" "}
            <Link
              href="/signup"
              className="font-medium text-indigo-300 hover:text-indigo-200"
            >
              Crear cuenta
            </Link>
          </p>
        </form>
      ) : (
        <form action={mlAction} className="space-y-4">
          <input type="hidden" name="redirect" value={redirect} />
          <Field
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="tu@email.com"
            disabled={mlPending || mlState.status === "success"}
          />
          <button
            type="submit"
            disabled={mlPending || mlState.status === "success"}
            className="w-full rounded-xl bg-indigo-300 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {mlPending
              ? "Enviando..."
              : mlState.status === "success"
                ? "Email enviado"
                : "Recibir enlace de acceso"}
          </button>
          {mlState.status === "error" && mlState.message && (
            <ErrorBox message={mlState.message} />
          )}
          {mlState.status === "success" && mlState.message && (
            <SuccessBox message={mlState.message} />
          )}
        </form>
      )}
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

function ErrorBox({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-200">
      {message}
    </p>
  );
}

function SuccessBox({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-emerald-900/60 bg-emerald-950/40 p-3 text-sm text-emerald-200">
      {message}
      <br />
      <span className="text-xs text-emerald-300/70">
        Si no lo ves, revisa la carpeta de spam.
      </span>
    </p>
  );
}
