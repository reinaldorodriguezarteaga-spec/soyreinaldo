"use client";
import { ChevronLeft, Star } from "lucide-react";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  equiposDeLigas,
  guardarFavoritosIniciales,
  saltarFavoritosIniciales,
  type EquipoOpcion,
} from "@/app/actions/favoritos-iniciales";

export type LigaOpcion = { slug: string; name: string; leagueId: number; region: string };

/** Páginas de cuenta: ahí el selector estorbaría (aún entrando o eligiendo nombre). */
const SIN_SELECTOR = /^\/(login|signup|auth|completar-perfil)(\/|$)/;

/**
 * Tras iniciar sesión por primera vez (16-oct, pedido del dueño): paso 1,
 * ligas favoritas; paso 2, equipos de esas ligas; paso 3, si eligió varios,
 * cuál es SU equipo ("Mi equipo" de la portada; con uno solo, ese). Lo monta el layout solo si
 * `profiles.favoritos_elegidos_at` está vacío; "Ahora no" también lo marca.
 */
export default function SelectorFavoritos({ ligas }: { ligas: LigaOpcion[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const [cerrado, setCerrado] = useState(false);
  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const [ligasSel, setLigasSel] = useState<string[]>([]);
  const [equipos, setEquipos] = useState<EquipoOpcion[] | null>(null);
  const [equiposSel, setEquiposSel] = useState<number[]>([]);
  const [miEquipo, setMiEquipo] = useState<number | null>(null);
  const [busca, setBusca] = useState("");
  const [pending, startTransition] = useTransition();

  const visible = !cerrado && !SIN_SELECTOR.test(pathname ?? "");

  // Sin scroll de la página mientras está abierto.
  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  const equiposFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (equipos ?? []).filter((e) => !q || e.name.toLowerCase().includes(q));
  }, [equipos, busca]);

  if (!visible) return null;

  const toggle = <T,>(lista: T[], v: T) =>
    lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v];

  const siguiente = () => {
    setPaso(2);
    setEquipos(null);
    startTransition(async () => setEquipos(await equiposDeLigas(ligasSel)));
  };

  const guardar = () =>
    startTransition(async () => {
      const elegidos = (equipos ?? [])
        .filter((e) => equiposSel.includes(e.id))
        .map(({ id, name, slug }) => ({ id, name, slug }));
      // Con un solo equipo, ese es "Mi equipo"; con varios, el del paso 3.
      const principal = equiposSel.length === 1 ? equiposSel[0] : miEquipo;
      await guardarFavoritosIniciales(ligasSel, elegidos, principal);
      setCerrado(true);
      router.refresh();
    });

  const saltar = () =>
    startTransition(async () => {
      await saltarFavoritosIniciales();
      setCerrado(true);
    });

  return (
    <div className="selfav" role="dialog" aria-modal="true" aria-labelledby="selfav-titulo">
      <div className="selfav__caja">
        <header className="selfav__cab">
          <p className="mono selfav__paso">
            Paso {paso} de {paso === 3 || equiposSel.length > 1 ? 3 : 2}
          </p>
          <h2 id="selfav-titulo">
            {paso === 1 ? "¿Qué ligas sigues?" : paso === 2 ? "¿Y tus equipos?" : "¿Cuál es TU equipo?"}
          </h2>
          <p className="selfav__sub">
            {paso === 1
              ? "Las tendrás a mano en Favoritos y podrás ver solo sus partidos en la portada."
              : paso === 2
                ? <>Elige tantos como quieras. Siempre puedes cambiarlos con la estrella <Star className="ico-txt" aria-hidden />.</>
                : "Saldrá arriba en la portada: su próximo partido, el último resultado y su puesto."}
          </p>
        </header>

        <div className="selfav__cuerpo">
          {paso === 1 ? (
            <div className="selfav__rejilla">
              {ligas.map((l) => {
                const on = ligasSel.includes(l.slug);
                return (
                  <button
                    key={l.slug}
                    type="button"
                    className={`selfav__op${on ? " on" : ""}`}
                    aria-pressed={on}
                    onClick={() => setLigasSel((s) => toggle(s, l.slug))}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://media.api-sports.io/football/leagues/${l.leagueId}.png`}
                      alt=""
                      width={28}
                      height={28}
                      loading="lazy"
                    />
                    <span>{l.name}</span>
                  </button>
                );
              })}
            </div>
          ) : paso === 3 ? (
            <div className="selfav__rejilla">
              {(equipos ?? [])
                .filter((e) => equiposSel.includes(e.id))
                .map((e) => {
                  const on = miEquipo === e.id;
                  return (
                    <button
                      key={e.id}
                      type="button"
                      className={`selfav__op${on ? " on" : ""}`}
                      aria-pressed={on}
                      onClick={() => setMiEquipo(e.id)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={e.logo} alt="" width={28} height={28} loading="lazy" />
                      <span>{e.name}</span>
                    </button>
                  );
                })}
            </div>
          ) : equipos == null ? (
            <p className="selfav__sub" style={{ padding: "24px 0", textAlign: "center" }}>
              Cargando equipos…
            </p>
          ) : equipos.length === 0 ? (
            <p className="selfav__sub" style={{ padding: "24px 0", textAlign: "center" }}>
              Esas competiciones no tienen equipos fijos que elegir. Guarda y listo.
            </p>
          ) : (
            <>
              <input
                className="field"
                type="search"
                placeholder="Buscar equipo…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
              <div className="selfav__rejilla">
                {equiposFiltrados.map((e) => {
                  const on = equiposSel.includes(e.id);
                  return (
                    <button
                      key={e.id}
                      type="button"
                      className={`selfav__op${on ? " on" : ""}`}
                      aria-pressed={on}
                      onClick={() => setEquiposSel((s) => toggle(s, e.id))}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={e.logo} alt="" width={28} height={28} loading="lazy" />
                      <span>{e.name}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <footer className="selfav__pie">
          {paso === 1 ? (
            <>
              <button type="button" className="backbtn" onClick={saltar} disabled={pending}>
                Ahora no
              </button>
              <button
                type="button"
                className="btn btn--accent"
                onClick={siguiente}
                disabled={pending || ligasSel.length === 0}
              >
                Siguiente ({ligasSel.length}) →
              </button>
            </>
          ) : paso === 2 && equiposSel.length > 1 ? (
            <>
              <button
                type="button"
                className="backbtn backbtn--solo"
                onClick={() => setPaso(1)}
                disabled={pending}
                aria-label="Paso anterior"
              >
                <ChevronLeft aria-hidden />
              </button>
              <button
                type="button"
                className="btn btn--accent"
                onClick={() => {
                  if (miEquipo == null || !equiposSel.includes(miEquipo)) setMiEquipo(null);
                  setPaso(3);
                }}
                disabled={pending || equipos == null}
              >
                Siguiente ({equiposSel.length}) →
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="backbtn backbtn--solo"
                onClick={() => setPaso(paso === 3 ? 2 : 1)}
                disabled={pending}
                aria-label="Paso anterior"
              >
                <ChevronLeft aria-hidden />
              </button>
              <button
                type="button"
                className="btn btn--accent"
                onClick={guardar}
                disabled={pending || equipos == null || (paso === 3 && miEquipo == null)}
              >
                {pending && equipos != null
                  ? "Guardando…"
                  : paso === 3
                    ? "Guardar ✓"
                    : `Guardar (${equiposSel.length}) ✓`}
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}
