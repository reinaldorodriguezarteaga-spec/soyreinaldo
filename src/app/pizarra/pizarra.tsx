"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FORMACION_INICIAL,
  FORMACIONES,
  huecoParaJugador,
  huecos,
  onceAutomatico,
  type Lado,
} from "@/lib/pizarra/formaciones";
import { nombreCorto } from "@/lib/sports/nombres";

/**
 * Pizarra táctica (20-oct, pedido del dueño). Cada equipo tiene su formación
 * y sus 11 huecos; un hueco vacío enseña "+" (toca para elegir jugador) y a
 * la lista de cada lado se le puede arrastrar un jugador al campo. Las fichas
 * colocadas se mueven libremente (ratón o dedo) y, soltadas fuera del campo,
 * vuelven a la lista.
 *
 * Las posiciones se guardan en coordenadas canónicas (ver `formaciones.ts`):
 * horizontal en escritorio (local a la izquierda) y vertical en el móvil
 * (local abajo), la misma jugada se ve igual en los dos.
 */

export type JugadorPizarra = { id: number; name: string; number: number | null; position: string | null };
export type EquipoConPlantilla = { id: number; name: string; logo: string; plantilla: JugadorPizarra[] };
type Punto = { x: number; y: number };
type PorLado<T> = Record<Lado, T>;

const LADOS: Lado[] = ["local", "visitante"];
const vacio = (): (number | null)[] => Array(11).fill(null);
const POS_ES: Record<string, string> = { Goalkeeper: "POR", Defender: "DEF", Midfielder: "MED", Attacker: "DEL" };
const COLOR: PorLado<string> = { local: "#3b82f6", visitante: "#ff5b8a" };
const limitar = (v: number) => Math.min(0.98, Math.max(0.02, v));

