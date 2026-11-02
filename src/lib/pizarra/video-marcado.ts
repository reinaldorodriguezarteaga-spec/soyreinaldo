/**
 * «Vídeo con las marcas» (2-nov, pedido del dueño): graba el clip entero en
 * el navegador y, al llegar a cada momento marcado, lo congela unos segundos
 * con los dibujos encima (aparecen con un fundido) antes de seguir. Lo que
 * hacen las retransmisiones con la telestración, sin subir nada a ningún sitio.
 *
 * Funciona en tiempo real: un `<video>` propio se pinta fotograma a fotograma
 * en un canvas y MediaRecorder graba ese canvas (más el audio del clip vía
 * WebAudio). Por eso tarda lo que dura el clip más las pausas, y si la
 * pestaña pasa a segundo plano el navegador frena los fotogramas.
 */

export type Momento = {
  /** Segundo del clip donde se congela. */
  t: number;
  /** Pinta los dibujos de ese momento sobre un lienzo de W×H. */
  pintar: (g: CanvasRenderingContext2D, W: number, H: number) => void;
};

/** Clips más largos se cortan: la grabación es en tiempo real. */
export const MAX_SEGUNDOS = 120;
const MAX_LADO = 1280;
const FUNDIDO_S = 0.35;
// Primero MP4 (lo que acepta la galería del iPhone; Safari y Chrome recientes
// lo graban), si no WebM.
const TIPOS = [
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  "video/mp4",
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];

export function puedeGrabarVideo(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    typeof HTMLCanvasElement.prototype.captureStream === "function"
  );
}

const esperar = (el: HTMLMediaElement, evento: string) =>
  new Promise<void>((ok, mal) => {
    const bien = () => {
      el.removeEventListener("error", fallo);
      ok();
    };
    const fallo = () => {
      el.removeEventListener(evento, bien);
      mal(new Error("No se pudo leer el vídeo"));
    };
    el.addEventListener(evento, bien, { once: true });
    el.addEventListener("error", fallo, { once: true });
  });

const cuadro = () => new Promise<number>((ok) => requestAnimationFrame(ok));

async function irA(v: HTMLVideoElement, t: number) {
  if (Math.abs(v.currentTime - t) < 0.001) return;
  const listo = esperar(v, "seeked");
  v.currentTime = t;
  await listo;
}

export async function grabarVideoMarcado(o: {
  url: string;
  momentos: Momento[];
  /** Segundos que se queda congelado cada momento. */
  pausa: number;
  /** De 0 a 1. */
  alProgresar?: (p: number) => void;
  senal?: AbortSignal;
}): Promise<{ blob: Blob; ext: "mp4" | "webm" }> {
  // El AudioContext, antes de cualquier await: en iOS solo arranca dentro
  // del toque del usuario.
  let audio: AudioContext | null = null;
  try {
    audio = new AudioContext();
    void audio.resume();
  } catch {
    audio = null;
  }

  const v = document.createElement("video");
  v.playsInline = true;
  v.preload = "auto";
  v.src = o.url;
  try {
    await esperar(v, "loadedmetadata");
    if (!v.videoWidth) await esperar(v, "loadeddata");

    const dur = Math.min(Number.isFinite(v.duration) ? v.duration : MAX_SEGUNDOS, MAX_SEGUNDOS);
    const k = Math.min(1, MAX_LADO / Math.max(v.videoWidth, v.videoHeight));
    // Pares: los codificadores H.264 los exigen.
    const W = Math.round((v.videoWidth * k) / 2) * 2;
    const H = Math.round((v.videoHeight * k) / 2) * 2;
    const lienzo = document.createElement("canvas");
    lienzo.width = W;
    lienzo.height = H;
    const g = lienzo.getContext("2d");
    if (!g) throw new Error("No se pudo preparar el vídeo");

    const flujo = lienzo.captureStream(30);
    if (audio) {
      try {
        const destino = audio.createMediaStreamDestination();
        audio.createMediaElementSource(v).connect(destino);
        destino.stream.getAudioTracks().forEach((p) => flujo.addTrack(p));
      } catch {
        // Sin audio: el vídeo sale mudo, pero sale.
      }
    }

    const tipo = TIPOS.find((t) => MediaRecorder.isTypeSupported(t));
    const grabador = new MediaRecorder(flujo, {
      ...(tipo ? { mimeType: tipo } : {}),
      videoBitsPerSecond: 6_000_000,
    });
    const trozos: Blob[] = [];
    grabador.ondataavailable = (e) => {
      if (e.data.size) trozos.push(e.data);
    };
    const parado = new Promise<void>((ok) => (grabador.onstop = () => ok()));

    const firma = () => {
      g.save();
      g.font = `700 ${Math.round(W * 0.026)}px sans-serif`;
      g.fillStyle = "rgba(255,255,255,0.85)";
      g.textAlign = "right";
      g.shadowColor = "rgba(0,0,0,0.8)";
      g.shadowBlur = 6;
      g.fillText("soyreinaldo.com", W - W * 0.02, H - W * 0.02);
      g.restore();
    };
    const pintar = (m?: Momento, alfa = 1) => {
      g.drawImage(v, 0, 0, W, H);
      if (m) {
        g.save();
        g.globalAlpha = alfa;
        m.pintar(g, W, H);
        g.restore();
      }
      firma();
    };

    const momentos = [...o.momentos].filter((m) => m.t <= dur).sort((a, b) => a.t - b.t);
    const total = dur + momentos.length * o.pausa;
    let congelado = 0;
    const progreso = () => o.alProgresar?.(Math.min(1, (v.currentTime + congelado) / total));
    const cancelado = () => o.senal?.aborted === true;

    await irA(v, 0);
    pintar();
    grabador.start(250);
    try {
      let i = 0;
      await v.play();
      while (!cancelado()) {
        const m = momentos[i];
        if (m && v.currentTime >= m.t - 1 / 60) {
          v.pause();
          await irA(v, m.t);
          const inicio = performance.now();
          for (;;) {
            const s = (performance.now() - inicio) / 1000;
            if (s >= o.pausa || cancelado()) break;
            pintar(m, Math.min(1, s / FUNDIDO_S));
            o.alProgresar?.(Math.min(1, (m.t + congelado + s) / total));
            await cuadro();
          }
          congelado += o.pausa;
          i++;
          if (m.t >= dur - 0.05) break;
          await v.play();
          continue;
        }
        if (v.ended || v.currentTime >= dur) break;
        pintar();
        progreso();
        await cuadro();
      }
    } finally {
      v.pause();
      grabador.stop();
      await parado;
      flujo.getTracks().forEach((p) => p.stop());
    }
    if (cancelado()) throw new DOMException("Cancelado", "AbortError");

    const mime = grabador.mimeType || tipo || "video/webm";
    o.alProgresar?.(1);
    return { blob: new Blob(trozos, { type: mime }), ext: mime.includes("mp4") ? "mp4" : "webm" };
  } finally {
    v.removeAttribute("src");
    v.load();
    void audio?.close().catch(() => undefined);
  }
}
