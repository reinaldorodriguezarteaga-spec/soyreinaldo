"use client";

import { useActionState, useEffect, useState } from "react";
import {
  equiposDeCompeticion,
  guardarAnalisis,
  partidosDeEquipo,
  type EquipoOpcion,
  type EstadoAnalisis,
  type PartidoOpcion,
} from "./actions";
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

  // Enganchar a un partido: competición → equipo → partido. Antes había que
  // copiar a mano el número del final de la URL del partido.
  const [competicion, setCompeticion] = useState(
    borrador?.competition_slug ?? "laliga",
  );
  const [equipos, setEquipos] = useState<EquipoOpcion[]>([]);
  const [equipo, setEquipo] = useState("");
  // Los partidos guardan de QUÉ equipo son: así "cargando" se deduce
  // (comparando con el equipo elegido) en vez de fijarse dentro del efecto,
  // que provoca renders en cascada.
  const [cargados, setCargados] = useState<{
    equipo: string;
    partidos: PartidoOpcion[];
  } | null>(null);
  const partidos = cargados?.equipo === equipo ? cargados.partidos : [];
  const cargandoPartidos = !!equipo && cargados?.equipo !== equipo;
  // Al editar un análisis ya enganchado sabemos el id pero no el equipo, así
  // que se conserva tal cual hasta que se elija otro.
  const [partido, setPartido] = useState(String(borrador?.fixture_id ?? ""));
  const [esBorrador, setEsBorrador] = useState(
    borrador?.id ? !borrador?.published_at : false,
  );

  useEffect(() => {
    if (!conPartido) return;
    let vivo = true;
    equiposDeCompeticion(competicion)
      .then((e) => vivo && setEquipos(e))
      .catch(() => vivo && setEquipos([]));
    return () => {
      vivo = false;
    };
  }, [competicion, conPartido]);

  useEffect(() => {
    if (!equipo) return;
    let vivo = true;
    partidosDeEquipo(Number(equipo))
      .then((p) => {
        if (!vivo) return;
        setCargados({ equipo, partidos: p });
        // Por defecto, el último jugado: es sobre lo que se suele escribir.
        if (p.length > 0) setPartido(String(p[0].id));
      })
      .catch(() => vivo && setCargados({ equipo, partidos: [] }));
    return () => {
      vivo = false;
    };
  }, [equipo]);

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
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className={etiqueta}>Competición</label>
              <select
                className={campo}
                name="competition_slug"
                value={competicion}
                onChange={(e) => {
                  setCompeticion(e.target.value);
                  setEquipo("");
                }}
                disabled={enviando}
              >
                {COMPETICIONES.map(([valor, nombre]) => (
                  <option key={valor} value={valor}>
                    {nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={etiqueta}>Equipo</label>
              <select
                className={campo}
                value={equipo}
                onChange={(e) => setEquipo(e.target.value)}
                disabled={enviando || equipos.length === 0}
              >
                <option value="">
                  {equipos.length === 0 ? "Cargando…" : "Elige un equipo"}
                </option>
                {equipos.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={etiqueta}>Partido</label>
              <select
                className={campo}
                name="fixture_id"
                value={partido}
                onChange={(e) => setPartido(e.target.value)}
                disabled={enviando || (partidos.length === 0 && !partido)}
              >
                {/* Al editar, el partido ya enganchado sigue seleccionado
                    aunque todavía no se haya elegido equipo. */}
                {partido && !partidos.some((p) => String(p.id) === partido) && (
                  <option value={partido}>Partido actual (#{partido})</option>
                )}
                <option value="">
                  {cargandoPartidos
                    ? "Cargando partidos…"
                    : equipo
                      ? "Sin partidos cercanos"
                      : "Elige antes un equipo"}
                </option>
                {partidos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.etiqueta}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-zinc-500">
                El último jugado y los dos próximos.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Al revés que antes: guardar PUBLICA. La casilla es para el caso
          raro de querer dejarlo escondido. */}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="borrador"
          checked={esBorrador}
          onChange={(e) => setEsBorrador(e.target.checked)}
          disabled={enviando}
        />
        Guardar como borrador · no lo verá nadie hasta que lo publiques
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-xl bg-indigo-300 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-indigo-200 disabled:opacity-60"
        >
          {enviando ? "Guardando…" : esBorrador ? "Guardar borrador" : "Guardar y publicar"}
        </button>
        {estado.status === "error" && (
          <span className="text-sm text-red-300">{estado.message}</span>
        )}
      </div>
    </form>
  );
}
