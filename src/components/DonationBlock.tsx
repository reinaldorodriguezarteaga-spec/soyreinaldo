"use client";

import { useState } from "react";

const PRESETS_EUR = [3, 5, 10, 25];

export default function DonationBlock() {
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
  const amountCents = selected > 0 ? selected * 100 : customCents;
  const amountLabel =
    amountCents > 0
      ? `${(amountCents / 100).toLocaleString("es-ES", { maximumFractionDigits: 2 })}€`
      : "";

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
      if (data.url) window.location.href = data.url;
    } catch {
      setError("No se pudo contactar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dona__card">
      <div className="amounts">
        {PRESETS_EUR.map((p) => (
          <button
            key={p}
            type="button"
            className="amount"
            aria-pressed={selected === p}
            onClick={() => {
              setSelected(p);
              setCustom("");
            }}
          >
            {p}€
          </button>
        ))}
      </div>
      <label className="label" htmlFor="dona-custom">
        Otra cantidad (€)
      </label>
      <input
        id="dona-custom"
        className="field"
        type="number"
        min={1}
        max={500}
        inputMode="decimal"
        value={custom}
        placeholder="Por ejemplo 7"
        onChange={(e) => {
          setCustom(e.target.value);
          setSelected(0);
        }}
      />
      <label className="label" htmlFor="dona-msg">
        Mensaje (opcional)
      </label>
      <input
        id="dona-msg"
        className="field"
        type="text"
        maxLength={140}
        value={message}
        placeholder="¡Visca el Barça!"
        onChange={(e) => setMessage(e.target.value)}
      />
      <button
        type="button"
        onClick={handleDonate}
        disabled={loading || amountCents < 100}
        className="btn btn--accent w-full justify-center"
      >
        {loading ? "Redirigiendo…" : `Donar ${amountLabel}`}
      </button>
      {error && (
        <p className="mt-3 text-sm text-[#ff8a8a]">{error}</p>
      )}
      <p className="dona__note">🔒 Pago seguro vía Stripe. Tu tarjeta nunca pasa por este servidor.</p>
    </div>
  );
}
