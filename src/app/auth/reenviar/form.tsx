"use client";

import Link from "next/link";
import { useActionState } from "react";
import { enviarSinBorrar } from "@/lib/enviar-sin-borrar";
import { reenviarConfirmacion, type ReenviarState } from "./actions";

const initial: ReenviarState = { status: "idle" };

export default function ReenviarForm() {
  const [state, action, pending] = useActionState(reenviarConfirmacion, initial);
  const ok = state.status === "enviado" || state.status === "confirmada";

  return (
    <form onSubmit={enviarSinBorrar(action)}>
      <label className="label" htmlFor="reenviar-email">
        Email
      </label>
      <input
        id="reenviar-email"
        className="field"
        type="email"
        name="email"
        required
        autoComplete="email"
        placeholder="tu@email.com"
        disabled={pending}
      />
      <button
        type="submit"
        disabled={pending || state.status === "enviado"}
        className="btn btn--accent w-full justify-center"
      >
        {pending ? "Enviando…" : state.status === "enviado" ? "Correo enviado" : "Enviarme un enlace nuevo"}
      </button>

      {state.message && (
        <p
          role="status"
          style={{
            marginTop: 12,
            padding: "12px 14px",
            borderRadius: "var(--radius)",
            fontSize: "0.88rem",
            lineHeight: 1.5,
            ...(ok
              ? {
                  border: "1px solid color-mix(in oklch, var(--accent) 40%, transparent)",
                  background: "color-mix(in oklch, var(--accent) 12%, transparent)",
                  color: "var(--text)",
                }
              : {
                  border: "1px solid rgba(255,77,77,0.4)",
                  background: "rgba(255,77,77,0.12)",
                  color: "#ffb4b4",
                }),
          }}
        >
          {state.message}
          {state.status === "enviado" && (
            <>
              <br />
              <span style={{ color: "var(--text-dim)", fontSize: "0.78rem" }}>
                Si no lo ves, revisa la carpeta de spam.
              </span>
            </>
          )}
        </p>
      )}

      {state.status === "confirmada" && (
        <Link href="/login" className="btn btn--accent w-full justify-center" style={{ marginTop: 12 }}>
          Iniciar sesión
        </Link>
      )}
      {state.status === "sin_cuenta" && (
        <Link href="/signup" className="btn btn--ghost w-full justify-center" style={{ marginTop: 12 }}>
          Crear cuenta
        </Link>
      )}

      <p className="auth__foot">
        ¿Ya confirmaste? <Link href="/login">Iniciar sesión</Link>
      </p>
    </form>
  );
}
