"use client";

import { useActionState, useRef } from "react";
import { updatePassword, type PasswordState } from "./actions";

const initialState: PasswordState = { status: "idle" };

export default function PasswordForm({
  hasPassword,
}: {
  hasPassword: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(async (
    prev: PasswordState,
    formData: FormData,
  ) => {
    const result = await updatePassword(prev, formData);
    if (result.status === "success") formRef.current?.reset();
    return result;
  }, initialState);

  const heading = hasPassword
    ? "Cambiar contraseña"
    : "Establecer contraseña";
  const helper = hasPassword
    ? "Cambia tu contraseña en cualquier momento."
    : "Si quieres entrar con email y contraseña en lugar del enlace mágico, ponle una aquí.";

  return (
    <div>
      <h2>{heading}</h2>
      <p className="sub">{helper}</p>

      <form ref={formRef} action={action} className="space-y-4">
        <Field
          label="Nueva contraseña"
          name="password"
          autoComplete="new-password"
          disabled={pending}
        />
        <Field
          label="Confirmar contraseña"
          name="confirm"
          autoComplete="new-password"
          disabled={pending}
        />

        <button type="submit" disabled={pending} className="btn btn--accent">
          {pending
            ? "Guardando…"
            : hasPassword
              ? "Cambiar contraseña"
              : "Establecer contraseña"}
        </button>

        {state.status === "error" && state.message && (
          <p className="notice notice--err">{state.message}</p>
        )}
        {state.status === "success" && state.message && (
          <p className="notice notice--ok">{state.message}</p>
        )}
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  autoComplete,
  disabled,
}: {
  label: string;
  name: string;
  autoComplete?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        className="field"
        type="password"
        name={name}
        required
        minLength={6}
        autoComplete={autoComplete}
        placeholder="Mínimo 6 caracteres"
        disabled={disabled}
        style={{ marginBottom: 0 }}
      />
    </div>
  );
}
