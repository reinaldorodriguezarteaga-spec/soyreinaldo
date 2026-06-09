"use client";

import { useActionState } from "react";
import { updateEmail, type EmailState } from "./actions";

const initialState: EmailState = { status: "idle" };

export default function EmailForm({ currentEmail }: { currentEmail: string }) {
  const [state, action, pending] = useActionState(updateEmail, initialState);
  const succeeded = state.status === "success";

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label">Email actual</label>
        <p style={{ fontWeight: 600 }}>{currentEmail}</p>
      </div>

      <div>
        <label className="label">Nuevo email</label>
        <input
          className="field"
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="nuevo@email.com"
          disabled={pending || succeeded}
          style={{ marginBottom: 0 }}
        />
        <span className="hint">
          Te enviaremos un enlace de confirmación a la nueva dirección. Hasta
          que pulses el enlace seguirás entrando con el email actual.
        </span>
      </div>

      <button
        type="submit"
        disabled={pending || succeeded}
        className="btn btn--accent"
      >
        {pending ? "Enviando…" : succeeded ? "Email enviado" : "Cambiar email"}
      </button>

      {state.status === "error" && state.message && (
        <p className="notice notice--err">{state.message}</p>
      )}
      {state.status === "success" && state.message && (
        <p className="notice notice--ok">{state.message}</p>
      )}
    </form>
  );
}
