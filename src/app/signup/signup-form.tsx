"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import OAuthButton from "@/components/OAuthButton";
import ContextWarning from "@/app/login/context-warning";
import { enviarSinBorrar } from "@/lib/enviar-sin-borrar";
import { signUp, type SignupState } from "./actions";

const initialState: SignupState = { status: "idle" };

export default function SignupForm({
  redirect = "/quiniela",
  inApp = false,
}: {
  redirect?: string;
  inApp?: boolean;
}) {
  const [state, action, pending] = useActionState(signUp, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  // Con un error de un campo concreto, el cursor va a ese campo.
  useEffect(() => {
    if (state.status !== "error" || !state.field) return;
    const el = formRef.current?.elements.namedItem(state.field);
    if (el instanceof HTMLInputElement) el.focus();
  }, [state]);
  const err = (name: string) =>
    state.status === "error" && state.field === name ? state.message : undefined;
  const loginHref =
    redirect === "/quiniela"
      ? "/login"
      : `/login?redirect=${encodeURIComponent(redirect)}`;

  return (
    <div>
      {!inApp && (
        <>
          <ContextWarning />
          <div className="oauth">
            <OAuthButton
              provider="google"
              redirect={redirect}
              label="Registrarme con Google"
            />
          </div>
          <div className="divider">o con tu email</div>
        </>
      )}

      <form ref={formRef} onSubmit={enviarSinBorrar(action)}>
        <input type="hidden" name="redirect" value={redirect} />
        <Field label="Nombre" name="display_name" error={err("display_name")} type="text" placeholder="Cómo apareces en el ranking" autoComplete="nickname" disabled={pending} />
        <Field label="Usuario" name="username" error={err("username")} type="text" placeholder="reinaldor" autoComplete="username" disabled={pending} hint="3-15 caracteres. Solo letras, números, _ - ." />
        <Field label="Email" name="email" error={err("email")} type="email" placeholder="tu@email.com" autoComplete="email" disabled={pending} />
        <Field label="Teléfono (opcional)" name="phone_number" error={err("phone_number")} type="tel" placeholder="+34666123456" autoComplete="tel" disabled={pending} required={false} hint="Para recordatorios. Formato internacional con +." />
        <Field label="Contraseña" name="password" error={err("password")} type="password" placeholder="Mínimo 6 caracteres" autoComplete="new-password" disabled={pending} />
        <Field label="Confirmar contraseña" name="confirm" error={err("confirm")} type="password" placeholder="Repite tu contraseña" autoComplete="new-password" disabled={pending} />

        <button
          type="submit"
          disabled={pending || state.status === "success"}
          className="btn btn--accent w-full justify-center"
        >
          {pending
            ? "Creando cuenta…"
            : state.status === "success"
              ? "Email enviado"
              : "Crear cuenta"}
        </button>

        {state.status === "error" && state.message && !state.field && (
          <p
            style={{
              marginTop: 12,
              padding: "12px 14px",
              borderRadius: "var(--radius)",
              border: "1px solid rgba(255,77,77,0.4)",
              background: "rgba(255,77,77,0.12)",
              color: "#ffb4b4",
              fontSize: "0.85rem",
            }}
          >
            {state.message}
          </p>
        )}
        {state.status === "success" && state.message && (
          <p
            style={{
              marginTop: 12,
              padding: "12px 14px",
              borderRadius: "var(--radius)",
              border:
                "1px solid color-mix(in oklch, var(--accent) 40%, transparent)",
              background: "color-mix(in oklch, var(--accent) 12%, transparent)",
              color: "var(--text)",
              fontSize: "0.88rem",
              lineHeight: 1.5,
            }}
          >
            {state.message}
            <br />
            <span style={{ color: "var(--text-dim)", fontSize: "0.78rem" }}>
              Si no lo ves, revisa la carpeta de spam.
            </span>
          </p>
        )}

        <p className="auth__foot">
          ¿Ya tienes cuenta? <Link href={loginHref}>Iniciar sesión</Link>
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
  required = true,
  hint,
  error,
}: {
  label: string;
  name: string;
  type: string;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
  required?: boolean;
  hint?: string;
  /** Mensaje de error de este campo: lo marca en rojo y lo explica debajo. */
  error?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        className="field"
        type={type}
        name={name}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        style={
          error
            ? { marginBottom: 4, borderColor: "#ff4d4d" }
            : hint
              ? { marginBottom: 4 }
              : undefined
        }
      />
      {error && (
        <p
          id={`${name}-error`}
          role="alert"
          style={{ margin: "0 0 12px", fontSize: "0.78rem", color: "#ffb4b4" }}
        >
          {error}
        </p>
      )}
      {hint && !error && (
        <p style={{ margin: "0 0 12px", fontSize: "0.7rem", color: "var(--text-dim)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}
