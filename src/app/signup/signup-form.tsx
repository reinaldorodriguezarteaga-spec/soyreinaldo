"use client";

import Link from "next/link";
import { useActionState } from "react";
import OAuthButton from "@/components/OAuthButton";
import ContextWarning from "@/app/login/context-warning";
import { signUp, type SignupState } from "./actions";

const initialState: SignupState = { status: "idle" };

export default function SignupForm({
  redirect = "/quiniela",
}: {
  redirect?: string;
}) {
  const [state, action, pending] = useActionState(signUp, initialState);
  const loginHref =
    redirect === "/quiniela"
      ? "/login"
      : `/login?redirect=${encodeURIComponent(redirect)}`;

  return (
    <div>
      <ContextWarning />
      <div className="oauth">
        <OAuthButton
          provider="google"
          redirect={redirect}
          label="Registrarme con Google"
        />
      </div>

      <div className="divider">o con tu email</div>

      <form action={action}>
        <input type="hidden" name="redirect" value={redirect} />
        <Field label="Nombre" name="display_name" type="text" placeholder="Cómo apareces en el ranking" autoComplete="nickname" disabled={pending} />
        <Field label="Usuario" name="username" type="text" placeholder="reinaldor" autoComplete="username" disabled={pending} hint="3-15 caracteres. Solo letras, números, _ - ." />
        <Field label="Email" name="email" type="email" placeholder="tu@email.com" autoComplete="email" disabled={pending} />
        <Field label="Teléfono (opcional)" name="phone_number" type="tel" placeholder="+34666123456" autoComplete="tel" disabled={pending} required={false} hint="Para recordatorios. Formato internacional con +." />
        <Field label="Contraseña" name="password" type="password" placeholder="Mínimo 6 caracteres" autoComplete="new-password" disabled={pending} />
        <Field label="Confirmar contraseña" name="confirm" type="password" placeholder="Repite tu contraseña" autoComplete="new-password" disabled={pending} />

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

        {state.status === "error" && state.message && (
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
}: {
  label: string;
  name: string;
  type: string;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
  required?: boolean;
  hint?: string;
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
        style={hint ? { marginBottom: 4 } : undefined}
      />
      {hint && (
        <p style={{ margin: "0 0 12px", fontSize: "0.7rem", color: "var(--text-dim)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}
