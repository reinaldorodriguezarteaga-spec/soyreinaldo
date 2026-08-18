"use client";

import { useActionState } from "react";
import {
  updateLeagueMeta,
  updateLeagueRules,
  addAdjustment,
  type LeagueFormState,
} from "./actions";

const initial: LeagueFormState = { status: "idle" };

function Feedback({ state }: { state: LeagueFormState }) {
  if (state.status === "idle") return null;
  return (
    <p
      role="status"
      style={{
        marginTop: 12,
        fontSize: "0.88rem",
        color: state.status === "error" ? "var(--danger, #ff6b6b)" : "var(--accent)",
      }}
    >
      {state.message}
    </p>
  );
}

const rowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 12,
};

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "block",
        fontFamily: "var(--font-mono-stack)",
        fontSize: "0.66rem",
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "var(--text-dim)",
        marginBottom: 6,
      }}
    >
      {children}
    </span>
  );
}

export function EditLeagueForm({
  league,
}: {
  league: { id: string; name: string; code: string; description: string | null };
}) {
  const [state, action, pending] = useActionState(updateLeagueMeta, initial);
  return (
    <form action={action}>
      <input type="hidden" name="league_id" value={league.id} />
      <div style={rowStyle}>
        <label>
          <Label>Nombre</Label>
          <input className="field" name="name" defaultValue={league.name} disabled={pending} />
        </label>
        <label>
          <Label>Código de invitación</Label>
          <input
            className="field"
            name="code"
            defaultValue={league.code}
            disabled={pending}
            style={{ fontFamily: "var(--font-mono-stack)" }}
          />
        </label>
      </div>
      <label style={{ display: "block", marginTop: 12 }}>
        <Label>Descripción</Label>
        <input
          className="field"
          name="description"
          defaultValue={league.description ?? ""}
          disabled={pending}
        />
      </label>
      <button type="submit" className="btn btn--accent" disabled={pending} style={{ marginTop: 16 }}>
        {pending ? "Guardando…" : "Guardar"}
      </button>
      <Feedback state={state} />
    </form>
  );
}

export type LeagueRules = {
  exact: number;
  result: number;
  champion: number;
  pichichi: number;
  relegated: number;
  midseason: number;
  specials: boolean;
};

export function RulesForm({
  leagueId,
  code,
  rules,
}: {
  leagueId: string;
  code: string;
  rules: LeagueRules;
}) {
  const [state, action, pending] = useActionState(updateLeagueRules, initial);
  return (
    <form action={action}>
      <input type="hidden" name="league_id" value={leagueId} />
      <input type="hidden" name="code" value={code} />
      <div style={rowStyle}>
        <Num name="exact" label="Marcador exacto" value={rules.exact} disabled={pending} />
        <Num name="result" label="Acertar ganador" value={rules.result} disabled={pending} />
      </div>
      <label
        style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0 12px" }}
      >
        <input type="checkbox" name="specials" defaultChecked={rules.specials} disabled={pending} />
        <span style={{ fontSize: "0.9rem" }}>
          Puntuar los picks especiales (campeón, pichichi, descensos, Zamora…)
        </span>
      </label>
      <div style={rowStyle}>
        <Num name="champion" label="Campeón" value={rules.champion} disabled={pending} />
        <Num name="pichichi" label="Pichichi" value={rules.pichichi} disabled={pending} />
        <Num name="relegated" label="Cada descenso" value={rules.relegated} disabled={pending} />
        <Num name="midseason" label="Cada pick de media temporada" value={rules.midseason} disabled={pending} />
      </div>
      <button type="submit" className="btn btn--accent" disabled={pending} style={{ marginTop: 16 }}>
        {pending ? "Guardando…" : "Guardar normas"}
      </button>
      <Feedback state={state} />
    </form>
  );
}

function Num({
  name,
  label,
  value,
  disabled,
}: {
  name: string;
  label: string;
  value: number;
  disabled: boolean;
}) {
  return (
    <label>
      <Label>{label}</Label>
      <input
        className="field"
        type="number"
        name={name}
        min={0}
        max={100}
        defaultValue={value}
        disabled={disabled}
      />
    </label>
  );
}

export function AdjustmentForm({
  leagueId,
  code,
  members,
}: {
  leagueId: string;
  code: string;
  members: { userId: string; displayName: string }[];
}) {
  const [state, action, pending] = useActionState(addAdjustment, initial);
  return (
    <form action={action}>
      <input type="hidden" name="league_id" value={leagueId} />
      <input type="hidden" name="code" value={code} />
      <div style={rowStyle}>
        <label>
          <Label>Jugador</Label>
          <select className="field" name="user_id" disabled={pending} defaultValue="">
            <option value="" disabled>
              Elige…
            </option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.displayName}
              </option>
            ))}
          </select>
        </label>
        <label>
          <Label>Puntos (+/-)</Label>
          <input className="field" type="number" name="delta" defaultValue={0} disabled={pending} />
        </label>
      </div>
      <label style={{ display: "block", marginTop: 12 }}>
        <Label>Motivo</Label>
        <input
          className="field"
          name="reason"
          placeholder="Premio del mes, penalización…"
          disabled={pending}
        />
      </label>
      <button type="submit" className="btn" disabled={pending} style={{ marginTop: 16 }}>
        {pending ? "Aplicando…" : "Aplicar ajuste"}
      </button>
      <Feedback state={state} />
    </form>
  );
}

export function InviteLink({ code }: { code: string }) {
  const path = `/unirse/${encodeURIComponent(code)}`;
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
      <input
        className="field"
        readOnly
        value={path}
        onFocus={(e) => e.currentTarget.select()}
        style={{ flex: "1 1 220px", minWidth: 0, fontFamily: "var(--font-mono-stack)" }}
      />
      <button
        type="button"
        className="btn"
        onClick={async () => {
          const url = `${window.location.origin}${path}`;
          try {
            await navigator.clipboard.writeText(url);
          } catch {
            window.prompt("Copia este enlace:", url);
          }
        }}
      >
        Copiar enlace
      </button>
    </div>
  );
}
