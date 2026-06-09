"use client";

import { useActionState, useState } from "react";
import { savePicks, type PicksState } from "./actions";

const initial: PicksState = { status: "idle" };

export type Team = {
  id: string;
  name: string;
  group_letter: string;
  flag_emoji: string | null;
};

export type ExistingPicks = {
  champion_team: string | null;
  runner_up_team: string | null;
  tercer_lugar: string | null;
  top_scoring_team: string | null;
  pichichi_name: string | null;
  pichichi_predicted_goals: number | null;
  final_scorer_name: string | null;
  balon_oro: string | null;
  guante_oro: string | null;
  jugador_revelacion: string | null;
  max_asistidor: string | null;
};

export default function PicksForm({
  teams,
  existing,
  locked,
}: {
  teams: Team[];
  existing: ExistingPicks | null;
  locked: boolean;
}) {
  const [state, action, pending] = useActionState(savePicks, initial);
  const disabled = locked || pending;

  // Campos controlados (React 19 resetea los no controlados al enviar).
  const [champion, setChampion] = useState(existing?.champion_team ?? "");
  const [runnerUp, setRunnerUp] = useState(existing?.runner_up_team ?? "");
  const [tercero, setTercero] = useState(existing?.tercer_lugar ?? "");
  const [topScoring, setTopScoring] = useState(existing?.top_scoring_team ?? "");
  const [pichichi, setPichichi] = useState(existing?.pichichi_name ?? "");
  const [pichichiGoals, setPichichiGoals] = useState(
    existing?.pichichi_predicted_goals != null
      ? String(existing.pichichi_predicted_goals)
      : "",
  );
  const [balonOro, setBalonOro] = useState(existing?.balon_oro ?? "");
  const [guanteOro, setGuanteOro] = useState(existing?.guante_oro ?? "");
  const [revelacion, setRevelacion] = useState(
    existing?.jugador_revelacion ?? "",
  );
  const [asistidor, setAsistidor] = useState(existing?.max_asistidor ?? "");
  const [finalScorer, setFinalScorer] = useState(
    existing?.final_scorer_name ?? "",
  );

  return (
    <form action={action} className="space-y-8">
      {locked && (
        <div className="notice" style={{ borderColor: "color-mix(in oklch, var(--accent-2) 40%, transparent)", background: "color-mix(in oklch, var(--accent-2) 12%, transparent)", color: "var(--accent-2)" }}>
          🔒 El torneo ya empezó. Los picks están bloqueados — solo lectura.
        </div>
      )}

      {/* Podio */}
      <Section
        title="Podio del Mundial"
        subtitle="Campeón 20 pts · Subcampeón 5 pts · Tercer lugar 3 pts"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <TeamSelect label="Campeón" name="champion" teams={teams} value={champion} onChange={setChampion} disabled={disabled} />
          <TeamSelect label="Subcampeón" name="runner_up" teams={teams} value={runnerUp} onChange={setRunnerUp} disabled={disabled} />
          <TeamSelect label="Tercer lugar" name="tercer_lugar" teams={teams} value={tercero} onChange={setTercero} disabled={disabled} />
        </div>
      </Section>

      {/* Equipo más goleador */}
      <Section
        title="Equipo más goleador"
        subtitle="10 puntos por acertar la selección que más goles marca en el torneo"
      >
        <TeamSelect label="Selección" name="top_scoring_team" teams={teams} value={topScoring} onChange={setTopScoring} disabled={disabled} />
      </Section>

      {/* Pichichi */}
      <Section
        title="Pichichi del Mundial"
        subtitle="10 puntos por acertar el máximo goleador · +5 puntos extra si aciertas también sus goles exactos"
      >
        <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
          <TextField label="Jugador" name="pichichi_name" value={pichichi} onChange={setPichichi} placeholder="Ej. Lamine Yamal" disabled={disabled} maxLength={80} />
          <NumberField label="Goles" name="pichichi_predicted_goals" value={pichichiGoals} onChange={setPichichiGoals} placeholder="6" disabled={disabled} max={20} />
        </div>
        <p className="hint">
          Escribe el nombre como tú lo digas — luego se compara con el oficial
          ignorando tildes y mayúsculas.
        </p>
      </Section>

      {/* Premios individuales */}
      <Section
        title="Premios individuales"
        subtitle="Balón de oro 10 pts · Guante de oro 7 pts · Jugador revelación 7 pts · Máximo asistidor 5 pts"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Balón de oro (mejor jugador)" name="balon_oro" value={balonOro} onChange={setBalonOro} placeholder="Ej. Mbappé" disabled={disabled} maxLength={80} />
          <TextField label="Guante de oro (mejor portero)" name="guante_oro" value={guanteOro} onChange={setGuanteOro} placeholder="Ej. Courtois" disabled={disabled} maxLength={80} />
          <TextField label="Jugador revelación" name="jugador_revelacion" value={revelacion} onChange={setRevelacion} placeholder="Ej. Estêvão" disabled={disabled} maxLength={80} />
          <TextField label="Máximo asistidor" name="max_asistidor" value={asistidor} onChange={setAsistidor} placeholder="Ej. De Bruyne" disabled={disabled} maxLength={80} />
        </div>
      </Section>

      {/* Goleador en la final */}
      <Section
        title="Goleador en la final"
        subtitle="8 puntos si tu jugador marca al menos un gol en la final"
      >
        <TextField label="Jugador" name="final_scorer_name" value={finalScorer} onChange={setFinalScorer} placeholder="Ej. Mbappé" disabled={disabled} maxLength={80} />
      </Section>

      {!locked && (
        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending} className="btn btn--accent">
            {pending ? "Guardando…" : "Guardar picks"}
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
      )}
    </form>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="acard">
      <h2>{title}</h2>
      {subtitle && <p className="sub">{subtitle}</p>}
      {children}
    </section>
  );
}

function TeamSelect({
  label,
  name,
  teams,
  value,
  onChange,
  disabled,
}: {
  label: string;
  name: string;
  teams: Team[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const byGroup = new Map<string, Team[]>();
  for (const t of teams) {
    const arr = byGroup.get(t.group_letter) ?? [];
    arr.push(t);
    byGroup.set(t.group_letter, arr);
  }
  const groups = Array.from(byGroup.entries()).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );

  return (
    <label className="block">
      <span className="label">{label}</span>
      <select
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="field"
        style={{ marginBottom: 0 }}
      >
        <option value="">Elige una selección</option>
        {groups.map(([letter, list]) => (
          <optgroup key={letter} label={`Grupo ${letter}`}>
            {list
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {(t.flag_emoji ?? "") + " " + t.name}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

function TextField({
  label,
  name,
  value,
  onChange,
  placeholder,
  disabled,
  maxLength,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input
        type="text"
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        autoComplete="off"
        className="field"
        style={{ marginBottom: 0 }}
      />
    </label>
  );
}

function NumberField({
  label,
  name,
  value,
  onChange,
  placeholder,
  disabled,
  max,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  max?: number;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        min={0}
        max={max ?? 99}
        className="field"
        style={{ marginBottom: 0 }}
      />
    </label>
  );
}
