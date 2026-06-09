"use client";

import { useState } from "react";

export default function AsesoriaCheckoutButton() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function go() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/asesorias/checkout", { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const { url } = await res.json();
      if (!url) throw new Error("No se recibió URL de pago.");
      window.location.href = url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error inesperado.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={go}
        disabled={loading}
        className="btn btn--accent"
      >
        {loading ? "Redirigiendo a pago…" : "Reservar asesoría · 75€"}
        {!loading && <span className="arr">→</span>}
      </button>
      {err && (
        <p className="notice notice--err" style={{ marginTop: 6 }}>
          ⚠ {err}
        </p>
      )}
      <p className="hint">
        Pago seguro vía Stripe. Tras el pago elegirás día y hora directamente en
        mi calendario.
      </p>
    </div>
  );
}
