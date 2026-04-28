"use client";

import { useState } from "react";

const PRESETS_EUR = [3, 5, 10, 25];

export default function DonationCard() {
  const [selected, setSelected] = useState<number>(5);
  const [custom, setCustom] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customCents = (() => {
    const n = Number(custom.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.round(n * 100);
  })();

  const amountCents =
    selected > 0 ? selected * 100 : customCents;

  async function handleDonate() {
    setError(null);
    if (amountCents < 100) {
      setError("Mínimo 1€.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/donations/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al crear la donación.");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError("No se pudo contactar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-indigo-400/20 bg-gradient-to-br from-indigo-950/30 via-zinc-950 to-zinc-950 p-6 sm:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">
            Apoya el proyecto
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            Invítame a un café.
          </h2>
        </div>
        <p className="text-xs text-zinc-500">Pago único · Tarjeta</p>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-zinc-400">
        Tu donación ayuda a mantener viva la web, las quinielas y el contenido.
        Sin obligaciones, lo que tú quieras.
      </p>

      <div className="mt-6 grid grid-cols-4 gap-2">
        {PRESETS_EUR.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => {
              setSelected(preset);
              setCustom("");
            }}
            className={`rounded-xl border px-2 py-3 text-sm font-semibold transition ${
              selected === preset
                ? "border-indigo-300 bg-indigo-300/10 text-white"
                : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700"
            }`}
          >
            {preset}€
          </button>
        ))}
      </div>

      <label className="mt-3 block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
          Otra cantidad (€)
        </span>
        <input
          type="number"
          min={1}
          max={500}
          step={1}
          inputMode="decimal"
          value={custom}
          placeholder="Por ejemplo 7"
          onChange={(e) => {
            setCustom(e.target.value);
            setSelected(0);
          }}
          className="block w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300"
        />
      </label>

      <label className="mt-3 block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
          Mensaje (opcional)
        </span>
        <input
          type="text"
          maxLength={140}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="¡Visca el Barça!"
          className="block w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300"
        />
      </label>

      <button
        type="button"
        onClick={handleDonate}
        disabled={loading || amountCents < 100}
        className="mt-5 w-full rounded-xl bg-indigo-300 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading
          ? "Redirigiendo..."
          : amountCents > 0
            ? `Donar ${(amountCents / 100).toLocaleString("es-ES", { maximumFractionDigits: 2 })}€`
            : "Donar"}
      </button>

      {error && (
        <p className="mt-3 rounded-lg border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-200">
          {error}
        </p>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-zinc-600">
        Pago seguro vía Stripe. Tu tarjeta nunca pasa por este servidor.
      </p>
    </div>
  );
}
