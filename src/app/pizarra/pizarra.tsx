"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FORMACIONES, huecoParaJugador, huecos, onceAutomatico, type Lado } from "@/lib/pizarra/formaciones";
import {
  codificar,
  decodificar,
  estadoInicial,
  vacio,
  type Estado,
  type Flecha,
  type PorLado,
  type Punto,
  type TipoFlecha,
} from "@/lib/pizarra/estado";
import { nombreCorto } from "@/lib/sports/nombres";

/**
 * Pizarra táctica (20-oct, pedido del dueño). Cada equipo tiene su formación
 * y sus 11 huecos; un hueco vacío enseña "+" (toca para elegir jugador) y a
 * la lista de cada lado se le puede arrastrar un jugador al campo. Las fichas
 * colocadas se mueven libremente (ratón o dedo) y, soltadas fuera del campo,
 * vuelven a la lista.
 *
 * Fase 2: flechas de pase (continua) y de carrera (discontinua), balón,
 * deshacer y enlace que lleva la pizarra entera (`?p=`, ver `estado.ts`).
 *
 * Las posiciones se guardan en coordenadas canónicas (ver `formaciones.ts`):
 * horizontal en escritorio (local a la izquierda) y vertical en el móvil
 * (local abajo), la misma jugada se ve igual en los dos.
 */

export type JugadorPizarra = {
  id: number;
  name: string;
  number: number | null;
  position: string | null;
  photo: string | null;
};
export type EquipoConPlantilla = { id: number; name: string; logo: string; plantilla: JugadorPizarra[] };
type Modo = "mover" | TipoFlecha;
type Orden = "posicion" | "numero";

const LADOS: Lado[] = ["local", "visitante"];
const POS_ES: Record<string, string> = { Goalkeeper: "POR", Defender: "DEF", Midfielder: "MED", Attacker: "DEL" };
const COLOR: PorLado<string> = { local: "#3b82f6", visitante: "#ff5b8a" };
const COLOR_FLECHA: Record<TipoFlecha, string> = { pase: "#ffffff", carrera: "#f5c542" };
const MAX_HISTORIAL = 50;
const GRUPOS_POS: [string, string][] = [
  ["Goalkeeper", "Porteros"],
  ["Defender", "Defensas"],
  ["Midfielder", "Centrocampistas"],
  ["Attacker", "Delanteros"],
];
const porNumero = (a: JugadorPizarra, b: JugadorPizarra) => (a.number ?? 999) - (b.number ?? 999);
const normal = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

/** Cara del jugador o, si no hay foto, su dorsal. */
function Cara({ j, color, tam }: { j: JugadorPizarra; color: string; tam: number }) {
  return j.photo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={j.photo}
      alt=""
      width={tam}
      height={tam}
      className="pz-cara"
      style={{ width: tam, height: tam, borderColor: color }}
      draggable={false}
    />
  ) : (
    <span className="pz-jug__num" style={{ background: color, width: tam, height: tam }}>
      {j.number ?? ""}
    </span>
  );
}
const limitar = (v: number) => Math.min(0.98, Math.max(0.02, v));

