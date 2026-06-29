"use client";

import { useActionState, useState } from "react";
import { deleteAccount, type DeleteState } from "./actions";

const initial: DeleteState = { status: "idle" };

/**
 * Borrado de cuenta self-service (requisito de App Store / Play Store).
 * Doble confirmación: casilla "lo entiendo" + escribir ELIMINAR.
 */
export default function DeleteAccount() {
  const [state, formAction, pending] = useActionState(deleteAccount, initial);
  const [understood, setUnderstood] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const canDelete = understood && confirmText.trim().toUpperCase() === "ELIMINAR";

  return (
    <form action={formAction} style={{ display: "grid", gap: 12 }}>
      <p className="sub" style={{ marginTop: 0 }}>
        Esto borra tu cuenta y todos tus datos (pronósticos, picks y pertenencia
        a ligas) de forma <strong>permanente</strong>. No se puede deshacer. Tus
        donaciones quedan registradas de forma anónima por motivos contables.
      </p>

      <label
        style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: "0.9rem" }}
      >
        <input
          type="checkbox"
          checked={understood}
          onChange={(e) => setUnderstood(e.target.checked)}
          style={{ marginTop: 3 }}
        />
        <span>Entiendo que es permanente y se borran todos mis datos.</span>
      </label>

      <label style={{ display: "grid", gap: 6, fontSize: "0.9rem" }}>
        <span>
          Escribe <strong>ELIMINAR</strong> para confirmar:
        </span>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          placeholder="ELIMINAR"
          className="field"
          style={{ maxWidth: 220 }}
        />
      </label>

      <button
        type="submit"
        className="btn"
        disabled={!canDelete || pending}
        style={{
          background: canDelete ? "#a3261f" : "var(--surface)",
          borderColor: "#a3261f",
          color: canDelete ? "#fff" : "var(--text-dim)",
          opacity: canDelete ? 1 : 0.6,
          justifySelf: "start",
        }}
      >
        {pending ? "Eliminando…" : "Eliminar mi cuenta"}
      </button>

      {state.status === "error" && (
        <p style={{ color: "#ff8088", fontSize: "0.9rem", margin: 0 }}>
          {state.message}
        </p>
      )}
    </form>
  );
}
