"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { partidosDelDia } from "@/app/acciones-portada";
import CompactMatchRow from "@/components/CompactMatchRow";
import { esDeFavoritos, useSoloFavoritos, type Seguidos } from "@/lib/solo-favoritos";
import type { DiaPortada } from "@/lib/sports/widget-data";

/** Días a cada lado de hoy en la tira. */
const DIAS = 14;

const sumarDias = (dateKey: string, n: number) => {
  const d = new Date(`${dateKey}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

function etiqueta(dateKey: string, hoy: string): { arriba: string; abajo: string } {
  const d = new Date(`${dateKey}T12:00:00Z`);
  const dia = String(d.getUTCDate());
  if (dateKey === hoy) return { arriba: "Hoy", abajo: dia };
  if (dateKey === sumarDias(hoy, -1)) return { arriba: "Ayer", abajo: dia };
  if (dateKey === sumarDias(hoy, 1)) return { arriba: "Mañana", abajo: dia };
  const sem = new Intl.DateTimeFormat("es-ES", { weekday: "short", timeZone: "UTC" }).format(d).replace(".", "");
  return { arriba: sem.charAt(0).toUpperCase() + sem.slice(1), abajo: dia };
}

/**
 * Tira de fechas encima del marcador de la portada (24-oct, pedido del dueño:
 * «complicado revisar los partidos finalizados anteriormente»). En «Hoy» se
 * ve el feed de siempre (directo + próximos días); en cualquier otro día solo
 * cambia la lista: los partidos de ese día por competición, con resultado.
 * Los datos salen del calendario guardado (`partidosDelDia`): sin cuota.
 */
export default function HomeFechas({
  hoy,
  seguidos,
  children,
}: {
  /** yyyy-mm-dd de hoy en Madrid, calculado en el servidor (sin desfase de hidratación). */
  hoy: string;
  seguidos?: Seguidos;
  /** El feed de hoy. */
  children: React.ReactNode;
}) {
  const [elegido, setElegido] = useState(hoy);
  const [datos, setDatos] = useState<Record<string, DiaPortada | null>>({});
  const [soloFav] = useSoloFavoritos();
  const tira = useRef<HTMLDivElement>(null);
  const raiz = useRef<HTMLDivElement>(null);
  // Alto de la cabecera fija: la tira se pega justo debajo.
  const [altoNav, setAltoNav] = useState(72);
  useEffect(() => {
    const nav = document.querySelector<HTMLElement>("nav.nav");
    if (!nav) return;
    const medir = () => setAltoNav(nav.offsetHeight);
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(nav);
    return () => ro.disconnect();
  }, []);
  const dias = Array.from({ length: DIAS * 2 + 1 }, (_, i) => sumarDias(hoy, i - DIAS));

  useEffect(() => {
    if (elegido === hoy || elegido in datos) return;
    let vigente = true;
    partidosDelDia(elegido)
      .catch(() => null)
      .then((d) => vigente && setDatos((prev) => ({ ...prev, [elegido]: d })));
    return () => {
      vigente = false;
    };
  }, [elegido, hoy, datos]);

  // El día elegido, siempre centrado en la tira. Moviendo solo la tira
  // (scrollLeft): scrollIntoView también arrastraba la página al cargar.
  const primera = useRef(true);
  useEffect(() => {
    const caja = tira.current;
    const el = caja?.querySelector<HTMLElement>(`[data-dia="${elegido}"]`);
    if (!caja || !el) return;
    const izquierda = el.offsetLeft - (caja.clientWidth - el.clientWidth) / 2; // la tira es el offsetParent
    caja.scrollTo({ left: izquierda, behavior: primera.current ? "auto" : "smooth" });
    // Al cambiar de día (no al cargar), si ya se había bajado por la lista,
    // se vuelve al principio del día elegido: la lista nueva suele ser más
    // corta y dejaba al usuario abajo del todo (24-oct, pedido del dueño).
    const arriba = raiz.current?.getBoundingClientRect().top ?? 0;
    if (!primera.current && arriba < altoNav) {
      window.scrollTo({ top: window.scrollY + arriba - altoNav - 8, behavior: "auto" });
    }
    primera.current = false;
  }, [elegido, altoNav]);

  const mover = (n: number) => {
    const i = dias.indexOf(elegido) + n;
    if (i >= 0 && i < dias.length) setElegido(dias[i]);
  };

  const dia = elegido === hoy ? null : datos[elegido];
  const cargando = elegido !== hoy && !(elegido in datos);
  const tieneSeguidos = !!seguidos && seguidos.equipos.length > 0;
  const grupos = (dia?.grupos ?? [])
    .map((g) =>
      soloFav && tieneSeguidos
        ? { ...g, fixtures: g.fixtures.filter((fx) => esDeFavoritos(seguidos!, fx.teams.home.id, fx.teams.away.id)) }
        : g,
    )
    .filter((g) => g.fixtures.length > 0);
  // Los partidos de tus equipos ⭐, los primeros (como en el feed de hoy).
  const deFavoritos =
    tieneSeguidos && !soloFav
      ? grupos.flatMap((g) =>
          g.fixtures
            .filter((fx) => esDeFavoritos(seguidos!, fx.teams.home.id, fx.teams.away.id))
            .map((fx) => ({ fx, slug: g.slug, nombre: g.nombre })),
        )
      : [];

  return (
    <div className="space-y-3" style={{ minWidth: 0, ["--alto-nav" as string]: `${altoNav}px` }} ref={raiz}>
      <div className="hfechas" role="tablist" aria-label="Elegir día">
        <button type="button" className="hfechas__flecha" onClick={() => mover(-1)} aria-label="Día anterior">
          ‹
        </button>
        <div className="hfechas__tira" ref={tira}>
          {dias.map((d) => {
            const e = etiqueta(d, hoy);
            return (
              <button
                key={d}
                type="button"
                role="tab"
                aria-selected={d === elegido}
                data-dia={d}
                className={`hfechas__dia${d === elegido ? " is-on" : ""}${d === hoy ? " is-hoy" : ""}`}
                onClick={() => setElegido(d)}
              >
                <span>{e.arriba}</span>
                <b>{e.abajo}</b>
              </button>
            );
          })}
        </div>
        <button type="button" className="hfechas__flecha" onClick={() => mover(1)} aria-label="Día siguiente">
          ›
        </button>
      </div>

      {elegido === hoy ? (
        children
      ) : cargando ? (
        <p className="panel hfechas__aviso">Cargando partidos…</p>
      ) : grupos.length === 0 ? (
        <p className="panel hfechas__aviso">
          {soloFav && tieneSeguidos ? "Ese día no jugó ninguno de tus favoritos." : "Ese día no hay partidos de nuestras competiciones."}{" "}
          <button type="button" className="hfechas__volver" onClick={() => setElegido(hoy)}>
            Volver a hoy
          </button>
        </p>
      ) : (
        <>
          {deFavoritos.length > 0 && (
            <div className="panel" style={{ overflow: "hidden" }}>
              <div className="hfechas__cab">
                <b className="truncate">⭐ Tus favoritos</b>
              </div>
              <div style={{ borderTop: "1px solid var(--line)", padding: "4px 12px 12px" }}>
                <div className="hmrowlist">
                  {deFavoritos.map(({ fx, slug, nombre }) => (
                    <CompactMatchRow key={fx.fixture.id} fx={fx} href={`/liga/${slug}/partido/${fx.fixture.id}`} badge={nombre} />
                  ))}
                </div>
              </div>
            </div>
          )}
          {grupos.map((g) => (
          <div key={g.slug} className="panel" style={{ overflow: "hidden" }}>
            <div className="hfechas__cab">
              <b className="truncate">{g.nombre}</b>
              <span className="mono">
                {g.fixtures.length} partido{g.fixtures.length === 1 ? "" : "s"}
              </span>
              <Link href={`/liga/${g.slug}`} className="match__when" style={{ color: "var(--accent)", textDecoration: "none" }}>
                Ver todo →
              </Link>
            </div>
            <div style={{ borderTop: "1px solid var(--line)", padding: "4px 12px 12px" }}>
              <div className="hmrowlist">
                {g.fixtures.map((fx) => (
                  <CompactMatchRow key={fx.fixture.id} fx={fx} href={`/liga/${g.slug}/partido/${fx.fixture.id}`} />
                ))}
              </div>
            </div>
          </div>
          ))}
        </>
      )}
    </div>
  );
}
