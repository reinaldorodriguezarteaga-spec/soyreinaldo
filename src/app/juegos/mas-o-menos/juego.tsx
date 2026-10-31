"use client";
import { Timer } from "lucide-react";

import { useEffect, useState, useSyncExternalStore } from "react";
import { ESTADISTICAS, siguientePareja, type JugadorMm } from "@/lib/juegos/mas-o-menos";
import { NIVELES, puntosMasOMenos, reloj, type Nivel } from "@/lib/juegos/niveles";
import ElegirNivel from "@/components/juegos/ElegirNivel";
import CierreJuego from "@/components/juegos/CierreJuego";
import { useCronometro } from "@/components/juegos/useCronometro";

/** Racha hasta el primer fallo; la mejor se guarda en el navegador. */

const CLAVE = "jg-masomenos-mejor";
const sinSuscripcion = () => () => {};
type Pareja = NonNullable<ReturnType<typeof siguientePareja>>;

function leerMejor(): number {
  try {
    return Number(localStorage.getItem(CLAVE)) || 0;
  } catch {
    return 0;
  }
}

export default function Juego({ jugadores, numero }: { jugadores: JugadorMm[]; numero: number }) {
  const [pareja, setPareja] = useState<Pareja | null>(null);
  const [elegido, setElegido] = useState<number | null>(null);
  const [racha, setRacha] = useState(0);
  const [mejor, setMejor] = useState(0);
  const [nivel, setNivel] = useState<Nivel | null>(null);
  const [inicio, setInicio] = useState<number | null>(null);
  const [fin, setFin] = useState<number | null>(null);
  const [copiado, setCopiado] = useState(false);
  const nativo = useSyncExternalStore(sinSuscripcion, () => "share" in navigator, () => false);

  // La primera pareja, al montar: con Math.random en el servidor no casaría al hidratar.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- arranque único al montar, no cascada
    setPareja(siguientePareja(jugadores, Math.random));
    setMejor(leerMejor());
  }, [jugadores]);

  const restante = useCronometro(NIVELES[nivel ?? "facil"].segundos, inicio, fin);
  const agotado = inicio != null && fin == null && restante === 0;
  const terminado = fin != null || agotado;

  useEffect(() => {
    if (!agotado) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- respuesta al reloj (externo), una sola vez
    setFin(Date.now());
  }, [agotado]);

  function empezar(n: Nivel) {
    setNivel(n);
    setInicio(Date.now());
    setFin(null);
  }

  if (!pareja) return <div className="panel" style={{ padding: 24, minHeight: 280 }} />;
  const { a, b, stat } = pareja;
  const ganador = a[stat] > b[stat] ? a.id : b.id;
  const resuelto = elegido != null || terminado;
  const puntos = nivel ? puntosMasOMenos({ racha, nivel }) : 0;

  function elegir(id: number, ahora: number) {
    if (resuelto || !nivel) return;
    setElegido(id);
    if (id === ganador) {
      const r = racha + 1;
      setRacha(r);
      if (r > mejor) {
        setMejor(r);
        try {
          localStorage.setItem(CLAVE, String(r));
        } catch {
          // Sin storage: la mejor racha no se recuerda.
        }
      }
    } else setFin(ahora);
  }

  function seguir() {
    if (terminado) {
      setRacha(0);
      setNivel(null);
      setInicio(null);
      setFin(null);
      setCopiado(false);
    }
    setElegido(null);
    setPareja(siguientePareja(jugadores, Math.random));
  }

  const texto = `¿Más o menos? · racha de ${racha} 🔥\nsoyreinaldo.com/juegos/mas-o-menos`;

  return (
    <div className="jg">
      <div className="mm-marcador">
        <span>
          Racha <b>{racha}</b>
        </span>
        <span>
          Mejor <b>{mejor}</b>
        </span>
      </div>
      {!nivel ? (
        <ElegirNivel onElegir={empezar} />
      ) : (
        <>
          {!terminado && (
            <span className={`jreloj${restante <= 10 ? " is-poco" : ""}`} aria-label="Tiempo que queda">
              <Timer className="ico-txt" aria-hidden /> {reloj(restante)} · {NIVELES[nivel].nombre}
            </span>
          )}
          <p className="mm-pregunta">¿Quién tiene más {ESTADISTICAS[stat]} esta temporada?</p>
          <div className="mm-duelo">
            {[a, b].map((j, i) => (
              <button
                key={j.id}
                type="button"
                className={`mm-jug${resuelto ? (j.id === ganador ? " is-ok" : j.id === elegido ? " is-mal" : "") : ""}`}
                onClick={() => elegir(j.id, Date.now())}
                disabled={resuelto}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- foto de la CDN de la API */}
                <img src={j.foto} alt="" width={96} height={96} className="mm-jug__foto" />
                <b>{j.nombre}</b>
                <span className="mm-jug__eq">
                  {/* eslint-disable-next-line @next/next/no-img-element -- escudo de la CDN de la API */}
                  <img src={j.escudo} alt="" width={18} height={18} /> {j.equipo}
                </span>
                <span className="mm-jug__liga">{j.liga}</span>
                <span className="mm-jug__num">{resuelto ? j[stat] : "?"}</span>
                {i === 0 && <span className="mm-vs" aria-hidden>VS</span>}
              </button>
            ))}
          </div>
          {resuelto && (
            <div className="jg-acciones" style={{ justifyContent: "center", marginTop: 14 }}>
              {terminado && (
                <>
                  {nativo ? (
                    <button type="button" className="btn" onClick={() => navigator.share({ text: texto }).catch(() => {})}>
                      Compartir racha
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn"
                      onClick={() =>
                        navigator.clipboard
                          .writeText(texto)
                          .then(() => setCopiado(true))
                          .catch(() => {})
                      }
                    >
                      {copiado ? "¡Copiado!" : "Copiar racha"}
                    </button>
                  )}
                </>
              )}
              <button type="button" className="btn btn--accent" onClick={seguir}>
                {terminado ? "Otra vez" : "Siguiente →"}
              </button>
            </div>
          )}
          {terminado && <p className="mm-fin">{restante === 0 ? <><Timer className="ico-txt" aria-hidden /> Se acabó el tiempo.</> : "Fallaste."} Racha final: {racha}.</p>}
          {terminado && (
            <CierreJuego juego="masomenos" dia={numero} nivel={nivel} puntos={puntos} resultado={`racha ${racha} 🔥`} />
          )}
        </>
      )}
    </div>
  );
}
