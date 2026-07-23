"use client";

import { useRouter } from "next/navigation";
import type { Competition } from "@/lib/sports/competitions";

type Team = { id: number; name: string };

/**
 * Dos selectores de equipo; al cambiar cualquiera, navega a
 * /liga/[slug]/comparar?a=ID&b=ID y el server vuelve a pintar la comparación.
 */
export default function TeamPicker({
  competition,
  teams,
  a,
  b,
}: {
  competition: Competition;
  teams: Team[];
  a: number | null;
  b: number | null;
}) {
  const router = useRouter();

  const go = (na: number | null, nb: number | null) => {
    const params = new URLSearchParams();
    if (na) params.set("a", String(na));
    if (nb) params.set("b", String(nb));
    router.push(`/liga/${competition.slug}/comparar${params.size ? `?${params}` : ""}`);
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
      {select(a, (v) => go(v, b), "Equipo A")}
      <span
        className="mono"
        style={{ color: "var(--text-dim)", paddingBottom: 8, fontSize: "0.8rem" }}
      >
        vs
      </span>
      {select(b, (v) => go(a, v), "Equipo B")}
    </div>
  );
}
