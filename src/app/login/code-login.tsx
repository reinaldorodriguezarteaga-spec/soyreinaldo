"use client";

import { useActionState, useState } from "react";
import { sendEmailCode, verifyEmailCode, type AuthState } from "./actions";

const initial: AuthState = { status: "idle" };

/**
 * Login por CÓDIGO de 6 dígitos (para la app). Paso 1: email → enviamos el
 * código. Paso 2: escribir el código → entrar. Evita el enlace mágico, que en
 * la app se abriría en Safari y no en el webview. Sirve también para usuarios
 * que se registraron con Google (misma cuenta por email).
 */
export default function CodeLogin({ redirect }: { redirect: string }) {
  const [email, setEmail] = useState("");
  const [sendState, sendAction, sending] = useActionState(
    sendEmailCode,
    initial,
  );
  const [verifyState, verifyAction, verifying] = useActionState(
    verifyEmailCode,
    initial,
  );

  const codeStep = sendState.status === "success";

  if (!codeStep) {
    return (
      <form action={sendAction}>
        <input type="hidden" name="redirect" value={redirect} />
        <label className="label" htmlFor="code-email">
          Tu email
        </label>
        <input
          id="code-email"
          className="field"
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          autoComplete="email"
          required
          disabled={sending}
        />
        <button
          type="submit"
          className="btn btn--accent"
          style={{ marginTop: 12, width: "100%" }}
          disabled={sending}
        >
          {sending ? "Enviando…" : "Enviarme un código"}
        </button>
        {sendState.status === "error" && (
          <p style={{ color: "#ff8088", fontSize: "0.9rem", marginTop: 10 }}>
            {sendState.message}
          </p>
        )}
      </form>
    );
  }

  return (
    <form action={verifyAction}>
      <input type="hidden" name="redirect" value={redirect} />
      <input type="hidden" name="email" value={email} />
      <p className="sub" style={{ marginTop: 0 }}>
        Te envié un código a <strong>{email}</strong>. Escríbelo aquí (revisa
        también spam).
      </p>
      <label className="label" htmlFor="code-token">
        Código
      </label>
      <input
        id="code-token"
        className="field"
        type="text"
        name="token"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={10}
        placeholder="Código del email"
        required
        disabled={verifying}
        style={{ letterSpacing: "0.2em", fontSize: "1.1rem" }}
      />
      <button
        type="submit"
        className="btn btn--accent"
        style={{ marginTop: 12, width: "100%" }}
        disabled={verifying}
      >
        {verifying ? "Entrando…" : "Entrar"}
      </button>
      {verifyState.status === "error" && (
        <p style={{ color: "#ff8088", fontSize: "0.9rem", marginTop: 10 }}>
          {verifyState.message}
        </p>
      )}
    </form>
  );
}
