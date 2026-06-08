"use client";

import { useActionState } from "react";
import { saveTournamentResult, type FinalState } from "./actions";

const initial: FinalState = { status: "idle" };

export type Team = {
  id: string;
  name: string;
  group_letter: string;
  flag_emoji: string | null;
};

export type CurrentResult = {
  champion_team: string | null;
  runner_up_team: string | null;
  pichichi_name: string | null;
  pichichi_actual_goals: number | null;
  final_scorer_names: string[] | null;
  hat_tricks_count: number | null;
};

export default function ResultsForm({
  teams,
  current,
}: {
  teams: Team[];
  current: CurrentResult | null;
}) {
  const [state, action, pending] = useActionState(
    saveTournamentResult,
    initial,
  );

  return (
    <form action={action} className="space-y-6">
      <Section title="Campeón y subcampeón">
        <div className="grid gap-4 sm:grid-cols-2">
          <TeamSelect
            name="champion"
            label="Campeón"
            teams={teams}
            defaultValue={current?.champion_team ?? ""}
            disabled={pending}
          />
          <TeamSelect
            name="runner_up"
            label="Subcampeón"
            teams={teams}
            defaultValue={current?.runner_up_team ?? ""}
            disabled={pending}
          />
        </div>
      </Section>

      <Section title="Pichichi del Mundial">
        <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
          <Text
            name="pichichi_name"
            label="Jugador (nombre oficial)"
            placeholder="Ej. Mbappé"
            defaultValue={current?.pichichi_name ?? ""}
            disabled={pending}
          />
          <Number
            name="pichichi_actual_goals"
            label="Goles totales"
            defaultValue={current?.pichichi_actual_goals ?? null}
            disabled={pending}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-zinc-500">
          Para acertar los nombres se ignoran tildes y mayúsculas.
        </p>
      </Section>

      <Section title="Goleadores en la final">
        <Text
          name="final_scorer_names"
          label="Lista de goleadores (separados por coma)"
          placeholder="Mbappé, Bellingham, Rodrygo"
          defaultValue={current?.final_scorer_names?.join(", ") ?? ""}
          disabled={pending}
        />
        <p className="mt-1.5 text-[11px] text-zinc-500">
          Si un usuario predijo cualquiera de estos nombres, se llevará los 8
          puntos.
        </p>
      </Section>

      <Section title="Total de hat-tricks">
        <Number
          name="hat_tricks_count"
          label="Hat-tricks totales del torneo"
          defaultValue={current?.hat_tricks_count ?? null}
          disabled={pending}
          wide
        />
      </Section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-indigo-300 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Guardando..." : "Guardar resultado del torneo"}
        </button>
        {state.status === "error" && state.message && (
          <span className="text-sm text-red-300">{state.message}</span>
        )}
        {state.status === "success" && state.message && (
          <span className="text-sm text-emerald-300">✓ {state.message}</span>
        )}
      </div>
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
      <h2 className="mb-4 text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function TeamSelect({
  name,
  label,
  teams,
  defaultValue,
  disabled,
}: {
  name: string;
  label: string;
  teams: Team[];
  defaultValue?: string;
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
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </span>
      <select
        name={name}
        defaultValue={defaultValue}
        disabled={disabled}
        className="block h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-white focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300 disabled:opacity-60"
      >
        <option value="">Sin elegir</option>
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

function Text({
  name,
  label,
  placeholder,
  defaultValue,
  disabled,
}: {
  name: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </span>
      <input
        type="text"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        className="block h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-sm text-white placeholder:text-zinc-600 focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300 disabled:opacity-60"
      />
    </label>
  );
}

function Number({
  name,
  label,
  defaultValue,
  disabled,
  wide,
}: {
  name: string;
  label: string;
  defaultValue: number | null;
  disabled?: boolean;
  wide?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </span>
      <input
        type="number"
        inputMode="numeric"
        name={name}
        defaultValue={defaultValue ?? ""}
        disabled={disabled}
        min={0}
        max={99}
        className={`block h-12 rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-sm tabular-nums text-white focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300 disabled:opacity-60 ${wide ? "w-full sm:w-32" : "w-full"}`}
      />
    </label>
  );
}
