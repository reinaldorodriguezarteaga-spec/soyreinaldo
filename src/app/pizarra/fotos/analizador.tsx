"use client";
import Icono from "@/components/Icono";
import { Camera, Image as IconImage } from "lucide-react";

import { useEffect, useRef, useState } from "react";
import { PALETA, type Punto } from "@/lib/pizarra/estado";
import { guardarEnGaleria } from "@/lib/app-galeria";

/**
 * «Analiza tu jugada» (22-oct, idea del dueño): subes una o varias fotos de
 * la jugada real y las marcas con las herramientas de la pizarra (pincel,
 * flechas, zonas, rayas, círculos y texto). Cada foto guarda sus dibujos y
 * se pasa de una a otra con la tira de miniaturas. Todo ocurre en el
 * navegador: las fotos no se suben a ningún sitio.
 * Los vídeos sirven como fuente de fotogramas para marcar (22-oct).
 *
 * Coordenadas: de 0 a 1 sobre la foto (x a lo ancho, y a lo alto); el SVG
 * de encima usa los píxeles de la foto para que los trazos no se deformen.
 */

type Herramienta = "pincel" | "pase" | "carrera" | "zona" | "rayas" | "circulo" | "texto";
type Dibujo =
  | { tipo: "pincel"; puntos: Punto[]; color: string }
  | { tipo: "pase" | "carrera"; a: Punto; b: Punto; color: string }
  | { tipo: "zona" | "rayas"; a: Punto; b: Punto; color: string }
  | { tipo: "circulo"; c: Punto; borde: Punto; color: string }
  | { tipo: "texto"; p: Punto; t: string; color: string };
type Foto = { id: string; url: string; nombre: string; w: number; h: number; dibujos: Dibujo[] };

const HERRAMIENTAS: [Herramienta, string, string][] = [
  ["pincel", "✎", "Pincel"],
  ["pase", "➜", "Flecha"],
  ["carrera", "⤳", "Carrera"],
  ["circulo", "◯", "Círculo"],
  ["zona", "▭", "Zona"],
  ["rayas", "▨", "Rayas"],
  ["texto", "T", "Texto"],
];
const AYUDA: Record<Herramienta, string> = {
  pincel: "Dibuja a mano alzada sobre la foto.",
  pase: "Arrastra para dibujar una flecha (pase, dirección).",
  carrera: "Arrastra para dibujar una carrera (flecha discontinua).",
  circulo: "Arrastra desde el centro para rodear a un jugador.",
  zona: "Arrastra para sombrear una zona.",
  rayas: "Arrastra para marcar una zona con rayas.",
  texto: "Toca donde quieras escribir.",
};
const MAX_FOTOS = 20;
const MAX_LADO = 2000;

const dist = (a: Punto, b: Punto) => Math.hypot(a.x - b.x, a.y - b.y);
const capturar = (e: React.PointerEvent) => {
  try {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  } catch {
    // Eventos sintéticos o navegadores que no lo permiten: da igual.
  }
};

