"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import OAuthButton from "@/components/OAuthButton";
import ContextWarning from "./context-warning";
import {
  signInWithMagicLink,
  signInWithPassword,
  type AuthState,
} from "./actions";

const initialState: AuthState = { status: "idle" };

type Tab = "password" | "magic";

export default function LoginForm({
  redirect,
  inApp = false,
}: {
  redirect: string;
  inApp?: boolean;
}) {
  const [tab, setTab] = useState<Tab>("password");
  const [pwState, pwAction, pwPending] = useActionState(
    signInWithPassword,
    initialState,
  );
  const [mlState, mlAction, mlPending] = useActionState(
    signInWithMagicLink,
    initialState,
  );

  const signupHref =
    redirect === "/quiniela"
      ? "/signup"
      : `/signup?redirect=${encodeURIComponent(redirect)}`;

  return (
    <div>
      {!inApp && (
        <>
          <ContextWarning />
          <div className="oauth">
            <OAuthButton provider="google" redirect={redirect} />
          </div>
          <div className="divider">o con tu email</div>
        </>
      )}

      <div className="tabs" style={{ marginBottom: 18 }}>
        <button
          type="button"
          className={tab === "password" ? "on" : ""}
          onClick={() => setTab("password")}
        >
          Email y contraseña
        </button>
        <button
          type="button"
          className={tab === "magic" ? "on" : ""}
          onClick={() => setTab("magic")}
        >
          Enlace mágico
        </button>
      </div>

      {tab === "password" ? (
        <form action={pwAction}>
          <input type="hidden" name="redirect" value={redirect} />
          <label className="label">Email o usuario</label>
          <input
            className="field"
            type="text"
            name="identifier"
            required
            autoComplete="username"
            placeholder="tu@email.com  o  reinaldor"
            disabled={pwPending}
          />
          <label className="label">Contraseña</label>
          <input
            className="field"
            type="password"
            name="password"
            required
            autoComplete="current-password"
            placeholder="Mínimo 6 caracteres"
            disabled={pwPending}
          />
          <button
            type="submit"
            disabled={pwPending}
            className="btn btn--accent w-full justify-center"
          >
            {pwPending ? "Entrando…" : "Iniciar sesión"}
          </button>
          {pwState.status === "error" && pwState.message && (
            <ErrorBox message={pwState.message} />
          )}
        </form>
      ) : (
        <form action={mlAction}>
          <input type="hidden" name="redirect" value={redirect} />
          <label className="label">Email</label>
          <input
            className="field"
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="tu@email.com"
            disabled={mlPending || mlState.status === "success"}
          />
          <button
            type="submit"
            disabled={mlPending || mlState.status === "success"}
            className="btn btn--accent w-full justify-center"
          >
            {mlPending
              ? "Enviando…"
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

      <p className="auth__foot">
        ¿Aún no tienes cuenta?{" "}
        <Link href={signupHref}>Regístrate gratis</Link>
      </p>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <p
      className="mono"
      style={{
        marginTop: 12,
        padding: "12px 14px",
        borderRadius: "var(--radius)",
        border: "1px solid rgba(255,77,77,0.4)",
        background: "rgba(255,77,77,0.12)",
        color: "#ffb4b4",
        letterSpacing: "0.04em",
        textTransform: "none",
        fontSize: "0.82rem",
      }}
    >
      {message}
    </p>
  );
}

function SuccessBox({ message }: { message: string }) {
  return (
    <p
      style={{
        marginTop: 12,
        padding: "12px 14px",
        borderRadius: "var(--radius)",
        border: "1px solid color-mix(in oklch, var(--accent) 40%, transparent)",
        background: "color-mix(in oklch, var(--accent) 12%, transparent)",
        color: "var(--text)",
        fontSize: "0.88rem",
        lineHeight: 1.5,
      }}
    >
      {message}
      <br />
      <span style={{ color: "var(--text-dim)", fontSize: "0.78rem" }}>
        Si no lo ves, revisa la carpeta de spam.
      </span>
    </p>
  );
}
