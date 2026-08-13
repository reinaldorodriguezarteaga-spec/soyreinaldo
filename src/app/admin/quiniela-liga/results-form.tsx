"use client";

import { useActionState } from "react";
import { saveLigaSeasonResult, type ResultState } from "./actions";

const initial: ResultState = { status: "idle" };

export type Team = { id: number; name: string };

export type CurrentResult = {
  champion_team: number | null;
  pichichi_name: string | null;
  relegated_teams: number[] | null;
  best_gk_name: string | null;
  best_assist_name: string | null;
  best_defense_team: number | null;
  best_attack_team: number | null;
  mvp_name: string | null;
};

export default function ResultsForm({
  teams,
  current,
}: {
  teams: Team[];
  current: CurrentResult | null;
}) {
  const [state, action, pending] = useActionState(
    saveLigaSeasonResult,
    initial,
  );
  const relegated = current?.relegated_teams ?? [];

  return (
    <form action={action} className="space-y-6">
      <Section title="Campeón, pichichi y descensos" hint="editables por el usuario hasta la jornada 1">
        <div className="grid gap-4 sm:grid-cols-2">
          <TeamSelect
            name="champion_team"
            label="Campeón"
            teams={teams}
            defaultValue={current?.champion_team ?? ""}
            disabled={pending}
          />
          <Text
            name="pichichi_name"
            label="Pichichi (jugador)"
            placeholder="Nombre del jugador"
            defaultValue={current?.pichichi_name ?? ""}
            disabled={pending}
          />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <TeamSelect
            name="relegated_1"
            label="Descendido 1"
            teams={teams}
            defaultValue={relegated[0] ?? ""}
            disabled={pending}
          />
          <TeamSelect
            name="relegated_2"
            label="Descendido 2"
            teams={teams}
            defaultValue={relegated[1] ?? ""}
            disabled={pending}
          />
          <TeamSelect
            name="relegated_3"
            label="Descendido 3"
            teams={teams}
            defaultValue={relegated[2] ?? ""}
            disabled={pending}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-zinc-500">
          Nombres de jugador comparados ignorando tildes y mayúsculas.
        </p>
      </Section>

      <Section title="Picks de mitad de temporada" hint="editables por el usuario hasta la jornada 6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Text
            name="best_gk_name"
            label="Zamora (portero menos goleado)"
            placeholder="Nombre del portero"
            defaultValue={current?.best_gk_name ?? ""}
            disabled={pending}
          />
          <Text
            name="best_assist_name"
            label="Máximo asistidor"
            placeholder="Nombre del jugador"
            defaultValue={current?.best_assist_name ?? ""}
            disabled={pending}
          />
          <Text
            name="mvp_name"
            label="MVP de la liga"
            placeholder="Nombre del jugador"
            defaultValue={current?.mvp_name ?? ""}
            disabled={pending}
          />
          <div />
          <TeamSelect
            name="best_defense_team"
            label="Equipo menos goleado"
            teams={teams}
            defaultValue={current?.best_defense_team ?? ""}
            disabled={pending}
          />
          <TeamSelect
            name="best_attack_team"
            label="Equipo más goleador"
            teams={teams}
            defaultValue={current?.best_attack_team ?? ""}
            disabled={pending}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-zinc-500">
          Nombres de jugador comparados ignorando tildes y mayúsculas.
        </p>
      </Section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-indigo-300 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Guardando..." : "Guardar resultado de la quiniela"}
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
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold">{title}</h2>
        {hint && (
          <span className="text-[11px] uppercase tracking-[0.15em] text-zinc-500">
            {hint}
          </span>
        )}
      </div>
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
  defaultValue?: number | "";
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </span>
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        disabled={disabled}
        className="block h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-white focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300 disabled:opacity-60"
      >
        <option value="">Sin elegir</option>
        {[...teams]
          .sort((a, b) => a.name.localeCompare(b.name, "es"))
          .map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
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
