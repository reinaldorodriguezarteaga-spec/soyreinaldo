"use client";

import { useRouter } from "next/navigation";

type Team = { id: number; name: string };

/**
 * Dos selectores de selección; al cambiar cualquiera, navega a
 * /mundial/comparar?a=ID&b=ID y el server vuelve a pintar la comparación.
 */
export default function TeamPicker({
  teams,
  a,
  b,
}: {
  teams: Team[];
  a: number | null;
  b: number | null;
}) {
  const router = useRouter();

  const go = (na: number | null, nb: number | null) => {
    const params = new URLSearchParams();
    if (na) params.set("a", String(na));
    if (nb) params.set("b", String(nb));
    router.push(`/mundial/comparar${params.size ? `?${params}` : ""}`);
  };

  const select = (
    value: number | null,
    onChange: (v: number | null) => void,
    label: string,
  ) => (
    <label style={{ flex: 1, minWidth: 0 }}>
      <span
        className="mono"
        style={{
          display: "block",
          fontSize: "0.6rem",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "var(--text-dim)",
          marginBottom: 6,
        }}
      >
        {label}
      </span>
      <select
        className="field"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        style={{ width: "100%" }}
      >
        <option value="">Elige…</option>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
      {select(a, (v) => go(v, b), "Selección A")}
      <span
        className="mono"
        style={{ color: "var(--text-dim)", paddingBottom: 8, fontSize: "0.8rem" }}
      >
        vs
      </span>
      {select(b, (v) => go(a, v), "Selección B")}
    </div>
  );
}
