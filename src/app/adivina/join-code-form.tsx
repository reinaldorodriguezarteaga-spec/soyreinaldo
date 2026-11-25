"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Entrar a una quiniela privada con su código. Reutiliza el flujo de
 * invitación de /unirse/[code], que ya enseña la liga antes de entrar. */
export default function JoinCodeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const clean = code.trim().toUpperCase();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (clean.length < 3) return;
        router.push(`/unirse/${encodeURIComponent(clean)}`);
      }}
      style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
    >
      <input
        className="field"
        name="code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="CÓDIGO"
        aria-label="Código de invitación"
        autoCapitalize="characters"
        autoComplete="off"
        style={{ flex: "1 1 180px", minWidth: 0, fontFamily: "var(--font-mono-stack)" }}
      />
      <button type="submit" className="btn btn--accent" disabled={clean.length < 3}>
        Entrar <span className="arr">→</span>
      </button>
    </form>
  );
}
