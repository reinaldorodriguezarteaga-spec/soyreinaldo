"use client";

import { useActionState } from "react";
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
  pichichi_name: string | null;
  pichichi_predicted_goals: number | null;
  final_scorer_name: string | null;
  hat_tricks_count: number | null;
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

  return (
    <form action={action} className="space-y-8">
      {locked && (
        <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-4 text-sm text-amber-200">
          🔒 El torneo ya empezó. Los picks están bloqueados — solo lectura.
        </div>
      )}

      {/* Campeón + Subcampeón */}
      <Section
        title="Campeón y subcampeón"
        subtitle="20 puntos por acertar el campeón · 5 puntos por el subcampeón"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TeamSelect
            label="Campeón"
            name="champion"
            teams={teams}
            defaultValue={existing?.champion_team ?? ""}
            disabled={disabled}
            placeholder="Elige una selección"
          />
          <TeamSelect
            label="Subcampeón"
            name="runner_up"
            teams={teams}
            defaultValue={existing?.runner_up_team ?? ""}
            disabled={disabled}
            placeholder="Elige una selección"
          />
        </div>
      </Section>

      {/* Pichichi */}
      <Section
        title="Pichichi del Mundial"
        subtitle="10 puntos por acertar el jugador · +5 puntos extra si aciertas también los goles exactos"
      >
        <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
          <TextField
            label="Jugador"
            name="pichichi_name"
            defaultValue={existing?.pichichi_name ?? ""}
            placeholder="Ej. Lamine Yamal"
            disabled={disabled}
            maxLength={80}
          />
          <NumberField
            label="Goles"
            name="pichichi_predicted_goals"
            defaultValue={existing?.pichichi_predicted_goals ?? null}
            placeholder="6"
            disabled={disabled}
            max={20}
          />
        </div>
        <p className="mt-2 text-[11px] text-zinc-500">
          Escribe el nombre como tú lo digas — luego se compara con el oficial
          ignorando tildes y mayúsculas.
        </p>
      </Section>

      {/* Goleador en la final */}
      <Section
        title="Goleador en la final"
        subtitle="8 puntos si tu jugador marca al menos un gol en la final"
      >
        <TextField
          label="Jugador"
          name="final_scorer_name"
          defaultValue={existing?.final_scorer_name ?? ""}
          placeholder="Ej. Mbappé"
          disabled={disabled}
          maxLength={80}
        />
      </Section>

      {/* Hat-tricks */}
      <Section
        title="Total de hat-tricks del Mundial"
        subtitle="5 puntos si aciertas el número exacto de hat-tricks (incluye 0)"
      >
        <NumberField
          label="Hat-tricks totales"
          name="hat_tricks_count"
          defaultValue={existing?.hat_tricks_count ?? null}
          placeholder="3"
          disabled={disabled}
          max={50}
          wide
        />
      </Section>

      {!locked && (
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-indigo-300 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Guardando..." : "Guardar picks"}
          </button>
          {state.status === "error" && state.message && (
            <span className="text-sm text-red-300">{state.message}</span>
          )}
          {state.status === "success" && state.message && (
            <span className="text-sm text-emerald-300">
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
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
      <h2 className="text-base font-semibold">{title}</h2>
      {subtitle && (
        <p className="mb-4 mt-1 text-xs text-zinc-500">{subtitle}</p>
      )}
      {children}
    </section>
  );
}

function TeamSelect({
  label,
  name,
  teams,
  defaultValue,
  disabled,
  placeholder,
}: {
  label: string;
  name: string;
  teams: Team[];
  defaultValue?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  // Group teams by their group letter for nicer scanning
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
        className="block h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-white focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <option value="">{placeholder ?? "Sin elegir"}</option>
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
  defaultValue,
  placeholder,
  disabled,
  maxLength,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
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
        maxLength={maxLength}
        autoComplete="off"
        className="block h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-sm text-white placeholder:text-zinc-600 focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-60"
      />
    </label>
  );
}

function NumberField({
  label,
  name,
  defaultValue,
  placeholder,
  disabled,
  max,
  wide,
}: {
  label: string;
  name: string;
  defaultValue: number | null;
  placeholder?: string;
  disabled?: boolean;
  max?: number;
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
        placeholder={placeholder}
        disabled={disabled}
        min={0}
        max={max ?? 99}
        className={`block h-12 rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-sm tabular-nums text-white placeholder:text-zinc-600 focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-60 ${wide ? "w-full sm:w-32" : "w-full"}`}
      />
    </label>
  );
}