export default function Analizador() {
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [video, setVideo] = useState<{ url: string; nombre: string } | null>(null);
  const [actual, setActual] = useState(0);
  const [herr, setHerr] = useState<Herramienta>("pincel");
  const [color, setColor] = useState<string>("#facc15");
  const [enCurso, setEnCurso] = useState<Dibujo | null>(null);
  const [railAbierto, setRailAbierto] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const entrada = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cantidadFotos = useRef(0);
  const urls = useRef<string[]>([]);

  // Liberar las fotos y los vídeos al salir.
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const foto = fotos[actual] ?? null;
  const avisar = (t: string) => {
    setAviso(t);
    setTimeout(() => setAviso(null), 2500);
  };

  async function anadir(lista: FileList | null) {
    if (!lista?.length) return;
    const nuevas: Foto[] = [];
    let hayVideo = false;
    for (const f of lista) {
      if (f.type.startsWith("video/")) {
        const url = URL.createObjectURL(f);
        urls.current.push(url);
        setVideo({ url, nombre: f.name });
        hayVideo = true;
        continue;
      }
      if (!f.type.startsWith("image/") || nuevas.length >= MAX_FOTOS - cantidadFotos.current) continue;
      const url = URL.createObjectURL(f);
      urls.current.push(url);
      const dim = await new Promise<{ w: number; h: number } | null>((ok) => {
        const img = new Image();
        img.onload = () => ok({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => ok(null);
        img.src = url;
      });
      if (dim) nuevas.push({ id: `${Date.now()}-${nuevas.length}`, url, nombre: f.name, ...dim, dibujos: [] });
    }
    const indice = cantidadFotos.current;
    const disponibles = nuevas.slice(0, MAX_FOTOS - indice);
    if (disponibles.length) {
      cantidadFotos.current += disponibles.length;
      setFotos((fs) => [...fs, ...disponibles]);
      setActual(indice);
    }
    if (cantidadFotos.current >= MAX_FOTOS) avisar(`Como mucho ${MAX_FOTOS} fotos a la vez`);
    else if (!disponibles.length && !hayVideo) avisar("No se pudo abrir ninguna imagen");
  }

  function pasoVideo(paso: number) {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    if (!Number.isFinite(v.duration)) return;
    v.currentTime = Math.min(v.duration, Math.max(0, v.currentTime + paso));
  }

  async function capturarFotograma() {
    const v = videoRef.current;
    if (!v || !video) return;
    try {
      v.pause();
      if (!v.videoWidth) return avisar("El vídeo aún no está listo");
      if (cantidadFotos.current >= MAX_FOTOS) return avisar(`Como mucho ${MAX_FOTOS} fotos a la vez`);
      const t = v.currentTime;
      const k = Math.min(1, MAX_LADO / Math.max(v.videoWidth, v.videoHeight));
      const w = Math.round(v.videoWidth * k);
      const h = Math.round(v.videoHeight * k);
      const lienzo = document.createElement("canvas");
      lienzo.width = w;
      lienzo.height = h;
      const g = lienzo.getContext("2d");
      if (!g) return avisar("No se pudo capturar este vídeo");
      g.drawImage(v, 0, 0, w, h);
      const blob = await new Promise<Blob | null>((ok) => lienzo.toBlob(ok, "image/jpeg", 0.92));
      if (!blob) return avisar("No se pudo capturar este vídeo");
      if (cantidadFotos.current >= MAX_FOTOS) return avisar(`Como mucho ${MAX_FOTOS} fotos a la vez`);
      const url = URL.createObjectURL(blob);
      urls.current.push(url);
      const indice = cantidadFotos.current;
      cantidadFotos.current++;
      setFotos((fs) => [...fs, { id: `${Date.now()}`, url, nombre: `${video.nombre} ${t.toFixed(1)}s`, w, h, dibujos: [] }]);
      setActual(indice);
      avisar("Fotograma añadido ✓");
    } catch {
      avisar("No se pudo capturar este vídeo");
    }
  }

  const cambiarDibujos = (f: (d: Dibujo[]) => Dibujo[]) =>
    setFotos((fs) => fs.map((x, i) => (i === actual ? { ...x, dibujos: f(x.dibujos) } : x)));

  function quitarFoto(i: number) {
    cantidadFotos.current--;
    setFotos((fs) => fs.filter((_, k) => k !== i));
    setActual((a) => Math.max(0, a > i || a === fotos.length - 1 ? a - 1 : a));
  }

  // ---- Dibujar con el dedo o el ratón.
  const aFoto = (cx: number, cy: number): Punto | null => {
    const r = caja.current?.getBoundingClientRect();
    if (!r) return null;
    return { x: Math.min(1, Math.max(0, (cx - r.left) / r.width)), y: Math.min(1, Math.max(0, (cy - r.top) / r.height)) };
  };
  const down = (e: React.PointerEvent) => {
    const p = aFoto(e.clientX, e.clientY);
    if (!p || !foto) return;
    if (herr === "texto") {
      const t = window.prompt("Texto:")?.trim().slice(0, 60);
      if (t) cambiarDibujos((d) => [...d, { tipo: "texto", p, t, color }]);
      return;
    }
    capturar(e);
    if (herr === "pincel") setEnCurso({ tipo: "pincel", puntos: [p], color });
    else if (herr === "circulo") setEnCurso({ tipo: "circulo", c: p, borde: p, color });
    else setEnCurso({ tipo: herr, a: p, b: p, color });
  };
  const move = (e: React.PointerEvent) => {
    if (!enCurso) return;
    const p = aFoto(e.clientX, e.clientY);
    if (!p) return;
    if (enCurso.tipo === "pincel") {
      const u = enCurso.puntos[enCurso.puntos.length - 1];
      if (dist(p, u) >= 0.004) setEnCurso({ ...enCurso, puntos: [...enCurso.puntos, p] });
    } else if (enCurso.tipo === "circulo") setEnCurso({ ...enCurso, borde: p });
    else if (enCurso.tipo !== "texto") setEnCurso({ ...enCurso, b: p });
  };
  const up = () => {
    const d = enCurso;
    setEnCurso(null);
    if (!d) return;
    const vale =
      d.tipo === "pincel"
        ? d.puntos.length >= 2
        : d.tipo === "circulo"
          ? dist(d.c, d.borde) > 0.01
          : d.tipo === "texto" || dist(d.a, d.b) > 0.015;
    if (vale) cambiarDibujos((x) => [...x, d]);
  };

  // ---- Exportar: la foto a su tamaño (máx. 2000 px de lado) con los dibujos.
  async function imagenDe(f: Foto): Promise<Blob | null> {
    const img = new Image();
    img.src = f.url;
    await img.decode().catch(() => undefined);
    const k = Math.min(1, MAX_LADO / Math.max(f.w, f.h));
    const W = Math.round(f.w * k);
    const H = Math.round(f.h * k);
    const lienzo = document.createElement("canvas");
    lienzo.width = W;
    lienzo.height = H;
    const g = lienzo.getContext("2d");
    if (!g) return null;
    g.drawImage(img, 0, 0, W, H);
    pintarEnLienzo(g, W, H, f.dibujos);
    g.font = `700 ${Math.round(W * 0.022)}px sans-serif`;
    g.fillStyle = "rgba(255,255,255,0.85)";
    g.textAlign = "right";
    g.shadowColor = "rgba(0,0,0,0.8)";
    g.shadowBlur = 6;
    g.fillText("soyreinaldo.com", W - W * 0.02, H - W * 0.02);
    return new Promise((ok) => lienzo.toBlob(ok, "image/jpeg", 0.92));
  }

  async function exportar(todas: boolean) {
    const lista = todas ? fotos : foto ? [foto] : [];
    if (!lista.length) return;
    setExportando(true);
    try {
      const blobs = (await Promise.all(lista.map(imagenDe))).filter((b): b is Blob => !!b);
      const nombre = (i: number) => `jugada-soyreinaldo-${i + 1}.jpg`;
      // App 1.1: a la galería.
      let enGaleria = 0;
      for (const [i, b] of blobs.entries()) if (await guardarEnGaleria(b, nombre(i))) enGaleria++;
      if (enGaleria) return avisar(enGaleria === 1 ? "Guardada en tu galería ✓" : `${enGaleria} fotos guardadas en tu galería ✓`);
      const archivos = blobs.map((b, i) => new File([b], nombre(i), { type: "image/jpeg" }));
      if (navigator.canShare?.({ files: archivos })) {
        await navigator.share({ files: archivos, text: "Analizada en soyreinaldo.com" }).catch(() => undefined);
        return;
      }
      for (const [i, b] of blobs.entries()) {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(b);
        a.download = nombre(i);
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
      }
    } finally {
      setExportando(false);
    }
  }

  const contexto = (
    <>
      <span className="pz-paleta" role="radiogroup" aria-label="Color">
        {PALETA.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={color === c}
            aria-label={`Color ${c}`}
            className={color === c ? "on" : ""}
            style={{ background: c }}
            onClick={() => setColor(c)}
          />
        ))}
      </span>
      <button type="button" className="pz-tool" onClick={() => cambiarDibujos((d) => d.slice(0, -1))} disabled={!foto?.dibujos.length}>
        ↶ Deshacer
      </button>
      <button type="button" className="pz-tool" onClick={() => cambiarDibujos(() => [])} disabled={!foto?.dibujos.length}>
        Borrar dibujos
      </button>
    </>
  );

  return (
    <div className="af">
      <input
        ref={entrada}
        type="file"
        accept="image/*,video/*"
        multiple
        hidden
        onChange={(e) => {
          void anadir(e.target.files);
          e.target.value = "";
        }}
      />

      {video && (
        <div className="af-video">
          <video ref={videoRef} src={video.url} controls playsInline preload="metadata" />
          <div className="af-acciones">
            <button type="button" className="btn btn--accent" onClick={() => void capturarFotograma()}>
              <Camera className="ico-txt" aria-hidden /> Capturar fotograma
            </button>
            <button type="button" className="pz-tool" onClick={() => pasoVideo(-0.1)}>
              −0,1 s
            </button>
            <button type="button" className="pz-tool" onClick={() => pasoVideo(0.1)}>
              +0,1 s
            </button>
            <button type="button" className="btn" onClick={() => setVideo(null)}>
              Quitar vídeo
            </button>
          </div>
          <p className="pz-ayuda">Pausa el vídeo en el momento clave y captura el fotograma: se añade como foto para marcarlo.</p>
        </div>
      )}

      {fotos.length === 0 ? (
        <button type="button" className="af-vacio" onClick={() => entrada.current?.click()}>
          <Icono icono={IconImage} tono="naranja" tam="lg" />
          <b>Sube fotos o un vídeo de la jugada</b>
          <span>Capturas de la tele, clips o fotos del campo. Del vídeo sacas los fotogramas que quieras. Todo se queda en tu móvil: no se sube a ningún sitio.</span>
        </button>
      ) : (
        <>
          <div className="af-acciones">
            <button type="button" className="btn" onClick={() => entrada.current?.click()}>
              + Añadir fotos o vídeo
            </button>
            <button type="button" className="btn btn--accent" onClick={() => exportar(false)} disabled={exportando}>
              <Camera className="ico-txt" aria-hidden /> {exportando ? "Preparando…" : "Guardar esta"}
            </button>
            {fotos.length > 1 && (
              <button type="button" className="btn" onClick={() => exportar(true)} disabled={exportando}>
                Guardar las {fotos.length}
              </button>
            )}
          </div>

          <div className="af-herr-escritorio" role="toolbar" aria-label="Herramientas">
            <div className="pz-modos" role="radiogroup">
              {HERRAMIENTAS.map(([h, ic, et]) => (
                <button key={h} type="button" role="radio" aria-checked={herr === h} className={herr === h ? "on" : ""} title={AYUDA[h]} onClick={() => setHerr(h)}>
                  {ic} {et}
                </button>
              ))}
            </div>
            {contexto}
          </div>

          <div className="af-zona">
            <div className={`pz-rail af-rail${railAbierto ? " is-abierto" : ""}`} role="toolbar" aria-label="Herramientas">
              <button type="button" className="pz-rail__abrir" onClick={() => setRailAbierto((a) => !a)} aria-expanded={railAbierto} aria-label="Ver los nombres de las herramientas">
                {railAbierto ? "«" : "»"}
              </button>
              {HERRAMIENTAS.map(([h, ic, et]) => (
                <button
                  key={h}
                  type="button"
                  className={herr === h ? "on" : ""}
                  aria-pressed={herr === h}
                  aria-label={et}
                  onClick={() => {
                    setHerr(h);
                    setRailAbierto(false);
                  }}
                >
                  <span className="pz-rail__ic">{ic}</span>
                  <span className="pz-rail__et">{et}</span>
                </button>
              ))}
            </div>
            <div className="af-col">
              <div className="af-contexto-movil">{contexto}</div>
              {foto && (
                <div
                  ref={caja}
                  className="af-foto"
                  // Que quepa a lo alto sin deformarse: el ancho máximo sale de la proporción.
                  style={{ aspectRatio: `${foto.w} / ${foto.h}`, maxWidth: `min(100%, calc(72vh * ${foto.w / foto.h}))` }}
                  onPointerDown={down}
                  onPointerMove={move}
                  onPointerUp={up}
                  onPointerCancel={() => setEnCurso(null)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- foto local (blob:) */}
                  <img src={foto.url} alt="" draggable={false} />
                  <svg viewBox={`0 0 ${foto.w} ${foto.h}`} aria-hidden>
                    <Patrones w={foto.w} />
                    {[...foto.dibujos, ...(enCurso ? [enCurso] : [])].map((d, k) => (
                      <DibujoSvg key={k} d={d} w={foto.w} h={foto.h} />
                    ))}
                  </svg>
                </div>
              )}
              <p className="pz-ayuda">{AYUDA[herr]}</p>
            </div>
          </div>

          <div className="af-tira" aria-label="Fotos">
            {fotos.map((f, i) => (
              <div key={f.id} className={`af-mini${i === actual ? " on" : ""}`}>
                <button type="button" onClick={() => setActual(i)} aria-label={`Foto ${i + 1}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- miniatura local (blob:) */}
                  <img src={f.url} alt="" />
                  {f.dibujos.length > 0 && <span className="af-mini__marca">✎</span>}
                </button>
                <button type="button" className="af-mini__quitar" onClick={() => quitarFoto(i)} aria-label={`Quitar la foto ${i + 1}`}>
                  ×
                </button>
              </div>
            ))}
            {fotos.length < MAX_FOTOS && (
              <button type="button" className="af-mini af-mini--mas" onClick={() => entrada.current?.click()} aria-label="Añadir fotos">
                +
              </button>
            )}
          </div>
          {fotos.length > 1 && (
            <div className="af-pasar">
              <button type="button" className="pz-tool" onClick={() => setActual((a) => Math.max(0, a - 1))} disabled={actual === 0}>
                ← Anterior
              </button>
              <span>
                {actual + 1} / {fotos.length}
              </span>
              <button type="button" className="pz-tool" onClick={() => setActual((a) => Math.min(fotos.length - 1, a + 1))} disabled={actual === fotos.length - 1}>
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}

      {aviso && (
        <div className="pz-aviso" role="status">
          {aviso}
        </div>
      )}
    </div>
  );
}

/** Rayas para las zonas rayadas, una por color, a escala de la foto. */
function Patrones({ w }: { w: number }) {
  const t = w * 0.012;
  return (
    <defs>
      {PALETA.map((c, i) => (
        <pattern key={c} id={`af-rayas-${i}`} patternUnits="userSpaceOnUse" width={t * 2.6} height={t * 2.6} patternTransform="rotate(45)">
          <rect width={t * 2.6} height={t * 2.6} fill={c} fillOpacity={0.1} />
          <rect width={t} height={t * 2.6} fill={c} fillOpacity={0.6} />
        </pattern>
      ))}
    </defs>
  );
}

function DibujoSvg({ d, w, h }: { d: Dibujo; w: number; h: number }) {
  const g = w * 0.006; // grosor base
  const P = (p: Punto) => ({ x: p.x * w, y: p.y * h });
  if (d.tipo === "pincel") {
    return (
      <polyline
        points={d.puntos.map((p) => `${P(p).x},${P(p).y}`).join(" ")}
        fill="none"
        stroke={d.color}
        strokeWidth={g * 1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }
  if (d.tipo === "pase" || d.tipo === "carrera") {
    const a = P(d.a);
    const b = P(d.b);
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const L = g * 5;
    const punta = [
      [b.x, b.y],
      [b.x - Math.cos(ang - 0.45) * L, b.y - Math.sin(ang - 0.45) * L],
      [b.x - Math.cos(ang + 0.45) * L, b.y - Math.sin(ang + 0.45) * L],
    ];
    return (
      <g>
        <line
          x1={a.x}
          y1={a.y}
          x2={b.x - Math.cos(ang) * L * 0.6}
          y2={b.y - Math.sin(ang) * L * 0.6}
          stroke={d.color}
          strokeWidth={g}
          strokeLinecap="round"
          strokeDasharray={d.tipo === "carrera" ? `${g * 3} ${g * 2.2}` : undefined}
        />
        <polygon points={punta.map((q) => q.join(",")).join(" ")} fill={d.color} />
      </g>
    );
  }
  if (d.tipo === "zona" || d.tipo === "rayas") {
    const a = P(d.a);
    const b = P(d.b);
    return (
      <rect
        x={Math.min(a.x, b.x)}
        y={Math.min(a.y, b.y)}
        width={Math.abs(b.x - a.x)}
        height={Math.abs(b.y - a.y)}
        fill={d.tipo === "rayas" ? `url(#af-rayas-${PALETA.indexOf(d.color as (typeof PALETA)[number])})` : d.color}
        fillOpacity={d.tipo === "rayas" ? 1 : 0.25}
        stroke={d.color}
        strokeWidth={g * 0.7}
        strokeDasharray={`${g * 2.5} ${g * 1.8}`}
      />
    );
  }
  if (d.tipo === "circulo") {
    const c = P(d.c);
    const r = Math.hypot(P(d.borde).x - c.x, P(d.borde).y - c.y);
    return <circle cx={c.x} cy={c.y} r={r} fill={d.color} fillOpacity={0.15} stroke={d.color} strokeWidth={g} />;
  }
  if (d.tipo !== "texto") return null;
  const p = P(d.p);
  return (
    <text
      x={p.x}
      y={p.y}
      fill={d.color}
      fontSize={w * 0.04}
      fontWeight={800}
      textAnchor="middle"
      dominantBaseline="middle"
      stroke="rgba(0,0,0,0.75)"
      strokeWidth={w * 0.006}
      paintOrder="stroke"
      fontFamily="sans-serif"
    >
      {d.t}
    </text>
  );
}

/** Los mismos dibujos en el canvas de la exportación. */
function pintarEnLienzo(g: CanvasRenderingContext2D, W: number, H: number, dibujos: Dibujo[]) {
  const grosor = W * 0.006;
  const P = (p: Punto) => ({ x: p.x * W, y: p.y * H });
  g.lineCap = "round";
  g.lineJoin = "round";
  for (const d of dibujos) {
    g.save();
    g.strokeStyle = d.color;
    g.fillStyle = d.color;
    if (d.tipo === "pincel") {
      const pts = d.puntos.map(P);
      g.lineWidth = grosor * 1.2;
      g.beginPath();
      g.moveTo(pts[0].x, pts[0].y);
      for (const q of pts.slice(1)) g.lineTo(q.x, q.y);
      g.stroke();
    } else if (d.tipo === "pase" || d.tipo === "carrera") {
      const a = P(d.a);
      const b = P(d.b);
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const L = grosor * 5;
      g.lineWidth = grosor;
      g.setLineDash(d.tipo === "carrera" ? [grosor * 3, grosor * 2.2] : []);
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.lineTo(b.x - Math.cos(ang) * L * 0.6, b.y - Math.sin(ang) * L * 0.6);
      g.stroke();
      g.setLineDash([]);
      g.beginPath();
      g.moveTo(b.x, b.y);
      g.lineTo(b.x - Math.cos(ang - 0.45) * L, b.y - Math.sin(ang - 0.45) * L);
      g.lineTo(b.x - Math.cos(ang + 0.45) * L, b.y - Math.sin(ang + 0.45) * L);
      g.closePath();
      g.fill();
    } else if (d.tipo === "zona" || d.tipo === "rayas") {
      const a = P(d.a);
      const b = P(d.b);
      const [x, y, w, h] = [Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y)];
      g.beginPath();
      g.rect(x, y, w, h);
      g.save();
      g.clip();
      g.globalAlpha = d.tipo === "rayas" ? 0.1 : 0.25;
      g.fillRect(x, y, w, h);
      if (d.tipo === "rayas") {
        g.globalAlpha = 0.6;
        g.lineWidth = W * 0.012;
        for (let k = -h; k < w + h; k += W * 0.031) {
          g.beginPath();
          g.moveTo(x + k, y + h);
          g.lineTo(x + k + h, y);
          g.stroke();
        }
      }
      g.restore();
      g.lineWidth = grosor * 0.7;
      g.setLineDash([grosor * 2.5, grosor * 1.8]);
      g.strokeRect(x, y, w, h);
    } else if (d.tipo === "circulo") {
      const c = P(d.c);
      const b = P(d.borde);
      g.beginPath();
      g.arc(c.x, c.y, Math.hypot(b.x - c.x, b.y - c.y), 0, Math.PI * 2);
      g.globalAlpha = 0.15;
      g.fill();
      g.globalAlpha = 1;
      g.lineWidth = grosor;
      g.stroke();
    } else if (d.tipo === "texto") {
      const p = P(d.p);
      g.font = `800 ${Math.round(W * 0.04)}px sans-serif`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.lineWidth = W * 0.006;
      g.strokeStyle = "rgba(0,0,0,0.75)";
      g.strokeText(d.t, p.x, p.y);
      g.fillText(d.t, p.x, p.y);
    }
    g.restore();
  }
}
