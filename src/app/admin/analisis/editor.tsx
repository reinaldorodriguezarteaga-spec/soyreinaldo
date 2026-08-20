"use client";

import { useActionState, useState } from "react";
import { guardarAnalisis, type EstadoAnalisis } from "./actions";
import { markdownAHtml, minutosDeLectura } from "@/lib/analisis/markdown";

const inicial: EstadoAnalisis = { status: "idle" };

export type Borrador = {
  id?: string;
  slug?: string;
  title?: string;
  excerpt?: string | null;
  body?: string;
  cover_url?: string | null;
  fixture_id?: number | null;
  competition_slug?: string | null;
  published_at?: string | null;
};

const COMPETICIONES = [
  ["laliga", "LaLiga"],
  ["champions", "Champions"],
  ["premier", "Premier"],
  ["serie-a", "Serie A"],
  ["copa-del-rey", "Copa del Rey"],
  ["europa", "Europa League"],
  ["conference", "Conference"],
  ["supercopa", "Supercopa"],
  ["fa-cup", "FA Cup"],
];

const campo =
  "w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-300 focus:outline-none";
const etiqueta = "mb-1 block text-[11px] uppercase tracking-[0.14em] text-zinc-500";

export default function Editor({ borrador }: { borrador?: Borrador }) {
  const [estado, accion, enviando] = useActionState(guardarAnalisis, inicial);
  const [cuerpo, setCuerpo] = useState(borrador?.body ?? "");
  const [vista, setVista] = useState<"escribir" | "previa">("escribir");
  const [conPartido, setConPartido] = useState(!!borrador?.fixture_id);

  return (
    <form action={accion} className="space-y-5">
      {borrador?.id && <input type="hidden" name="id" value={borrador.id} />}

      <div>
        <label className={etiqueta}>Título</label>
        <input
          className={campo}
          name="title"
          defaultValue={borrador?.title ?? ""}
          placeholder="El Barça no necesita un nueve, necesita un plan"
          disabled={enviando}
        />
      </div>

      <div>
        <label className={etiqueta}>Entradilla</label>
        <input
          className={campo}
          name="excerpt"
          defaultValue={borrador?.excerpt ?? ""}
          placeholder="Una frase. Es lo que se lee en Google y en las tarjetas."
          disabled={enviando}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className={etiqueta} style={{ marginBottom: 0 }}>
            Cuerpo · Markdown
          </label>
          <div className="flex gap-1 text-xs">
            {(["escribir", "previa"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVista(v)}
                className={`rounded-lg px-3 py-1 ${
                  vista === v ? "bg-indigo-300 text-zinc-950" : "text-zinc-400"
                }`}
              >
                {v === "escribir" ? "Escribir" : "Previsualizar"}
              </button>
            ))}
          </div>
        </div>

        {vista === "escribir" ? (
          <textarea
            className={`${campo} min-h-[420px] font-mono leading-relaxed`}
            name="body"
            value={cuerpo}
            onChange={(e) => setCuerpo(e.target.value)}
            placeholder={"## Un titular\n\nTu texto. **Negrita**, *cursiva*, [enlaces](https://…).\n\n- Listas\n- Así\n\n> Y citas."}
            disabled={enviando}
          />
        ) : (
          <>
            <input type="hidden" name="body" value={cuerpo} />
            <div
              className="prosa min-h-[420px] rounded-xl border border-zinc-800 bg-zinc-950 p-5"
              dangerouslySetInnerHTML={{ __html: markdownAHtml(cuerpo) }}
            />
          </>
        )}
        <p className="mt-1 text-xs text-zinc-500">
          {cuerpo.trim() ? `${minutosDeLectura(cuerpo)} min de lectura` : " "}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={etiqueta}>Imagen de portada (URL)</label>
          <input
            className={campo}
            name="cover_url"
            defaultValue={borrador?.cover_url ?? ""}
            placeholder="https://…"
            disabled={enviando}
          />
        </div>
        <div>
          <label className={etiqueta}>Enlace propio (opcional)</label>
          <input
            className={campo}
            name="slug"
            defaultValue={borrador?.slug ?? ""}
            placeholder="se genera del título"
            disabled={enviando}
          />
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 p-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={conPartido}
            onChange={(e) => setConPartido(e.target.checked)}
            disabled={enviando}
          />
          Engancharlo a un partido
        </label>
        <p className="mt-1 text-xs text-zinc-500">
          Si lo enganchas, el análisis aparece dentro de la ficha de ese partido
          — que es donde llega la gente desde Google.
        </p>

        {conPartido && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={etiqueta}>Id del partido</label>
              <input
                className={campo}
                name="fixture_id"
                defaultValue={borrador?.fixture_id ?? ""}
                placeholder="1570345"
                disabled={enviando}
              />
              <p className="mt-1 text-xs text-zinc-500">
                Es el número del final de la URL del partido.
              </p>
            </div>
            <div>
              <label className={etiqueta}>Competición</label>
              <select
                className={campo}
                name="competition_slug"
                defaultValue={borrador?.competition_slug ?? "laliga"}
                disabled={enviando}
              >
                {COMPETICIONES.map(([valor, nombre]) => (
                  <option key={valor} value={valor}>
                    {nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="publicar"
          defaultChecked={!!borrador?.published_at}
          disabled={enviando}
        />
        Publicar · si lo dejas sin marcar se guarda como borrador y no lo ve nadie
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-xl bg-indigo-300 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-indigo-200 disabled:opacity-60"
        >
          {enviando ? "Guardando…" : "Guardar"}
        </button>
        {estado.status === "error" && (
          <span className="text-sm text-red-300">{estado.message}</span>
        )}
      </div>
    </form>
  );
}
