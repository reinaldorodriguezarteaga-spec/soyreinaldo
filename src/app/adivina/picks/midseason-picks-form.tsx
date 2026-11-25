"use client";

import { useState, useTransition } from "react";
import { saveMidseasonPicks } from "../actions";
import type { PickTeam } from "./picks-form";

export default function MidseasonPicksForm({
  teams,
  initial,
  locked,
}: {
  teams: PickTeam[];
  initial: {
    bestGk: string;
    bestAssist: string;
    bestDefenseTeam: number | null;
    bestAttackTeam: number | null;
    mvp: string;
  };
  locked: boolean;
}) {
  const [bestGk, setBestGk] = useState(initial.bestGk);
  const [bestAssist, setBestAssist] = useState(initial.bestAssist);
  const [bestDefenseTeam, setBestDefenseTeam] = useState<string>(
    initial.bestDefenseTeam ? String(initial.bestDefenseTeam) : "",
  );
  const [bestAttackTeam, setBestAttackTeam] = useState<string>(
    initial.bestAttackTeam ? String(initial.bestAttackTeam) : "",
  );
  const [mvp, setMvp] = useState(initial.mvp);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [msg, setMsg] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const nameById = new Map(teams.map((t) => [t.id, t.name]));

  function submit() {
    setStatus("saving");
    setMsg(null);
    startTransition(async () => {
      const res = await saveMidseasonPicks(
        bestGk,
        bestAssist,
        bestDefenseTeam ? Number(bestDefenseTeam) : null,
        bestAttackTeam ? Number(bestAttackTeam) : null,
        mvp,
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
          🔒 Estos picks están cerrados (empezó la jornada 6). Estas fueron
          tus selecciones:
        </p>
        <ul style={{ marginTop: 12, lineHeight: 1.9 }}>
          <li>
            <b>Zamora (portero menos goleado):</b> {initial.bestGk || "—"}
          </li>
          <li>
            <b>Máximo asistidor:</b> {initial.bestAssist || "—"}
          </li>
          <li>
            <b>MVP de la liga:</b> {initial.mvp || "—"}
          </li>
          <li>
            <b>Equipo menos goleado:</b>{" "}
            {initial.bestDefenseTeam
              ? nameById.get(initial.bestDefenseTeam) ?? "—"
              : "—"}
          </li>
          <li>
            <b>Equipo más goleador:</b>{" "}
            {initial.bestAttackTeam
              ? nameById.get(initial.bestAttackTeam) ?? "—"
              : "—"}
          </li>
        </ul>
      </div>
    );
  }

  return (
    <div className="panel" style={{ padding: 24, display: "grid", gap: 20 }}>
      <Field label="🧤 Zamora (portero menos goleado)" hint="10 pts">
        <input
          className="scorein"
          style={{ width: "100%", height: 46, textAlign: "left", paddingLeft: 12 }}
          type="text"
          placeholder="Nombre del portero"
          value={bestGk}
          onChange={(e) => setBestGk(e.target.value)}
          maxLength={60}
        />
      </Field>

      <Field label="🎯 Máximo asistidor" hint="10 pts">
        <input
          className="scorein"
          style={{ width: "100%", height: 46, textAlign: "left", paddingLeft: 12 }}
          type="text"
          placeholder="Nombre del jugador"
          value={bestAssist}
          onChange={(e) => setBestAssist(e.target.value)}
          maxLength={60}
        />
      </Field>

      <Field label="⭐ MVP de la liga" hint="10 pts">
        <input
          className="scorein"
          style={{ width: "100%", height: 46, textAlign: "left", paddingLeft: 12 }}
          type="text"
          placeholder="Nombre del jugador"
          value={mvp}
          onChange={(e) => setMvp(e.target.value)}
          maxLength={60}
        />
      </Field>

      <Field label="🛡️ Equipo menos goleado" hint="10 pts">
        <select
          className="scorein"
          style={{ width: "100%", height: 46 }}
          value={bestDefenseTeam}
          onChange={(e) => setBestDefenseTeam(e.target.value)}
        >
          <option value="">— Elegir equipo —</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="🔥 Equipo más goleador" hint="10 pts">
        <select
          className="scorein"
          style={{ width: "100%", height: 46 }}
          value={bestAttackTeam}
          onChange={(e) => setBestAttackTeam(e.target.value)}
        >
          <option value="">— Elegir equipo —</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
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
