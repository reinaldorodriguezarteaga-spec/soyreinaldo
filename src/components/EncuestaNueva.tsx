"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { crearEncuesta } from "@/app/actions/encuestas";

/** Solo admin: lanzar una encuesta en directo ("¿Penalti o no?"). */
export default function EncuestaNueva({ fixtureId }: { fixtureId: number }) {
  const ruta = usePathname() ?? "/";
  const router = useRouter();
  const [pregunta, setPregunta] = useState("");
  const [opciones, setOpciones] = useState(["Sí", "No", "", ""]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <details className="encuesta__nueva">
      <summary className="mono">＋ Nueva encuesta (admin)</summary>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const r = await crearEncuesta(fixtureId, pregunta, opciones, ruta);
            if (!r.ok) return setError(r.mensaje);
            setError(null);
            setPregunta("");
            setOpciones(["Sí", "No", "", ""]);
            router.refresh();
          });
        }}
      >
        <input
          className="field"
          placeholder="¿Penalti o no?"
          value={pregunta}
          maxLength={140}
          onChange={(e) => setPregunta(e.target.value)}
        />
        <div className="encuesta__nueva-ops">
          {opciones.map((o, i) => (
            <input
              key={i}
              className="field"
              placeholder={i < 2 ? `Opción ${i + 1}` : `Opción ${i + 1} (opcional)`}
              value={o}
              maxLength={60}
              onChange={(e) => setOpciones((s) => s.map((x, j) => (j === i ? e.target.value : x)))}
            />
          ))}
        </div>
        <button type="submit" className="btn btn--accent" disabled={pending}>
          {pending ? "Creando…" : "Lanzar encuesta"}
        </button>
        {error && <p className="encuesta__error">{error}</p>}
      </form>
    </details>
  );
}
