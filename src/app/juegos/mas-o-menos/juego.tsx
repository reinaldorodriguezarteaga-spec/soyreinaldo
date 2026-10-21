"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { ESTADISTICAS, siguientePareja, type JugadorMm } from "@/lib/juegos/mas-o-menos";

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

export default function Juego({ jugadores }: { jugadores: JugadorMm[] }) {
  const [pareja, setPareja] = useState<Pareja | null>(null);
  const [elegido, setElegido] = useState<number | null>(null);
  const [racha, setRacha] = useState(0);
  const [mejor, setMejor] = useState(0);
  const [fin, setFin] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const nativo = useSyncExternalStore(sinSuscripcion, () => "share" in navigator, () => false);

  // La primera pareja, al montar: con Math.random en el servidor no casaría al hidratar.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- arranque único al montar, no cascada
    setPareja(siguientePareja(jugadores, Math.random));
    setMejor(leerMejor());
  }, [jugadores]);

  if (!pareja) return <div className="panel" style={{ padding: 24, minHeight: 280 }} />;
  const { a, b, stat } = pareja;
  const ganador = a[stat] > b[stat] ? a.id : b.id;
  const resuelto = elegido != null;

  function elegir(id: number) {
    if (resuelto) return;
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
    } else setFin(true);
  }

  function seguir() {
    if (fin) {
      setRacha(0);
      setFin(false);
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
      <p className="mm-pregunta">¿Quién tiene más {ESTADISTICAS[stat]} esta temporada?</p>
      <div className="mm-duelo">
        {[a, b].map((j, i) => (
          <button
            key={j.id}
            type="button"
            className={`mm-jug${resuelto ? (j.id === ganador ? " is-ok" : j.id === elegido ? " is-mal" : "") : ""}`}
            onClick={() => elegir(j.id)}
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
          {fin && (
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
            {fin ? "Otra vez" : "Siguiente →"}
          </button>
        </div>
      )}
      {fin && <p className="mm-fin">Fallaste. Racha final: {racha}.</p>}
    </div>
  );
}
