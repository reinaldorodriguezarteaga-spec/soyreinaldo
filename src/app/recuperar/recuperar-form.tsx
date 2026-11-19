"use client";

import { useActionState } from "react";
import { enviarSinBorrar } from "@/lib/enviar-sin-borrar";
import { sendPasswordReset, type AuthState } from "../login/actions";

const inicial: AuthState = { status: "idle" };

export default function RecuperarForm() {
  const [estado, accion, enviando] = useActionState(sendPasswordReset, inicial);
  const enviado = estado.status === "success";

  return (
    <form onSubmit={enviarSinBorrar(accion)}>
      <label className="label">Email</label>
      <input
        className="field"
        type="email"
        name="email"
        required
        autoComplete="email"
        placeholder="tu@email.com"
        disabled={enviando || enviado}
      />
      <button
        type="submit"
        disabled={enviando || enviado}
        className="btn btn--accent w-full justify-center"
      >
        {enviando ? "Enviando…" : enviado ? "Email enviado" : "Enviar enlace"}
      </button>
      {estado.status === "error" && estado.message && (
        <p className="notice notice--err" style={{ marginTop: 12 }}>{estado.message}</p>
      )}
      {enviado && estado.message && (
        <p className="notice notice--ok" style={{ marginTop: 12 }}>
          {estado.message} Si no lo ves, revisa la carpeta de spam.
        </p>
      )}
    </form>
  );
}
