"use client";

import { useActionState, useState } from "react";
import {
  updateSocialStats,
  type SocialStatsState,
} from "./actions";
import type { SocialStats } from "@/lib/social-stats";
import { sumarSeguidores } from "@/lib/social/totales";

const initial: SocialStatsState = { status: "idle" };

export default function StatsForm({ initial: data }: { initial: SocialStats }) {
  const [state, action, pending] = useActionState(updateSocialStats, initial);
  const [total, setTotal] = useState(
    () =>
      sumarSeguidores([
        data.ig_followers,
        data.fb_followers,
        data.tt_followers,
        data.yt_subscribers,
        data.threads_followers,
      ]).texto,
  );

  return (
    <form
      action={action}
      className="space-y-6"
      onInput={(e) => {
        // Se lee el formulario entero en vez de controlar cada campo: así los
        // inputs siguen siendo simples y el total se actualiza igual.
        const fd = new FormData(e.currentTarget);
        const leer = (k: string) => (fd.get(k) as string | null) ?? "";
        setTotal(
          sumarSeguidores([
            leer("ig_followers"),
            leer("fb_followers"),
            leer("tt_followers"),
            leer("yt_subscribers"),
            leer("threads_followers"),
          ]).texto,
        );
      }}
    >
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
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
          <p className="mb-1 text-[11px] uppercase tracking-[0.14em] text-zinc-500">
            Se calcula solo
          </p>
          <p className="text-2xl font-semibold tabular-nums">{total}</p>
          <p className="mt-1 text-xs text-zinc-500">
            Suma de las cinco redes. Antes se escribía a mano y acabó
            descuadrado: el media kit decía 169.100 con 169.800 reales.
          </p>
        </div>
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
