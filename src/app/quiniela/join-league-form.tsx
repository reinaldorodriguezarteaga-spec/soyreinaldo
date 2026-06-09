"use client";

import { useActionState } from "react";
import { joinLeague, type JoinLeagueState } from "./actions";

const initialState: JoinLeagueState = { status: "idle" };

export default function JoinLeagueForm() {
  const [state, action, pending] = useActionState(joinLeague, initialState);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label">Código de acceso</label>
        <input
          type="text"
          name="code"
          required
          autoComplete="off"
          autoCapitalize="characters"
          placeholder="REINALDO-FAM"
          disabled={pending}
          className="field"
          style={{
            marginBottom: 0,
            fontFamily: "var(--font-mono-stack)",
            textTransform: "uppercase",
          }}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="btn btn--accent w-full justify-center"
      >
        {pending ? "Entrando…" : "Entrar a la liga"}
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