export default function Pizarra({ local, visitante }: { local: EquipoConPlantilla; visitante: EquipoConPlantilla }) {
  const router = useRouter();
  const equipos: PorLado<EquipoConPlantilla> = { local, visitante };
  const [formacion, setFormacion] = useState<PorLado<string>>({ local: FORMACION_INICIAL, visitante: FORMACION_INICIAL });
  const [once, setOnce] = useState<PorLado<(number | null)[]>>({ local: vacio(), visitante: vacio() });
  /** Posición movida a mano de cada hueco ("local:3"); sin entrada, la de la formación. */
  const [movidos, setMovidos] = useState<Record<string, Punto>>({});
  const [elegir, setElegir] = useState<{ lado: Lado; hueco: number } | null>(null);
  const [fantasma, setFantasma] = useState<{ lado: Lado; id: number; cx: number; cy: number } | null>(null);
  const [horizontal, setHorizontal] = useState(false);
  const [compartiendo, setCompartiendo] = useState(false);
  /** La última ficha movida va encima de las demás. */
  const [arriba, setArriba] = useState<string | null>(null);
  const campo = useRef<HTMLDivElement>(null);
  const gesto = useRef<{ x: number; y: number; activo: boolean } | null>(null);

  // Campo horizontal en escritorio, vertical en el móvil. Arranca vertical
  // (= SSR) y se ajusta al montar.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 900px)");
    const aplicar = () => setHorizontal(mq.matches);
    aplicar();
    mq.addEventListener("change", aplicar);
    return () => mq.removeEventListener("change", aplicar);
  }, []);

  const jugador = (lado: Lado, id: number | null) =>
    id == null ? null : (equipos[lado].plantilla.find((p) => p.id === id) ?? null);
  const enCampo = (lado: Lado, id: number) => once[lado].includes(id);

  const aPantalla = (p: Punto) =>
    horizontal ? { left: p.x * 100, top: p.y * 100 } : { left: p.y * 100, top: (1 - p.x) * 100 };
  const aCanonico = (cx: number, cy: number): Punto | null => {
    const r = campo.current?.getBoundingClientRect();
    if (!r) return null;
    const px = (cx - r.left) / r.width;
    const py = (cy - r.top) / r.height;
    if (px < 0 || px > 1 || py < 0 || py > 1) return null;
    return horizontal ? { x: limitar(px), y: limitar(py) } : { x: limitar(1 - py), y: limitar(px) };
  };
  const posicion = (lado: Lado, i: number): Punto =>
    movidos[`${lado}:${i}`] ?? huecos(formacion[lado], lado)[i];

  const colocar = (lado: Lado, hueco: number, id: number | null) => {
    setOnce((o) => {
      const fila = o[lado].map((x) => (x === id ? null : x)); // sin duplicados
      fila[hueco] = id;
      return { ...o, [lado]: fila };
    });
    setMovidos((m) => {
      const { [`${lado}:${hueco}`]: _quitado, ...resto } = m;
      return resto;
    });
  };

  // ---- Fichas en el campo: se mueven libres; fuera del campo, a la lista.
  const fichaDown = (lado: Lado, i: number) => (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setArriba(`${lado}:${i}`);
    gesto.current = { x: e.clientX, y: e.clientY, activo: false };
  };
  const fichaMove = (lado: Lado, i: number) => (e: React.PointerEvent) => {
    const g = gesto.current;
    if (!g) return;
    if (!g.activo && Math.hypot(e.clientX - g.x, e.clientY - g.y) < 4) return;
    g.activo = true;
    const p = aCanonico(e.clientX, e.clientY);
    if (p) setMovidos((m) => ({ ...m, [`${lado}:${i}`]: p }));
  };
  const fichaUp = (lado: Lado, i: number) => (e: React.PointerEvent) => {
    const g = gesto.current;
    gesto.current = null;
    if (!g) return;
    if (!g.activo) return setElegir({ lado, hueco: i }); // toque: cambiar jugador
    if (!aCanonico(e.clientX, e.clientY)) colocar(lado, i, null);
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
    const hs = huecos(formacion[lado], lado);
    let mejor = 0;
    let dist = Infinity;
    hs.forEach((_, i) => {
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
  };

  // ---- Botones
  const vaciar = () => {
    setOnce({ local: vacio(), visitante: vacio() });
    setMovidos({});
  };
  const rellenar = () =>
    setOnce((o) => {
      const out = { ...o };
      for (const lado of LADOS) {
        const libres = equipos[lado].plantilla.filter((p) => !o[lado].includes(p.id));
        const auto = onceAutomatico(formacion[lado], libres);
        out[lado] = o[lado].map((id, i) => id ?? auto[i]);
      }
      return out;
    });
  const cambiarFormacion = (lado: Lado, f: string) => {
    setFormacion((x) => ({ ...x, [lado]: f }));
    setMovidos((m) => Object.fromEntries(Object.entries(m).filter(([k]) => !k.startsWith(`${lado}:`))));
  };

  const compartir = async () => {
    setCompartiendo(true);
    try {
      const blob = await imagenPizarra({ equipos, formacion, once, posicion, jugador });
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

  const lista = (lado: Lado) => (
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
      <div className="pz-lista__jug">
        {equipos[lado].plantilla.length === 0 && (
          <p className="pz-vacio">No hay plantilla disponible de este equipo ahora mismo.</p>
        )}
        {equipos[lado].plantilla.map((j) => {
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
              <span className="pz-jug__num" style={{ background: COLOR[lado] }}>
                {j.number ?? ""}
              </span>
              <span className="pz-jug__nom">{nombreCorto(j.name)}</span>
              <span className="mono pz-jug__pos">{dentro ? "✓" : (POS_ES[j.position ?? ""] ?? "")}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const candidatos = elegir ? equipos[elegir.lado].plantilla : [];
  const rolElegido = elegir ? huecos(formacion[elegir.lado], elegir.lado)[elegir.hueco] : null;

  return (
    <div className="pz">
      <div className="pz-botones">
        <button type="button" className="btn" onClick={() => router.push("/pizarra")}>
          Empezar de cero
        </button>
        <button type="button" className="btn" onClick={vaciar}>
          Vaciar el campo
        </button>
        <button type="button" className="btn" onClick={() => setMovidos({})}>
          Posición inicial
        </button>
        <button type="button" className="btn" onClick={rellenar}>
          Rellenar once
        </button>
        <button type="button" className="btn btn--accent" onClick={compartir} disabled={compartiendo}>
          📸 {compartiendo ? "Preparando…" : "Compartir imagen"}
        </button>
      </div>

      <div className="pz-cuerpo">
        {lista("local")}
        <div
          ref={campo}
          className={`pz-campo${horizontal ? " pz-campo--h" : ""}`}
          aria-label="Campo de fútbol"
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
                    onClick={() => setElegir({ lado, hueco: i })}
                    aria-label={`Añadir ${h.rol} de ${equipos[lado].name}`}
                  >
                    +<span className="pz-hueco__rol">{h.rol}</span>
                  </button>
                );
              }
              return (
                <div
                  key={`${lado}-${i}`}
                  className="pz-ficha"
                  style={arriba === `${lado}:${i}` ? { ...estilo, zIndex: 4 } : estilo}
                  onPointerDown={fichaDown(lado, i)}
                  onPointerMove={fichaMove(lado, i)}
                  onPointerUp={fichaUp(lado, i)}
                  onPointerCancel={cancelar}
                  role="button"
                  aria-label={`${j.name}, arrástralo para moverlo`}
                >
                  <span className="pz-ficha__num" style={{ background: COLOR[lado] }}>
                    {j.number ?? ""}
                  </span>
                  <span className="pz-ficha__nom">{nombreCorto(j.name)}</span>
                </div>
              );
            }),
          )}
        </div>
        {lista("visitante")}
      </div>

      <p className="pz-ayuda">
        Toca un «+» o un jugador de la lista para colocarlo, o arrástralo al campo. Las fichas se mueven
        libremente; suéltalas fuera del campo para quitarlas.
      </p>

      {fantasma && (
        <div className="pz-fantasma" style={{ left: fantasma.cx, top: fantasma.cy }}>
          <span className="pz-ficha__num" style={{ background: COLOR[fantasma.lado] }}>
            {jugador(fantasma.lado, fantasma.id)?.number ?? ""}
          </span>
        </div>
      )}

      {elegir && (
        <div className="pmodal-backdrop" onClick={() => setElegir(null)} role="dialog" aria-modal>
          <div className="pmodal pz-elegir" onClick={(e) => e.stopPropagation()}>
            <h3>
              {rolElegido?.rol} · {equipos[elegir.lado].name}
            </h3>
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
                      <span className="pz-jug__num" style={{ background: COLOR[elegir.lado] }}>
                        {j.number ?? ""}
                      </span>
                      <span className="pz-jug__nom">{nombreCorto(j.name)}</span>
                      <span className="mono pz-jug__pos">{dentro ? "en el campo" : (POS_ES[j.position ?? ""] ?? "")}</span>
                    </button>
                  );
                })}
            </div>
            <button type="button" className="btn btn--ghost" style={{ width: "100%", marginTop: 12 }} onClick={() => setElegir(null)}>
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
  formacion: PorLado<string>;
  once: PorLado<(number | null)[]>;
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
  g.fillText(`${o.formacion.local}  ·  ${o.formacion.visitante}`, W / 2, 118);

  // Campo vertical: local abajo.
  const cx = 70;
  const cy = 150;
  const cw = W - 140;
  const ch = H - 150 - 110;
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

  for (const lado of LADOS) {
    o.once[lado].forEach((id, i) => {
      const j = o.jugador(lado, id);
      if (!j) return;
      const p = o.posicion(lado, i);
      const x = cx + p.y * cw;
      const y = cy + (1 - p.x) * ch;
      g.beginPath();
      g.arc(x, y, 34, 0, Math.PI * 2);
      g.fillStyle = COLOR[lado];
      g.fill();
      g.lineWidth = 4;
      g.strokeStyle = "#ffffff";
      g.stroke();
      g.fillStyle = "#ffffff";
      g.font = "800 30px sans-serif";
      g.fillText(String(j.number ?? ""), x, y + 11);
      g.font = "600 24px sans-serif";
      g.shadowColor = "rgba(0,0,0,0.8)";
      g.shadowBlur = 6;
      g.fillText(nombreCorto(j.name), x, y + 66, 170);
      g.shadowBlur = 0;
    });
  }

  g.font = "700 34px sans-serif";
  g.fillStyle = "#3b82f6";
  g.fillText("soyreinaldo.com/pizarra", W / 2, H - 46);
  return new Promise((r) => c.toBlob(r, "image/png"));
}
