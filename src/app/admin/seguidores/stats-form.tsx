"use client";

import { useActionState } from "react";
import {
  updateSocialStats,
  type SocialStatsState,
} from "./actions";
import type { SocialStats } from "@/lib/social-stats";

const initial: SocialStatsState = { status: "idle" };

export default function StatsForm({ initial: data }: { initial: SocialStats }) {
  const [state, action, pending] = useActionState(updateSocialStats, initial);

  return (
    <form action={action} className="space-y-6">
      <Section title="Instagram">
        <Pair
          a={{ name: "ig_followers", label: "Seguidores", value: data.ig_followers, placeholder: "54,5K" }}
          b={{ name: "ig_views_monthly", label: "Visualizaciones/mes", value: data.ig_views_monthly, placeholder: "+7,7M" }}
        />
      </Section>

      <Section title="Facebook">
        <Pair
          a={{ name: "fb_followers", label: "Seguidores", value: data.fb_followers, placeholder: "43K" }}
          b={{ name: "fb_views_monthly", label: "Visualizaciones/mes", value: data.fb_views_monthly, placeholder: "+8,4M" }}
        />
      </Section>

      <Section title="TikTok">
        <Pair
          a={{ name: "tt_followers", label: "Seguidores", value: data.tt_followers, placeholder: "34,4K" }}
          b={{ name: "tt_views_monthly", label: "Visualizaciones/mes", value: data.tt_views_monthly, placeholder: "+4M" }}
        />
      </Section>

      <Section title="YouTube">
        <Pair
          a={{ name: "yt_subscribers", label: "Suscriptores", value: data.yt_subscribers, placeholder: "+9.000" }}
          b={{ name: "yt_views_monthly", label: "Visualizaciones/mes", value: data.yt_views_monthly, placeholder: "+1,8M" }}
        />
      </Section>

      <Section title="Threads">
        <Field
          name="threads_followers"
          label="Seguidores"
          value={data.threads_followers}
          placeholder="8,7K"
        />
      </Section>

      <Section title="Comunidad total">
        <Field
          name="total_followers"
          label="Suma redondeada (lo que se ve en el recuadro grande)"
          value={data.total_followers}
          placeholder="+149.000"
        />
      </Section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-indigo-300 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Guardando..." : "Guardar cambios"}
        </button>
        {state.status === "error" && state.message && (
          <span className="text-sm text-red-300">⚠ {state.message}</span>
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
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
      <h2 className="mb-4 text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Pair({
  a,
  b,
}: {
  a: { name: string; label: string; value: string; placeholder: string };
  b: { name: string; label: string; value: string; placeholder: string };
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field {...a} />
      <Field {...b} />
    </div>
  );
}

function Field({
  name,
  label,
  value,
  placeholder,
}: {
  name: string;
  label: string;
  value: string;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </span>
      <input
        type="text"
        name={name}
        defaultValue={value}
        placeholder={placeholder}
        autoComplete="off"
        maxLength={30}
        className="block h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-sm tabular-nums text-white placeholder:text-zinc-600 focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300"
      />
    </label>
  );
}
