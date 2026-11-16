"use client";

import { useState, useTransition } from "react";
import { saveSeasonPicks } from "../actions";

export type PickTeam = { id: number; name: string };

export default function PicksForm({
  teams,
  initial,
  locked,
}: {
  teams: PickTeam[];
  initial: {
    champion: number | null;
    pichichi: string;
    relegated: number[];
  };
  locked: boolean;
}) {
  const [champion, setChampion] = useState<string>(
    initial.champion ? String(initial.champion) : "",
  );
  const [pichichi, setPichichi] = useState(initial.pichichi);
  const [rel, setRel] = useState<string[]>([
    initial.relegated[0] ? String(initial.relegated[0]) : "",
    initial.relegated[1] ? String(initial.relegated[1]) : "",
    initial.relegated[2] ? String(initial.relegated[2]) : "",
  ]);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [msg, setMsg] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const nameById = new Map(teams.map((t) => [t.id, t.name]));

  function setRelAt(i: number, v: string) {
    setRel((prev) => prev.map((x, idx) => (idx === i ? v : x)));
  }

  function submit() {
    setStatus("saving");
    setMsg(null);
    const relIds = rel.map((v) => Number(v)).filter((n) => n > 0);
    startTransition(async () => {
      const res = await saveSeasonPicks(
        champion ? Number(champion) : null,
        pichichi,
        relIds,
      );
      if (res.ok) {
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 1600);
      } else {
        setStatus("error");
        setMsg(res.message);
      }
    });
  }

  if (locked) {
    return (
      <div className="panel" style={{ padding: 24 }}>
        <p style={{ margin: 0, color: "var(--text-dim)" }}>
          🔒 Los picks están cerrados (LaLiga ya arrancó). Estas fueron tus
          selecciones:
        </p>
        <ul style={{ marginTop: 12, lineHeight: 1.9 }}>
          <li>
            <b>Campeón:</b>{" "}
            {initial.champion ? nameById.get(initial.champion) ?? "—" : "—"}
          </li>
          <li>
            <b>Pichichi:</b> {initial.pichichi || "—"}
          </li>
          <li>
            <b>Descendidos:</b>{" "}
            {initial.relegated.length
              ? initial.relegated.map((id) => nameById.get(id) ?? "—").join(", ")
              : "—"}
          </li>
        </ul>
      </div>
    );
  }

  const relSelected = rel.filter((v) => v);

  return (
    <div className="panel" style={{ padding: 24, display: "grid", gap: 20 }}>
      <Field label="🏆 Campeón de LaLiga" hint="15 pts">
        <select
          className="scorein"
          style={{ width: "100%", height: 46 }}
          value={champion}
          onChange={(e) => setChampion(e.target.value)}
        >
          <option value="">— Elegir equipo —</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="⚽ Pichichi (máximo goleador)" hint="10 pts">
        <input
          className="scorein"
          style={{ width: "100%", height: 46, textAlign: "left", paddingLeft: 12 }}
          type="text"
          placeholder="Nombre del jugador"
          value={pichichi}
          onChange={(e) => setPichichi(e.target.value)}
          maxLength={60}
        />
      </Field>

      <Field label="🔻 Los 3 descendidos" hint="5 pts cada uno">
        <div style={{ display: "grid", gap: 8 }}>
          {[0, 1, 2].map((i) => (
            <select
              key={i}
              className="scorein"
              style={{ width: "100%", height: 44 }}
              value={rel[i]}
              onChange={(e) => setRelAt(i, e.target.value)}
            >
              <option value="">— Descendido {i + 1} —</option>
              {teams
                .filter(
                  (t) =>
                    !relSelected.includes(String(t.id)) ||
                    String(t.id) === rel[i],
                )
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </select>
          ))}
        </div>
      </Field>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button
          type="button"
          className="btn btn--accent"
          onClick={submit}
          disabled={status === "saving"}
        >
          {status === "saving" ? "Guardando…" : "Guardar picks"}
        </button>
        {status === "saved" && (
          <span style={{ color: "var(--accent)" }}>✓ Guardado</span>
        )}
        {status === "error" && msg && (
          <span style={{ color: "#ffb4b4" }}>⚠ {msg}</span>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 6,
        }}
      >
        <label style={{ fontWeight: 700 }}>{label}</label>
        <span className="mono" style={{ color: "var(--text-dim)", fontSize: "0.7rem" }}>
          {hint}
        </span>
      </div>
      {children}
    </div>
  );
}
