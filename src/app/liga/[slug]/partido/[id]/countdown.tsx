"use client";

import { useEffect, useState } from "react";

/**
 * Cuenta atrás hasta el inicio de un partido. Idéntico a
 * `mundial/partido/[id]/countdown.tsx` (ya era genérico) — copiado a su
 * propio archivo para que /mundial quede intacto. Se monta solo en el
 * cliente (empieza en null para no romper la hidratación con la hora del
 * servidor) y actualiza cada segundo desde un timer.
 */
export default function Countdown({ kickoff }: { kickoff: string }) {
  const target = new Date(kickoff).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setNow(Date.now()), 0);
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(t);
      clearInterval(id);
    };
  }, []);

  if (now == null) return null;

  const diff = target - now;
  if (diff <= 0) {
    return (
      <div className="countdown">
        <span className="badge badge--danger">
          <span className="livepulse" />
          Empieza ya
        </span>
      </div>
    );
  }

  const total = Math.floor(diff / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  const units: { value: number; label: string; show: boolean }[] = [
    { value: d, label: "días", show: d > 0 },
    { value: h, label: "h", show: d > 0 || h > 0 },
    { value: m, label: "min", show: true },
    { value: s, label: "seg", show: true },
  ];

  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <div className="countdown" role="timer" aria-live="off">
      {units
        .filter((u) => u.show)
        .map((u) => (
          <div key={u.label} className="countdown__unit">
            <span className="countdown__num tabular-nums">
              {u.label === "días" ? u.value : pad(u.value)}
            </span>
            <span className="countdown__lbl">{u.label}</span>
          </div>
        ))}
    </div>
  );
}
