"use client";
import { Timer } from "lucide-react";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { acierta, miles, type PartidaTop10, type TipoTop10 } from "@/lib/juegos/top10-comun";
import { NIVELES, SEGUNDOS_TOP10, puntosTop10, reloj, type Nivel } from "@/lib/juegos/niveles";
import ElegirNivel from "@/components/juegos/ElegirNivel";
import CierreJuego from "@/components/juegos/CierreJuego";
import { useCronometro } from "@/components/juegos/useCronometro";
import { otraListaTop10 } from "./acciones";

/**
 * «Top 10»: diez filas con la bandera y el nombre oculto. Se escriben nombres
 * y cada acierto se destapa en su puesto, sin pulsar nada (como Sporcle).
 * Reto del día (al ranking) y práctica con filtros por equipo y estadística.
 * El inicio del reto queda guardado: recargar no reinicia el reloj.
 */

const CLAVE = "jg-top10-v1";
type Dia = { ok: number[]; nivel?: Nivel; inicio?: number; fin?: number };
type Guardado = { dias: Record<number, Dia> };

const escudo = (id: number) => `https://media.api-sports.io/football/teams/${id}.png`;
const bandera = (codigo: string) => `https://media.api-sports.io/flags/${codigo}.svg`;
const sinSuscripcion = () => () => {};

const UNIDAD: Record<TipoTop10, (n: number) => string> = {
  minutos: (n) => `${miles(n)}'`,
  goles: (n) => `${n} ${n === 1 ? "gol" : "goles"}`,
  asistencias: (n) => `${n} asist.`,
};

function leer(): Guardado {
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE) ?? "null") as Guardado | null;
    return g && typeof g.dias === "object" ? g : { dias: {} };
  } catch {
    return { dias: {} };
  }
}

function guardar(g: Guardado) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(g));
  } catch {
    // Storage bloqueado: se juega igual, sin recordar el resultado.
  }
}

