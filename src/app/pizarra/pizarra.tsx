"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FORMACIONES, huecoParaJugador, huecos, onceAutomatico, type Lado } from "@/lib/pizarra/formaciones";
import {
  codificar,
  decodificar,
  estadoInicial,
  vacio,
  MAX_ETAPAS,
  type Estado,
  type Etapa,
  type Flecha,
  type PorLado,
  type Punto,
  type TipoFlecha,
} from "@/lib/pizarra/estado";
import { duracion, fotograma, type Fotograma } from "@/lib/pizarra/animacion";
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
  preparado,
  partido,
}: {
  local: EquipoConPlantilla;
  visitante: EquipoConPlantilla;
  /** `?p=` de un enlace compartido. */
  inicial?: string;
  /** Pizarra ya montada (alineación real de `?partido=`). */
  preparado?: Estado;
  /** Partido del que sale (viaja en el enlace compartido). */
  partido?: number;
}) {
  const router = useRouter();
  const equipos: PorLado<EquipoConPlantilla> = { local, visitante };
  const [estado, setEstado] = useState<Estado>(
    () =>
      decodificar(inicial, {
        local: local.plantilla.map((p) => p.id),
        visitante: visitante.plantilla.map((p) => p.id),
      }) ??
      preparado ??
      estadoInicial(),
  );
  const [historial, setHistorial] = useState<Estado[]>([]);
  const [modo, setModo] = useState<Modo>("mover");
  const [elegir, setElegir] = useState<{ lado: Lado; hueco: number } | null>(null);
  const [fantasma, setFantasma] = useState<{ lado: Lado; id: number; cx: number; cy: number } | null>(null);
  const [trazo, setTrazo] = useState<Flecha | null>(null);
  const [horizontal, setHorizontal] = useState(false);
  const [compartiendo, setCompartiendo] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  /** Fotograma de la animación mientras se reproduce. */
  const [fot, setFot] = useState<Fotograma | null>(null);
  /** Progreso (0-1) de la grabación del vídeo. */
  const [grabando, setGrabando] = useState<number | null>(null);
  const animacion = useRef<number | null>(null);
  /** La última ficha movida va encima de las demás. */
  const [arriba, setArriba] = useState<string | null>(null);
  const [orden, setOrden] = useState<PorLado<Orden>>({ local: "posicion", visitante: "posicion" });
  const [busca, setBusca] = useState("");
  const [buscaLista, setBuscaLista] = useState<PorLado<string>>({ local: "", visitante: "" });
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

  // Parar la animación si se sale de la página a mitad.
  useEffect(
    () => () => {
      if (animacion.current != null) cancelAnimationFrame(animacion.current);
    },
    [],
  );

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
    const url = `${window.location.origin}/pizarra?local=${local.id}&visitante=${visitante.id}${
      partido ? `&partido=${partido}` : ""
    }&p=${codificar(estado)}`;
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
      const blob = await imagenPizarra(escena(null));
      if (blob) await compartirArchivo(blob, "pizarra-soyreinaldo.png", `${local.name} vs ${visitante.name} en la pizarra de soyreinaldo.com`);
    } finally {
      setCompartiendo(false);
    }
  };

  // ---- Animación por etapas (fase 3)
  const claveJug = (lado: Lado, id: number) => `${lado === "local" ? "l" : "v"}:${id}`;
  const etapaActual = (): Etapa => {
    const jug: Record<string, Punto> = {};
    for (const lado of LADOS) {
      once[lado].forEach((id, i) => {
        if (id != null) jug[claveJug(lado, id)] = posicion(lado, i);
      });
    }
    return { jug, balon, flechas };
  };
  const guardarEtapa = () => {
    if (estado.etapas.length >= MAX_ETAPAS) return avisar(`Máximo ${MAX_ETAPAS} etapas`);
    cambiar((e) => ({ ...e, etapas: [...e.etapas, etapaActual()] }));
    avisar(`Etapa ${estado.etapas.length + 1} guardada`);
  };
  /** Pone el campo como estaba en una etapa (para retocarla o seguir desde ahí). */
  const irAEtapa = (k: number) => {
    const et = estado.etapas[k];
    if (!et) return;
    cambiar((e) => {
      const movidos = { ...e.movidos };
      for (const lado of LADOS) {
        e.once[lado].forEach((id, i) => {
          const p = id != null ? et.jug[claveJug(lado, id)] : undefined;
          if (p) movidos[`${lado}:${i}`] = p;
        });
      }
      return { ...e, movidos, balon: et.balon, flechas: et.flechas };
    });
  };
  const borrarEtapa = (k: number) => cambiar((e) => ({ ...e, etapas: e.etapas.filter((_, i) => i !== k) }));

  const parar = () => {
    if (animacion.current != null) cancelAnimationFrame(animacion.current);
    animacion.current = null;
    setFot(null);
  };
  const reproducir = () => {
    const etapas = estado.etapas;
    if (etapas.length < 2) return avisar("Guarda al menos 2 etapas");
    parar();
    const total = duracion(etapas.length);
    const inicio = performance.now();
    const paso = (ahora: number) => {
      const t = (ahora - inicio) / 1000;
      setFot(fotograma(etapas, t));
      if (t < total + 0.4) animacion.current = requestAnimationFrame(paso);
      else {
        animacion.current = null;
        setFot(null);
      }
    };
    animacion.current = requestAnimationFrame(paso);
  };

  /** La pizarra (o un fotograma de la animación) lista para el canvas. */
  const escena = (f: Fotograma | null): Escena => {
    const fichas: Escena["fichas"] = [];
    for (const lado of LADOS) {
      once[lado].forEach((id, i) => {
        const j = jugador(lado, id);
        if (!j) return;
        fichas.push({
          ...(f?.jug[claveJug(lado, j.id)] ?? posicion(lado, i)),
          color: COLOR[lado],
          numero: j.number,
          nombre: nombreCorto(j.name),
          foto: j.photo,
        });
      });
    }
    return {
      titulo: `${local.name} vs ${visitante.name}`,
      subtitulo: `${formacion.local}  ·  ${formacion.visitante}`,
      fichas,
      flechas: f ? f.flechas : flechas,
      balon: f ? f.balon : balon,
    };
  };

  const exportarVideo = async () => {
    const etapas = estado.etapas;
    if (etapas.length < 2) return avisar("Guarda al menos 2 etapas");
    setGrabando(0);
    try {
      const r = await videoPizarra((t) => escena(fotograma(etapas, t)), duracion(etapas.length) + 1.5, setGrabando);
      if (!r) return avisar("Tu navegador no permite grabar vídeo");
      await compartirArchivo(r.blob, `jugada-soyreinaldo.${r.ext}`, `${local.name} vs ${visitante.name}: la jugada en soyreinaldo.com`);
    } finally {
      setGrabando(null);
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
        <span className="pz-jug__nom">
          {/* El dorsal siempre a la vista (pedido del dueño, 20-oct). */}
          <b className="pz-jug__dorsal" style={{ background: COLOR[lado] }}>
            {j.number ?? "–"}
          </b>
          {nombreCorto(j.name)}
        </span>
        <span className="mono pz-jug__pos">
          {dentro ? "✓" : orden[lado] === "numero" ? (POS_ES[j.position ?? ""] ?? "") : ""}
        </span>
      </button>
    );
  };

  const lista = (lado: Lado) => {
    const q = normal(buscaLista[lado].trim());
    const plantilla = equipos[lado].plantilla.filter(
      (j) => !q || normal(j.name).includes(q) || String(j.number ?? "") === q,
    );
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
        <input
          type="search"
          className="pz-busca__input pz-lista__busca"
          placeholder="Buscar nombre o dorsal…"
          value={buscaLista[lado]}
          onChange={(e) => setBuscaLista((x) => ({ ...x, [lado]: e.target.value }))}
          aria-label={`Buscar jugador de ${equipos[lado].name}`}
        />
        <div className="pz-lista__jug">
          {plantilla.length === 0 && (
            <p className="pz-vacio">
              {q ? "Ningún jugador con eso." : "No hay plantilla disponible de este equipo ahora mismo."}
            </p>
          )}
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

      <div className="pz-anim" aria-label="Animación por etapas">
        <span className="mono pz-anim__titulo">🎬 Animación</span>
        <button type="button" className="pz-tool" onClick={guardarEtapa} disabled={!!fot}>
          + Guardar etapa
        </button>
        {estado.etapas.map((_, k) => (
          <span key={k} className={`pz-etapa${fot?.etapa === k ? " on" : ""}`}>
            <button type="button" onClick={() => irAEtapa(k)} disabled={!!fot} aria-label={`Ir a la etapa ${k + 1}`}>
              {k + 1}
            </button>
            <button type="button" onClick={() => borrarEtapa(k)} disabled={!!fot} aria-label={`Borrar la etapa ${k + 1}`}>
              ×
            </button>
          </span>
        ))}
        {fot ? (
          <button type="button" className="pz-tool on" onClick={parar}>
            ■ Parar
          </button>
        ) : (
          <button type="button" className="pz-tool" onClick={reproducir} disabled={estado.etapas.length < 2}>
            ▶ Reproducir
          </button>
        )}
        <button
          type="button"
          className="pz-tool"
          onClick={exportarVideo}
          disabled={estado.etapas.length < 2 || grabando != null || !!fot}
        >
          {grabando != null ? `Grabando… ${Math.round(grabando * 100)}%` : "📹 Vídeo"}
        </button>
        {estado.etapas.length === 0 && (
          <span className="pz-anim__ayuda">
            Coloca a los jugadores y guarda la etapa 1; muévelos y guarda la 2… y dale a reproducir.
          </span>
        )}
      </div>

      <div className="pz-cuerpo">
        {lista("local")}
        <div
          ref={campo}
          className={`pz-campo${horizontal ? " pz-campo--h" : ""}${dibujando ? " pz-campo--dibujo" : ""}${fot ? " pz-campo--anim" : ""}`}
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
            {(fot ? fot.flechas : flechas).map((f, k) => pintarFlecha(f, k))}
            {trazo && pintarFlecha(trazo, "trazo")}
          </svg>
          {LADOS.map((lado) =>
            huecos(formacion[lado], lado).map((h, i) => {
              const j = jugador(lado, once[lado][i]);
              const { left, top } = aPantalla((j && fot?.jug[claveJug(lado, j.id)]) || posicion(lado, i));
              const estilo = { left: `${left}%`, top: `${top}%` };
              if (!j) {
                if (fot) return null;
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
          {(fot ? fot.balon : balon) && (
            <div
              className="pz-balon"
              style={{
                left: `${aPantalla((fot ? fot.balon : balon)!).left}%`,
                top: `${aPantalla((fot ? fot.balon : balon)!).top}%`,
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
                        <b className="pz-jug__dorsal" style={{ background: COLOR[elegir.lado] }}>
                          {j.number ?? "–"}
                        </b>
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

/** Lo que se dibuja en el canvas (imagen y vídeo): coordenadas canónicas. */
type Escena = {
  titulo: string;
  subtitulo: string;
  fichas: { x: number; y: number; color: string; numero: number | null; nombre: string; foto: string | null }[];
  flechas: Flecha[];
  balon: Punto | null;
};

/** Caras para el canvas: la CDN de fotos manda CORS abierto, así que el
 * canvas no queda bloqueado. La que no cargue en 4 s, fuera (sale el dorsal). */
async function cargarFotos(urls: (string | null)[]): Promise<Map<string, HTMLImageElement>> {
  const fotos = new Map<string, HTMLImageElement>();
  await Promise.all(
    [...new Set(urls.filter((u): u is string => !!u))].map(
      (url) =>
        new Promise<void>((listo) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          const fin = setTimeout(listo, 4000);
          img.onload = () => {
            clearTimeout(fin);
            fotos.set(url, img);
            listo();
          };
          img.onerror = () => {
            clearTimeout(fin);
            listo();
          };
          img.src = url;
        }),
    ),
  );
  return fotos;
}

/** Pinta la escena con el campo en vertical (local abajo) en un lienzo W×H. */
function dibujarEscena(g: CanvasRenderingContext2D, W: number, H: number, e: Escena, fotos: Map<string, HTMLImageElement>) {
  const fondo = g.createLinearGradient(0, 0, 0, H);
  fondo.addColorStop(0, "#0a1030");
  fondo.addColorStop(1, "#1b2a6b");
  g.fillStyle = fondo;
  g.fillRect(0, 0, W, H);

  // Campo con proporción de campo real (como mucho 1,45 de alto por ancho),
  // centrado en el hueco entre la cabecera y el pie.
  const cw = W - 140;
  const ch = Math.min(H - 150 - 110, Math.round(cw * 1.45));
  const cx = 70;
  const cy = 150 + Math.round((H - 150 - 110 - ch) / 2);

  g.textAlign = "center";
  g.fillStyle = "#e8ecff";
  g.font = "800 46px sans-serif";
  g.fillText(e.titulo, W / 2, cy - 76, W - 80);
  g.font = "28px sans-serif";
  g.fillStyle = "#9aa4d6";
  g.fillText(e.subtitulo, W / 2, cy - 32);

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
  for (const f of e.flechas) {
    const a = aLienzo(f.a);
    const b = aLienzo(f.b);
    const color = COLOR_FLECHA[f.tipo];
    g.strokeStyle = color;
    g.fillStyle = color;
    g.lineWidth = 7;
    g.lineCap = "round";
    g.setLineDash(f.tipo === "carrera" ? [22, 16] : []);
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    g.beginPath();
    g.moveTo(a.x, a.y);
    g.lineTo(b.x - Math.cos(ang) * 18, b.y - Math.sin(ang) * 18);
    g.stroke();
    g.setLineDash([]);
    g.beginPath();
    g.moveTo(b.x, b.y);
    g.lineTo(b.x - Math.cos(ang - 0.45) * 34, b.y - Math.sin(ang - 0.45) * 34);
    g.lineTo(b.x - Math.cos(ang + 0.45) * 34, b.y - Math.sin(ang + 0.45) * 34);
    g.closePath();
    g.fill();
  }

  for (const f of e.fichas) {
    const { x, y } = aLienzo(f);
    const foto = f.foto ? fotos.get(f.foto) : undefined;
    g.beginPath();
    g.arc(x, y, 38, 0, Math.PI * 2);
    g.fillStyle = foto ? "#e2e8f0" : f.color;
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
    g.strokeStyle = foto ? f.color : "#ffffff";
    g.stroke();
    if (foto) {
      if (f.numero != null) {
        g.beginPath();
        g.arc(x + 30, y + 28, 17, 0, Math.PI * 2);
        g.fillStyle = f.color;
        g.fill();
        g.lineWidth = 3;
        g.strokeStyle = "#ffffff";
        g.stroke();
        g.fillStyle = "#ffffff";
        g.font = "800 19px sans-serif";
        g.fillText(String(f.numero), x + 30, y + 35);
      }
    } else {
      g.fillStyle = "#ffffff";
      g.font = "800 30px sans-serif";
      g.fillText(String(f.numero ?? ""), x, y + 11);
    }
    g.font = "600 24px sans-serif";
    g.shadowColor = "rgba(0,0,0,0.8)";
    g.shadowBlur = 6;
    g.fillStyle = "#ffffff";
    g.fillText(f.nombre, x, y + 70, 170);
    g.shadowBlur = 0;
  }

  if (e.balon) {
    const { x, y } = aLienzo(e.balon);
    g.font = "44px sans-serif";
    g.fillText("⚽", x, y + 15);
  }

  g.font = "700 34px sans-serif";
  g.fillStyle = "#3b82f6";
  g.fillText("soyreinaldo.com/pizarra", W / 2, H - 46);
}

/** PNG vertical 1080×1350 (la medida de Instagram). */
async function imagenPizarra(e: Escena): Promise<Blob | null> {
  const c = document.createElement("canvas");
  c.width = 1080;
  c.height = 1350;
  const g = c.getContext("2d");
  if (!g) return null;
  dibujarEscena(g, c.width, c.height, e, await cargarFotos(e.fichas.map((f) => f.foto)));
  return new Promise((r) => c.toBlob(r, "image/png"));
}

/** Vídeo vertical 1080×1920 (Reels, TikTok, Shorts) de la animación,
 * grabado en tiempo real desde un canvas. MP4 si el navegador lo graba
 * (Safari, Chrome reciente); si no, WebM. */
async function videoPizarra(
  escenaEn: (t: number) => Escena,
  total: number,
  progreso: (p: number) => void,
): Promise<{ blob: Blob; ext: string } | null> {
  if (typeof MediaRecorder === "undefined") return null;
  const tipo = ["video/mp4;codecs=avc1.42E01E", "video/mp4", "video/webm;codecs=vp9", "video/webm"].find((t) =>
    MediaRecorder.isTypeSupported(t),
  );
  if (!tipo) return null;
  const c = document.createElement("canvas");
  c.width = 1080;
  c.height = 1920;
  const g = c.getContext("2d");
  if (!g || !c.captureStream) return null;
  const fotos = await cargarFotos(escenaEn(0).fichas.map((f) => f.foto));
  dibujarEscena(g, c.width, c.height, escenaEn(0), fotos);

  const rec = new MediaRecorder(c.captureStream(30), { mimeType: tipo, videoBitsPerSecond: 6_000_000 });
  const trozos: Blob[] = [];
  rec.ondataavailable = (ev) => ev.data.size && trozos.push(ev.data);
  const fin = new Promise<void>((r) => (rec.onstop = () => r()));
  rec.start();
  const inicio = performance.now();
  await new Promise<void>((hecho) => {
    const paso = () => {
      const t = (performance.now() - inicio) / 1000;
      dibujarEscena(g, c.width, c.height, escenaEn(t), fotos);
      progreso(Math.min(1, t / total));
      if (t < total) requestAnimationFrame(paso);
      else hecho();
    };
    requestAnimationFrame(paso);
  });
  rec.stop();
  await fin;
  return { blob: new Blob(trozos, { type: tipo.split(";")[0] }), ext: tipo.startsWith("video/mp4") ? "mp4" : "webm" };
}

/** Hoja de compartir con el archivo en el móvil; descarga en el escritorio. */
async function compartirArchivo(blob: Blob, nombre: string, texto: string) {
  const archivo = new File([blob], nombre, { type: blob.type });
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
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}