export default function Pizarra({
  local,
  visitante,
  inicial,
}: {
  local: EquipoConPlantilla;
  visitante: EquipoConPlantilla;
  /** `?p=` de un enlace compartido. */
  inicial?: string;
}) {
  const router = useRouter();
  const equipos: PorLado<EquipoConPlantilla> = { local, visitante };
  const [estado, setEstado] = useState<Estado>(
    () =>
      decodificar(inicial, {
        local: local.plantilla.map((p) => p.id),
        visitante: visitante.plantilla.map((p) => p.id),
      }) ?? estadoInicial(),
  );
  const [historial, setHistorial] = useState<Estado[]>([]);
  const [modo, setModo] = useState<Modo>("mover");
  const [elegir, setElegir] = useState<{ lado: Lado; hueco: number } | null>(null);
  const [fantasma, setFantasma] = useState<{ lado: Lado; id: number; cx: number; cy: number } | null>(null);
  const [trazo, setTrazo] = useState<Flecha | null>(null);
  const [horizontal, setHorizontal] = useState(false);
  const [compartiendo, setCompartiendo] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  /** La última ficha movida va encima de las demás. */
  const [arriba, setArriba] = useState<string | null>(null);
  const [orden, setOrden] = useState<PorLado<Orden>>({ local: "posicion", visitante: "posicion" });
  const [busca, setBusca] = useState("");
  const campo = useRef<HTMLDivElement>(null);
  const gesto = useRef<{ x: number; y: number; activo: boolean } | null>(null);
  const { formacion, once, movidos, flechas, balon } = estado;

  // Campo horizontal en escritorio, vertical en el móvil. Arranca vertical
  // (= SSR) y se ajusta al montar.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 900px)");
    const aplicar = () => setHorizontal(mq.matches);
    aplicar();
    mq.addEventListener("change", aplicar);
    return () => mq.removeEventListener("change", aplicar);
  }, []);

  /** Cambio que se puede deshacer. */
  const cambiar = (f: (e: Estado) => Estado) => {
    setHistorial((h) => [...h.slice(-(MAX_HISTORIAL - 1)), estado]);
    setEstado(f(estado));
  };
  const deshacer = () => {
    const previo = historial.at(-1);
    if (!previo) return;
    setHistorial((h) => h.slice(0, -1));
    setEstado(previo);
  };

  const jugador = (lado: Lado, id: number | null) =>
    id == null ? null : (equipos[lado].plantilla.find((p) => p.id === id) ?? null);
  const enCampo = (lado: Lado, id: number) => once[lado].includes(id);

  const aPantalla = (p: Punto) =>
    horizontal ? { left: p.x * 100, top: p.y * 100 } : { left: p.y * 100, top: (1 - p.x) * 100 };
  const aCanonico = (cx: number, cy: number, dentro = true): Punto | null => {
    const r = campo.current?.getBoundingClientRect();
    if (!r) return null;
    const px = (cx - r.left) / r.width;
    const py = (cy - r.top) / r.height;
    if (dentro && (px < 0 || px > 1 || py < 0 || py > 1)) return null;
    return horizontal ? { x: limitar(px), y: limitar(py) } : { x: limitar(1 - py), y: limitar(px) };
  };
  const posicion = (lado: Lado, i: number): Punto => movidos[`${lado}:${i}`] ?? huecos(formacion[lado], lado)[i];

  const sinMovido = (m: Record<string, Punto>, clave: string) => {
    const { [clave]: _quitado, ...resto } = m;
    return resto;
  };
  const colocar = (lado: Lado, hueco: number, id: number | null) =>
    cambiar((e) => {
      const fila = e.once[lado].map((x) => (x === id ? null : x)); // sin duplicados
      fila[hueco] = id;
      return { ...e, once: { ...e.once, [lado]: fila }, movidos: sinMovido(e.movidos, `${lado}:${hueco}`) };
    });

  // ---- Fichas y balón: se mueven libres; una ficha fuera del campo vuelve
  // a la lista. La instantánea para deshacer se toma al empezar a moverse.
  // La ficha (o "balon") viaja en `data-clave`: "local:3".
  const claveDe = (e: React.PointerEvent) => (e.currentTarget as HTMLElement).dataset.clave ?? "";
  const moverDown = (e: React.PointerEvent) => {
    const clave = claveDe(e);
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    gesto.current = { x: e.clientX, y: e.clientY, activo: false };
    setArriba(clave);
  };
  const moverMove = (e: React.PointerEvent) => {
    const clave = claveDe(e);
    const g = gesto.current;
    if (!g) return;
    if (!g.activo) {
      if (Math.hypot(e.clientX - g.x, e.clientY - g.y) < 4) return;
      g.activo = true;
      setHistorial((h) => [...h.slice(-(MAX_HISTORIAL - 1)), estado]);
    }
    const p = aCanonico(e.clientX, e.clientY);
    if (!p) return;
    setEstado((s) => (clave === "balon" ? { ...s, balon: p } : { ...s, movidos: { ...s.movidos, [clave]: p } }));
  };
  const moverUp = (e: React.PointerEvent) => {
    const [ladoTxt, iTxt] = claveDe(e).split(":");
    const lado = LADOS.find((l) => l === ladoTxt) ?? null;
    const i = Number(iTxt);
    const g = gesto.current;
    gesto.current = null;
    if (!g || !lado) return;
    if (!g.activo) return abrirElegir({ lado, hueco: i }); // toque: cambiar jugador
    if (!aCanonico(e.clientX, e.clientY)) {
      // Fuera del campo: a la lista (sin otra entrada en el historial).
      setEstado((s) => {
        const fila = [...s.once[lado]];
        fila[i] = null;
        return { ...s, once: { ...s.once, [lado]: fila }, movidos: sinMovido(s.movidos, `${lado}:${i}`) };
      });
    }
  };

  // ---- Jugadores de la lista: tocar = al mejor hueco libre; arrastrar = al
  // hueco más cercano a donde se suelte.
  const listaDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    gesto.current = { x: e.clientX, y: e.clientY, activo: false };
  };
  const listaMove = (lado: Lado, id: number) => (e: React.PointerEvent) => {
    const g = gesto.current;
    if (!g) return;
    if (!g.activo && Math.hypot(e.clientX - g.x, e.clientY - g.y) < 6) return;
    g.activo = true;
    setFantasma({ lado, id, cx: e.clientX, cy: e.clientY });
  };
  const listaUp = (lado: Lado, j: JugadorPizarra) => (e: React.PointerEvent) => {
    const g = gesto.current;
    gesto.current = null;
    setFantasma(null);
    if (!g) return;
    if (!g.activo) {
      const h = huecoParaJugador(formacion[lado], once[lado], j.position);
      if (h >= 0) colocar(lado, h, j.id);
      return;
    }
    const p = aCanonico(e.clientX, e.clientY);
    if (!p) return;
    let mejor = 0;
    let dist = Infinity;
    huecos(formacion[lado], lado).forEach((_, i) => {
      const q = posicion(lado, i);
      const d = Math.hypot(q.x - p.x, q.y - p.y);
      if (d < dist) {
        dist = d;
        mejor = i;
      }
    });
    colocar(lado, mejor, j.id);
  };
  const cancelar = () => {
    gesto.current = null;
    setFantasma(null);
    setTrazo(null);
  };

  // ---- Flechas: en modo pase/carrera, se dibujan arrastrando sobre el campo.
  const dibujoDown = (e: React.PointerEvent) => {
    if (modo === "mover") return;
    const p = aCanonico(e.clientX, e.clientY);
    if (!p) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setTrazo({ a: p, b: p, tipo: modo });
  };
  const dibujoMove = (e: React.PointerEvent) => {
    if (!trazo) return;
    const p = aCanonico(e.clientX, e.clientY, false);
    if (p) setTrazo({ ...trazo, b: p });
  };
  const dibujoUp = () => {
    if (!trazo) return;
    const t = trazo;
    setTrazo(null);
    // Un toque sin arrastrar no deja una flecha de longitud cero.
    if (Math.hypot(t.b.x - t.a.x, t.b.y - t.a.y) < 0.03) return;
    cambiar((e) => ({ ...e, flechas: [...e.flechas, t].slice(-40) }));
  };

  // ---- Botones
  const vaciar = () =>
    cambiar((e) => ({ ...e, once: { local: vacio(), visitante: vacio() }, movidos: {}, flechas: [] }));
  const rellenar = () =>
    cambiar((e) => {
      const nuevo = { ...e.once };
      for (const lado of LADOS) {
        const libres = equipos[lado].plantilla.filter((p) => !e.once[lado].includes(p.id));
        const auto = onceAutomatico(e.formacion[lado], libres);
        nuevo[lado] = e.once[lado].map((id, i) => id ?? auto[i]);
      }
      return { ...e, once: nuevo };
    });
  const cambiarFormacion = (lado: Lado, f: string) =>
    cambiar((e) => ({
      ...e,
      formacion: { ...e.formacion, [lado]: f },
      movidos: Object.fromEntries(Object.entries(e.movidos).filter(([k]) => !k.startsWith(`${lado}:`))),
    }));
  const alternarBalon = () => cambiar((e) => ({ ...e, balon: e.balon ? null : { x: 0.5, y: 0.5 } }));

  const avisar = (texto: string) => {
    setAviso(texto);
    setTimeout(() => setAviso(null), 2500);
  };

  const compartirEnlace = async () => {
    const url = `${window.location.origin}/pizarra?local=${local.id}&visitante=${visitante.id}&p=${codificar(estado)}`;
    const texto = `${local.name} vs ${visitante.name}: mira mi pizarra`;
    if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
      try {
        await navigator.share({ url, text: texto });
      } catch {
        // Hoja cerrada: no es un error.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      avisar("Enlace copiado");
    } catch {
      window.prompt("Copia el enlace:", url);
    }
  };

  const compartirImagen = async () => {
    setCompartiendo(true);
    try {
      const blob = await imagenPizarra({ equipos, estado, posicion, jugador });
      if (!blob) return;
      const archivo = new File([blob], "pizarra-soyreinaldo.png", { type: "image/png" });
      const texto = `${local.name} vs ${visitante.name} en la pizarra de soyreinaldo.com`;
      if (navigator.canShare?.({ files: [archivo] })) {
        try {
          await navigator.share({ files: [archivo], text: texto });
        } catch {
          // Hoja cerrada: no es un error.
        }
        return;
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = archivo.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
    } finally {
      setCompartiendo(false);
    }
  };

  const chip = (lado: Lado, j: JugadorPizarra) => {
    const dentro = enCampo(lado, j.id);
    return (
      <button
        key={j.id}
        type="button"
        className={`pz-jug${dentro ? " pz-jug--dentro" : ""}`}
        disabled={dentro}
        onPointerDown={dentro ? undefined : listaDown}
        onPointerMove={dentro ? undefined : listaMove(lado, j.id)}
        onPointerUp={dentro ? undefined : listaUp(lado, j)}
        onPointerCancel={cancelar}
      >
        <Cara j={j} color={COLOR[lado]} tam={26} />
        <span className="pz-jug__nom">{nombreCorto(j.name)}</span>
        <span className="mono pz-jug__pos">
          {dentro ? "✓" : orden[lado] === "numero" ? (POS_ES[j.position ?? ""] ?? "") : (j.number ?? "")}
        </span>
      </button>
    );
  };

  const lista = (lado: Lado) => {
    const plantilla = equipos[lado].plantilla;
    return (
      <div className={`pz-lista pz-lista--${lado}`}>
        <div className="pz-lista__cab">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={equipos[lado].logo} alt="" width={22} height={22} />
          <b>{equipos[lado].name}</b>
          <select
            aria-label={`Formación de ${equipos[lado].name}`}
            value={formacion[lado]}
            onChange={(e) => cambiarFormacion(lado, e.target.value)}
          >
            {FORMACIONES.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </div>
        <div className="pz-orden" role="radiogroup" aria-label="Ordenar jugadores">
          {(
            [
              ["posicion", "Por posición"],
              ["numero", "Por dorsal"],
            ] as [Orden, string][]
          ).map(([o, etiqueta]) => (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={orden[lado] === o}
              className={orden[lado] === o ? "on" : ""}
              onClick={() => setOrden((x) => ({ ...x, [lado]: o }))}
            >
              {etiqueta}
            </button>
          ))}
        </div>
        <div className="pz-lista__jug">
          {plantilla.length === 0 && <p className="pz-vacio">No hay plantilla disponible de este equipo ahora mismo.</p>}
          {orden[lado] === "numero"
            ? [...plantilla].sort(porNumero).map((j) => chip(lado, j))
            : GRUPOS_POS.map(([pos, titulo]) => {
                const delGrupo = plantilla.filter((j) => j.position === pos).sort(porNumero);
                if (!delGrupo.length) return null;
                return [
                  <span key={`t-${pos}`} className="mono pz-lista__grupo">
                    {titulo}
                  </span>,
                  ...delGrupo.map((j) => chip(lado, j)),
                ];
              })}
        </div>
      </div>
    );
  };

  // Flechas en un SVG con las mismas proporciones que el campo: así la
  // punta no se deforma al escalar.
  const VW = horizontal ? 160 : 100;
  const VH = horizontal ? 100 : 140;
  const enSvg = (p: Punto) => {
    const { left, top } = aPantalla(p);
    return { x: (left / 100) * VW, y: (top / 100) * VH };
  };
  const pintarFlecha = (f: Flecha, k: string | number) => {
    const a = enSvg(f.a);
    const b = enSvg(f.b);
    return (
      <line
        key={k}
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        stroke={COLOR_FLECHA[f.tipo]}
        strokeWidth={0.9}
        strokeLinecap="round"
        strokeDasharray={f.tipo === "carrera" ? "2.2 1.6" : undefined}
        markerEnd={`url(#pz-punta-${f.tipo})`}
      />
    );
  };

  const abrirElegir = (x: { lado: Lado; hueco: number } | null) => {
    setBusca("");
    setElegir(x);
  };
  const candidatos = elegir ? equipos[elegir.lado].plantilla : [];
  const rolElegido = elegir ? huecos(formacion[elegir.lado], elegir.lado)[elegir.hueco] : null;
  const dibujando = modo !== "mover";

  return (
    <div className="pz">
      <div className="pz-botones">
        <button type="button" className="btn" onClick={() => router.push("/pizarra")}>
          Empezar de cero
        </button>
        <button type="button" className="btn" onClick={vaciar}>
          Vaciar el campo
        </button>
        <button type="button" className="btn" onClick={() => cambiar((e) => ({ ...e, movidos: {} }))}>
          Posición inicial
        </button>
        <button type="button" className="btn" onClick={rellenar}>
          Rellenar once
        </button>
        <button type="button" className="btn" onClick={compartirEnlace}>
          🔗 Compartir enlace
        </button>
        <button type="button" className="btn btn--accent" onClick={compartirImagen} disabled={compartiendo}>
          📸 {compartiendo ? "Preparando…" : "Compartir imagen"}
        </button>
      </div>

      <div className="pz-herramientas" role="toolbar" aria-label="Herramientas de la pizarra">
        <div className="pz-modos" role="radiogroup" aria-label="Qué hace el dedo en el campo">
          {(
            [
              ["mover", "✋ Mover"],
              ["pase", "➜ Pase"],
              ["carrera", "⤳ Carrera"],
            ] as [Modo, string][]
          ).map(([m, etiqueta]) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={modo === m}
              className={modo === m ? "on" : ""}
              onClick={() => setModo(m)}
            >
              {etiqueta}
            </button>
          ))}
        </div>
        <button type="button" className={`pz-tool${balon ? " on" : ""}`} onClick={alternarBalon} aria-pressed={!!balon}>
          ⚽ Balón
        </button>
        <button
          type="button"
          className="pz-tool"
          onClick={() => cambiar((e) => ({ ...e, flechas: [] }))}
          disabled={flechas.length === 0}
        >
          Borrar flechas
        </button>
        <button type="button" className="pz-tool" onClick={deshacer} disabled={historial.length === 0}>
          ↶ Deshacer
        </button>
      </div>

      <div className="pz-cuerpo">
        {lista("local")}
        <div
          ref={campo}
          className={`pz-campo${horizontal ? " pz-campo--h" : ""}${dibujando ? " pz-campo--dibujo" : ""}`}
          aria-label="Campo de fútbol"
          onPointerDown={dibujoDown}
          onPointerMove={dibujoMove}
          onPointerUp={dibujoUp}
          onPointerCancel={cancelar}
        >
          {horizontal ? <div className="pitch-midv" /> : <div className="pitch-mid" />}
          <div className="pitch-circle" />
          {horizontal ? (
            <>
              <div className="pitch-box l" />
              <div className="pitch-box r" />
            </>
          ) : (
            <>
              <div className="pitch-box t" />
              <div className="pitch-box b" />
            </>
          )}
          <svg className="pz-flechas" viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="none" aria-hidden>
            <defs>
              {(Object.keys(COLOR_FLECHA) as TipoFlecha[]).map((t) => (
                <marker
                  key={t}
                  id={`pz-punta-${t}`}
                  viewBox="0 0 10 10"
                  refX="7"
                  refY="5"
                  markerWidth="4"
                  markerHeight="4"
                  orient="auto-start-reverse"
                >
                  <path d="M0 0 L10 5 L0 10 z" fill={COLOR_FLECHA[t]} />
                </marker>
              ))}
            </defs>
            {flechas.map((f, k) => pintarFlecha(f, k))}
            {trazo && pintarFlecha(trazo, "trazo")}
          </svg>
          {LADOS.map((lado) =>
            huecos(formacion[lado], lado).map((h, i) => {
              const j = jugador(lado, once[lado][i]);
              const { left, top } = aPantalla(posicion(lado, i));
              const estilo = { left: `${left}%`, top: `${top}%` };
              if (!j) {
                return (
                  <button
                    key={`${lado}-${i}`}
                    type="button"
                    className="pz-hueco"
                    style={{ ...estilo, borderColor: COLOR[lado], color: COLOR[lado] }}
                    onClick={() => abrirElegir({ lado, hueco: i })}
                    aria-label={`Añadir ${h.rol} de ${equipos[lado].name}`}
                  >
                    +<span className="pz-hueco__rol">{h.rol}</span>
                  </button>
                );
              }
              const clave = `${lado}:${i}`;
              return (
                <div
                  key={`${lado}-${i}`}
                  className="pz-ficha"
                  style={arriba === clave ? { ...estilo, zIndex: 4 } : estilo}
                  data-clave={clave}
                  onPointerDown={moverDown}
                  onPointerMove={moverMove}
                  onPointerUp={moverUp}
                  onPointerCancel={cancelar}
                  role="button"
                  aria-label={`${j.name}, arrástralo para moverlo`}
                >
                  {j.photo ? (
                    <span className="pz-ficha__cara">
                      <Cara j={j} color={COLOR[lado]} tam={36} />
                      {j.number != null && (
                        <span className="pz-ficha__dorsal" style={{ background: COLOR[lado] }}>
                          {j.number}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="pz-ficha__num" style={{ background: COLOR[lado] }}>
                      {j.number ?? ""}
                    </span>
                  )}
                  <span className="pz-ficha__nom">{nombreCorto(j.name)}</span>
                </div>
              );
            }),
          )}
          {balon && (
            <div
              className="pz-balon"
              style={{
                left: `${aPantalla(balon).left}%`,
                top: `${aPantalla(balon).top}%`,
                zIndex: arriba === "balon" ? 5 : 3,
              }}
              data-clave="balon"
              onPointerDown={moverDown}
              onPointerMove={moverMove}
              onPointerUp={moverUp}
              onPointerCancel={cancelar}
              role="button"
              aria-label="Balón, arrástralo para moverlo"
            >
              ⚽
            </div>
          )}
        </div>
        {lista("visitante")}
      </div>

      <p className="pz-ayuda">
        {dibujando
          ? `Arrastra sobre el campo para dibujar ${modo === "pase" ? "un pase" : "una carrera"}. Vuelve a «Mover» para colocar jugadores.`
          : "Toca un «+» o un jugador de la lista para colocarlo, o arrástralo al campo. Las fichas se mueven libremente; suéltalas fuera del campo para quitarlas."}
      </p>

      {aviso && (
        <div className="pz-aviso" role="status">
          {aviso}
        </div>
      )}

      {fantasma && (
        <div className="pz-fantasma" style={{ left: fantasma.cx, top: fantasma.cy }}>
          <span className="pz-ficha__num" style={{ background: COLOR[fantasma.lado] }}>
            {jugador(fantasma.lado, fantasma.id)?.number ?? ""}
          </span>
        </div>
      )}

      {elegir && (
        <div className="pmodal-backdrop" onClick={() => abrirElegir(null)} role="dialog" aria-modal>
          <div className="pmodal pz-elegir" onClick={(e) => e.stopPropagation()}>
            <h3>
              {rolElegido?.rol} · {equipos[elegir.lado].name}
            </h3>
            <input
              type="search"
              className="pz-busca__input"
              placeholder="Busca por nombre o dorsal…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              aria-label="Buscar jugador"
              autoFocus
            />
            <div className="pz-elegir__lista">
              {once[elegir.lado][elegir.hueco] != null && (
                <button
                  type="button"
                  className="pz-jug"
                  onClick={() => {
                    colocar(elegir.lado, elegir.hueco, null);
                    setElegir(null);
                  }}
                >
                  <span className="pz-jug__nom">Quitar del campo</span>
                </button>
              )}
              {[...candidatos]
                .filter((j) => {
                  const q = normal(busca.trim());
                  return !q || normal(j.name).includes(q) || String(j.number ?? "") === q;
                })
                .sort(
                  (a, b) =>
                    Number(POS_ES[b.position ?? ""] === posGrupo(rolElegido?.grupo)) -
                    Number(POS_ES[a.position ?? ""] === posGrupo(rolElegido?.grupo)),
                )
                .map((j) => {
                  const dentro = enCampo(elegir.lado, j.id);
                  return (
                    <button
                      key={j.id}
                      type="button"
                      className={`pz-jug${dentro ? " pz-jug--dentro" : ""}`}
                      onClick={() => {
                        colocar(elegir.lado, elegir.hueco, j.id);
                        setElegir(null);
                      }}
                    >
                      <Cara j={j} color={COLOR[elegir.lado]} tam={30} />
                      <span className="pz-jug__nom">
                        {j.number != null && <b className="pz-elegir__num">{j.number}</b>}
                        {nombreCorto(j.name)}
                      </span>
                      <span className="mono pz-jug__pos">{dentro ? "en el campo" : (POS_ES[j.position ?? ""] ?? "")}</span>
                    </button>
                  );
                })}
            </div>
            <button type="button" className="btn btn--ghost" style={{ width: "100%", marginTop: 12 }} onClick={() => abrirElegir(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const posGrupo = (g?: string) => ({ G: "POR", D: "DEF", M: "MED", F: "DEL" })[g ?? ""] ?? "";

/** La pizarra como PNG vertical 1080×1350 (la medida de Instagram), dibujada
 * a mano en un canvas: sin fotos, para no depender de imágenes de otro
 * dominio (el canvas quedaría bloqueado). */
async function imagenPizarra(o: {
  equipos: PorLado<EquipoConPlantilla>;
  estado: Estado;
  posicion: (lado: Lado, i: number) => Punto;
  jugador: (lado: Lado, id: number | null) => JugadorPizarra | null;
}): Promise<Blob | null> {
  const W = 1080;
  const H = 1350;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  if (!g) return null;
  const fondo = g.createLinearGradient(0, 0, 0, H);
  fondo.addColorStop(0, "#0a1030");
  fondo.addColorStop(1, "#1b2a6b");
  g.fillStyle = fondo;
  g.fillRect(0, 0, W, H);

  g.textAlign = "center";
  g.fillStyle = "#e8ecff";
  g.font = "800 46px sans-serif";
  g.fillText(`${o.equipos.local.name} vs ${o.equipos.visitante.name}`, W / 2, 74, W - 80);
  g.font = "28px sans-serif";
  g.fillStyle = "#9aa4d6";
  g.fillText(`${o.estado.formacion.local}  ·  ${o.estado.formacion.visitante}`, W / 2, 118);

  // Campo vertical: local abajo.
  const cx = 70;
  const cy = 150;
  const cw = W - 140;
  const ch = H - 150 - 110;
  const aLienzo = (p: Punto) => ({ x: cx + p.y * cw, y: cy + (1 - p.x) * ch });
  g.fillStyle = "#10271c";
  g.beginPath();
  g.roundRect(cx, cy, cw, ch, 24);
  g.fill();
  g.strokeStyle = "rgba(255,255,255,0.22)";
  g.lineWidth = 3;
  g.stroke();
  g.beginPath();
  g.moveTo(cx, cy + ch / 2);
  g.lineTo(cx + cw, cy + ch / 2);
  g.stroke();
  g.beginPath();
  g.arc(cx + cw / 2, cy + ch / 2, 90, 0, Math.PI * 2);
  g.stroke();
  g.strokeRect(cx + cw * 0.26, cy, cw * 0.48, ch * 0.12);
  g.strokeRect(cx + cw * 0.26, cy + ch * 0.88, cw * 0.48, ch * 0.12);

  // Flechas debajo de las fichas.
  for (const f of o.estado.flechas) {
    const a = aLienzo(f.a);
    const b = aLienzo(f.b);
    const color = COLOR_FLECHA[f.tipo];
    g.strokeStyle = color;
    g.fillStyle = color;
    g.lineWidth = 7;
    g.lineCap = "round";
    g.setLineDash(f.tipo === "carrera" ? [22, 16] : []);
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const fin = { x: b.x - Math.cos(ang) * 18, y: b.y - Math.sin(ang) * 18 };
    g.beginPath();
    g.moveTo(a.x, a.y);
    g.lineTo(fin.x, fin.y);
    g.stroke();
    g.setLineDash([]);
    g.beginPath();
    g.moveTo(b.x, b.y);
    g.lineTo(b.x - Math.cos(ang - 0.45) * 34, b.y - Math.sin(ang - 0.45) * 34);
    g.lineTo(b.x - Math.cos(ang + 0.45) * 34, b.y - Math.sin(ang + 0.45) * 34);
    g.closePath();
    g.fill();
  }

  // Caras: la CDN de fotos manda CORS abierto, así que el canvas no queda
  // bloqueado. Si una no carga a tiempo, esa ficha sale con el dorsal.
  const fotos = new Map<number, HTMLImageElement>();
  await Promise.all(
    LADOS.flatMap((lado) =>
      o.estado.once[lado].map((id) => {
        const j = o.jugador(lado, id);
        if (!j?.photo) return null;
        const foto = j.photo;
        return new Promise<void>((listo) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          const fin = setTimeout(listo, 4000);
          img.onload = () => {
            clearTimeout(fin);
            fotos.set(j.id, img);
            listo();
          };
          img.onerror = () => {
            clearTimeout(fin);
            listo();
          };
          img.src = foto;
        });
      }),
    ),
  );

  for (const lado of LADOS) {
    o.estado.once[lado].forEach((id, i) => {
      const j = o.jugador(lado, id);
      if (!j) return;
      const { x, y } = aLienzo(o.posicion(lado, i));
      const foto = fotos.get(j.id);
      g.beginPath();
      g.arc(x, y, 38, 0, Math.PI * 2);
      g.fillStyle = foto ? "#e2e8f0" : COLOR[lado];
      g.fill();
      if (foto) {
        g.save();
        g.beginPath();
        g.arc(x, y, 38, 0, Math.PI * 2);
        g.clip();
        g.drawImage(foto, x - 38, y - 38, 76, 76);
        g.restore();
      }
      g.beginPath();
      g.arc(x, y, 38, 0, Math.PI * 2);
      g.lineWidth = 5;
      g.strokeStyle = foto ? COLOR[lado] : "#ffffff";
      g.stroke();
      if (foto) {
        if (j.number != null) {
          g.beginPath();
          g.arc(x + 30, y + 28, 17, 0, Math.PI * 2);
          g.fillStyle = COLOR[lado];
          g.fill();
          g.lineWidth = 3;
          g.strokeStyle = "#ffffff";
          g.stroke();
          g.fillStyle = "#ffffff";
          g.font = "800 19px sans-serif";
          g.fillText(String(j.number), x + 30, y + 35);
        }
      } else {
        g.fillStyle = "#ffffff";
        g.font = "800 30px sans-serif";
        g.fillText(String(j.number ?? ""), x, y + 11);
      }
      g.font = "600 24px sans-serif";
      g.shadowColor = "rgba(0,0,0,0.8)";
      g.shadowBlur = 6;
      g.fillStyle = "#ffffff";
      g.fillText(nombreCorto(j.name), x, y + 70, 170);
      g.shadowBlur = 0;
    });
  }

  if (o.estado.balon) {
    const { x, y } = aLienzo(o.estado.balon);
    g.font = "44px sans-serif";
    g.fillText("⚽", x, y + 15);
  }

  g.font = "700 34px sans-serif";
  g.fillStyle = "#3b82f6";
  g.fillText("soyreinaldo.com/pizarra", W / 2, H - 46);
  return new Promise((r) => c.toBlob(r, "image/png"));
}