export default function Juego({
  numero,
  delDia,
  equipos,
}: {
  numero: number;
  delDia: PartidaTop10;
  equipos: { id: number; nombre: string }[];
}) {
  const [modo, setModo] = useState<"dia" | "practica">("dia");
  const [practica, setPractica] = useState<PartidaTop10 | null>(null);
  const [vistas, setVistas] = useState<string[]>([]);
  const [filtroEquipo, setFiltroEquipo] = useState<number | "">("");
  const [filtroTipo, setFiltroTipo] = useState<TipoTop10 | "">("");
  const [ok, setOk] = useState<number[]>([]);
  const [fallos, setFallos] = useState<string[]>([]);
  const [texto, setTexto] = useState("");
  const [guardado, setGuardado] = useState<Guardado>({ dias: {} });
  const [nivel, setNivel] = useState<Nivel | null>(null);
  const [inicio, setInicio] = useState<number | null>(null);
  const [fin, setFin] = useState<number | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [cargando, startTransition] = useTransition();
  const entrada = useRef<HTMLInputElement>(null);
  const nativo = useSyncExternalStore(sinSuscripcion, () => "share" in navigator, () => false);

  const partida = modo === "dia" ? delDia : (practica ?? delDia);

  // El reto de hoy, si ya se empezó en este navegador.
  useEffect(() => {
    const g = leer();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hidratación única al montar, no cascada
    setGuardado(g);
    const d = g.dias[numero];
    if (d) {
      setOk(d.ok ?? []);
      setNivel(d.nivel ?? null);
      setInicio(d.inicio ?? null);
      setFin(d.fin ?? null);
    }
  }, [numero]);

  const segundos = SEGUNDOS_TOP10[nivel ?? "facil"];
  const restante = useCronometro(segundos, inicio, fin);
  const completo = ok.length === partida.filas.length;
  const agotado = inicio != null && fin == null && restante === 0;
  const terminado = completo || fin != null || agotado;

  function apuntar(parcial: Partial<Dia>) {
    if (modo !== "dia") return;
    const previo: Dia = guardado.dias[numero] ?? { ok: [] };
    const g: Guardado = { dias: { ...guardado.dias, [numero]: { ...previo, ...parcial } } };
    setGuardado(g);
    guardar(g);
  }

  // Se acabó el tiempo: la partida se cierra.
  useEffect(() => {
    if (!agotado) return;
    const ahora = Date.now();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- respuesta al reloj (externo), una sola vez
    setFin(ahora);
    apuntar({ fin: ahora });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al agotarse
  }, [agotado]);

  function empezar(n: Nivel) {
    const ahora = Date.now();
    setNivel(n);
    setInicio(ahora);
    setFin(null);
    apuntar({ nivel: n, inicio: ahora });
    setTimeout(() => entrada.current?.focus(), 50);
  }

  /** Comprueba lo escrito: si es alguien de la lista, se destapa y se limpia. */
  function escribir(valor: string) {
    setTexto(valor);
    if (terminado) return;
    const nuevos = partida.filas.filter((f) => !ok.includes(f.pos) && acierta(valor, f.alias)).map((f) => f.pos);
    if (nuevos.length === 0) return;
    const todos = [...ok, ...nuevos];
    setOk(todos);
    setTexto("");
    const acaba = todos.length === partida.filas.length;
    const ahora = Date.now();
    if (acaba) setFin(ahora);
    apuntar({ ok: todos, ...(acaba ? { fin: ahora } : {}) });
  }

  /** Enter sin acierto: se apunta como fallo (no resta, solo se ve). */
  function fallar() {
    const t = texto.trim();
    if (t.length < 3 || terminado) return;
    setFallos((f) => (f.includes(t) ? f : [t, ...f].slice(0, 8)));
    setTexto("");
  }

  function rendirse() {
    const ahora = Date.now();
    setFin(ahora);
    apuntar({ fin: ahora });
  }

  function nuevaLista(equipo: number | "" = filtroEquipo, tipo: TipoTop10 | "" = filtroTipo) {
    startTransition(async () => {
      const p = await otraListaTop10({ equipo: equipo || undefined, tipo: tipo || undefined }, vistas);
      if (!p) return;
      setPractica(p);
      setVistas((v) => [...v, p.id]);
      setOk([]);
      setFallos([]);
      setTexto("");
      setCopiado(false);
      // En práctica se sigue con el mismo nivel y el reloj arranca de nuevo.
      setInicio(nivel ? Date.now() : null);
      setFin(null);
      if (nivel) setTimeout(() => entrada.current?.focus(), 50);
    });
  }

  function irA(m: "dia" | "practica") {
    if (m === modo) return;
    setModo(m);
    setCopiado(false);
    setTexto("");
    setFallos([]);
    if (m === "dia") {
      const d = guardado.dias[numero];
      setOk(d?.ok ?? []);
      setNivel(d?.nivel ?? null);
      setInicio(d?.inicio ?? null);
      setFin(d?.fin ?? null);
    } else nuevaLista();
  }

  const puntos = nivel ? puntosTop10({ aciertos: ok.length, sobra: restante, nivel }) : 0;
  const cuadros = partida.filas.map((f) => (ok.includes(f.pos) ? "🟩" : "⬛")).join("");
  const compartir = useMemo(
    () =>
      `Top 10${modo === "dia" ? ` #${numero}` : ""} · ${partida.titulo} (${partida.subtitulo})\n${cuadros} ${ok.length}/10\nsoyreinaldo.com/juegos/top-10`,
    [modo, numero, partida, cuadros, ok.length],
  );

  return (
    <div className="jg">
      <div className="jg-modos" role="tablist">
        <button type="button" role="tab" aria-selected={modo === "dia"} className={modo === "dia" ? "is-on" : ""} onClick={() => irA("dia")}>
          Reto del día #{numero}
        </button>
        <button type="button" role="tab" aria-selected={modo === "practica"} className={modo === "practica" ? "is-on" : ""} onClick={() => irA("practica")}>
          Práctica
        </button>
      </div>

      {modo === "practica" && (
        <div className="jg-dif t10-filtros">
          <select
            aria-label="Equipo"
            value={filtroEquipo}
            onChange={(e) => {
              const v = e.target.value ? Number(e.target.value) : "";
              setFiltroEquipo(v);
              nuevaLista(v, filtroTipo);
            }}
          >
            <option value="">Todos los equipos</option>
            {equipos.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
          <select
            aria-label="Estadística"
            value={filtroTipo}
            onChange={(e) => {
              const v = e.target.value as TipoTop10 | "";
              setFiltroTipo(v);
              nuevaLista(filtroEquipo, v);
            }}
          >
            <option value="">Minutos, goles y asistencias</option>
            <option value="minutos">Más minutos</option>
            <option value="goles">Más goles</option>
            <option value="asistencias">Más asistencias</option>
          </select>
        </div>
      )}

      <div className="t10-cab">
        {/* eslint-disable-next-line @next/next/no-img-element -- escudo de la CDN de la API */}
        <img src={escudo(partida.equipoId)} alt="" width={48} height={48} />
        <div>
          <p className="t10-cab__tit">{partida.titulo}</p>
          <p className="t10-cab__sub">{partida.subtitulo}</p>
        </div>
      </div>

      {!nivel && !terminado ? (
        <ElegirNivel onElegir={empezar} segundos={SEGUNDOS_TOP10} />
      ) : (
        <div className={`jg-cuerpo t10-cuerpo${terminado ? "" : " is-jugando"}`}>
          <ol className={`t10-lista${cargando ? " is-cargando" : ""}`}>
            {partida.filas.map((f) => {
              const visto = ok.includes(f.pos);
              const mostrar = visto || terminado;
              return (
                <li key={f.pos} className={`t10-fila${visto ? " is-ok" : terminado ? " is-falta" : ""}`}>
                  <span className="t10-fila__pos">{f.pos}</span>
                  {f.bandera ? (
                    // eslint-disable-next-line @next/next/no-img-element -- banderas SVG de la CDN de la API
                    <img src={bandera(f.bandera)} alt={f.pais ?? ""} title={f.pais ?? undefined} width={28} height={20} className="t10-fila__bandera" />
                  ) : (
                    <span className="t10-fila__bandera" title={f.pais ?? undefined} />
                  )}
                  <span className="t10-fila__nombre">{mostrar ? f.nombre : "?"}</span>
                  <span className="t10-fila__valor">{UNIDAD[partida.tipo](f.valor)}</span>
                </li>
              );
            })}
          </ol>

          <div className="jg-panel">
            {nivel && !terminado && (
              <span className={`jreloj${restante <= 10 ? " is-poco" : ""}`} aria-label="Tiempo que queda">
                <Timer className="ico-txt" aria-hidden /> {reloj(restante)} · {NIVELES[nivel].nombre} · {ok.length}/10
              </span>
            )}

            {terminado ? (
              <div className={`jg-final ${completo ? "is-ok" : ok.length >= 5 ? "is-ok" : "is-mal"}`}>
                <div>
                  <p className="jg-final__tit">{completo ? "¡Los diez!" : `${ok.length} de 10`}</p>
                  <p className="jg-final__ctx">
                    {completo
                      ? "Pleno."
                      : agotado
                        ? "Se acabó el tiempo. En gris, los que faltaron."
                        : "En gris, los que faltaron."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="jg-busca">
                <label htmlFor="t10-q" className="jg-busca__lab">
                  Escribe un jugador
                </label>
                <input
                  id="t10-q"
                  ref={entrada}
                  type="text"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  enterKeyHint="done"
                  placeholder="Apellido o nombre…"
                  value={texto}
                  onChange={(e) => escribir(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") fallar();
                  }}
                />
                <p className="pz-ayuda" style={{ margin: 0 }}>
                  Si está en la lista, aparece solo. Vale el apellido o el nombre por el que se le conoce.
                </p>
                <button type="button" className="btn btn--ghost" onClick={rendirse}>
                  Me rindo
                </button>
              </div>
            )}

            {fallos.length > 0 && !terminado && (
              <ul className="jg-fallos">
                {fallos.map((f) => (
                  <li key={f}>✗ {f}</li>
                ))}
              </ul>
            )}

            {terminado && nivel && (
              <CierreJuego juego="top10" dia={modo === "dia" ? numero : null} nivel={nivel} puntos={puntos} resultado={`${ok.length}/10`} />
            )}
            {terminado && (
              <div className="jg-acciones">
                {nativo ? (
                  <button type="button" className="btn btn--accent" onClick={() => navigator.share({ text: compartir }).catch(() => {})}>
                    Compartir resultado
                  </button>
                ) : (
                  <a className="btn btn--accent" href={`https://wa.me/?text=${encodeURIComponent(compartir)}`} target="_blank" rel="noopener noreferrer">
                    Compartir por WhatsApp
                  </a>
                )}
                <button
                  type="button"
                  className="btn"
                  onClick={() =>
                    navigator.clipboard
                      .writeText(compartir)
                      .then(() => setCopiado(true))
                      .catch(() => {})
                  }
                >
                  {copiado ? "¡Copiado!" : "Copiar"}
                </button>
                {modo === "practica" ? (
                  <button type="button" className="btn btn--ghost" onClick={() => nuevaLista()} disabled={cargando}>
                    Otra lista →
                  </button>
                ) : (
                  <button type="button" className="btn btn--ghost" onClick={() => irA("practica")}>
                    Seguir en práctica →
                  </button>
                )}
              </div>
            )}
            {modo === "dia" && terminado && <p className="pz-ayuda">Mañana, otra lista.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
