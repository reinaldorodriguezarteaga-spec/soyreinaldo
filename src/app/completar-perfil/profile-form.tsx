"use client";

import { useActionState } from "react";
import {
  completeProfile,
  type CompleteProfileState,
} from "./actions";

const initial: CompleteProfileState = { status: "idle" };

export default function ProfileForm({
  currentUsername,
  currentPhone,
  currentWantsReminders,
}: {
  currentUsername: string | null;
  currentPhone: string | null;
  currentWantsReminders: boolean;
}) {
  const [state, action, pending] = useActionState(completeProfile, initial);

  return (
    <form action={action} className="space-y-5">
      <Field
        label="Usuario"
        name="username"
        type="text"
        defaultValue={currentUsername ?? ""}
        placeholder="reinaldor"
        autoComplete="username"
        disabled={pending}
        hint="3-15 caracteres. Solo letras, números, _ - ."
      />
      <Field
        label="Teléfono"
        name="phone_number"
        type="tel"
        defaultValue={currentPhone ?? ""}
        placeholder="+34666123456"
        autoComplete="tel"
        disabled={pending}
        hint="Formato internacional con + y el prefijo del país. Para recordatorios."
      />

      <label className="checkrow">
        <input
          type="checkbox"
          name="wants_reminders"
          defaultChecked={currentWantsReminders}
          disabled={pending}
        />
        <span style={{ flex: 1 }}>
          <b>Quiero recibir recordatorios por email</b>
          <span className="h">
            La noche anterior te aviso de los partidos sin predecir. Los
            domingos un resumen de la semana.
          </span>
        </span>
      </label>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn btn--accent">
          {pending ? "Guardando…" : "Guardar"}
        </button>
        {state.status === "error" && state.message && (
          <span style={{ color: "#ffb4b4", fontSize: "0.88rem" }}>
            {state.message}
          </span>
        )}
        {state.status === "success" && state.message && (
          <span style={{ color: "var(--accent)", fontSize: "0.88rem" }}>
            ✓ {state.message}
          </span>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type,
  defaultValue,
  placeholder,
  autoComplete,
  disabled,
  hint,
}: {
  label: string;
  name: string;
  type: string;
  defaultValue?: string;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        className="field"
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        style={{ marginBottom: 0 }}
      />
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}
