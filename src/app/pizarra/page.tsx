import type { Metadata } from "next";
import { equiposVistaPrevia } from "@/lib/pizarra/equipos-vista-previa";
import {
  getFixtureById,
  getFixtureLineups,
  getTeamFixtures,
  getTeamSquad,
  type Fixture,
  type LineupPlayer,
  type LineupTeam,
  type SquadPlayer,
} from "@/lib/sports/api-football";
import Link from "next/link";
import { COMPETITIONS } from "@/lib/sports/competitions";
import { createClient } from "@/lib/supabase/server";
import { equiposEnEspanol } from "@/lib/sports/nombres";
import { equiposPizarra, type EquipoPizarra, type GrupoEquipos } from "@/lib/pizarra/equipos";
import { desdeAlineacion } from "@/lib/pizarra/desde-alineacion";
import { estadoInicial, type Estado } from "@/lib/pizarra/estado";
import Pizarra, { type EquipoConPlantilla, type JugadorPizarra } from "./pizarra";
import SelectorEquipos from "./selector-equipos";

const metadataBase: Metadata = {
  title: "Pizarra táctica: monta las alineaciones y analiza el partido | Soy Reinaldo",
  description:
    "Elige dos equipos, su formación y coloca a los jugadores en el campo. Muévelos, anima la jugada y compártela como imagen o vídeo.",
  alternates: { canonical: "/pizarra" },
};

export async function generateMetadata({ searchParams }: {
  searchParams: Promise<{ local?: string; visitante?: string; p?: string; partido?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const equipos = await equiposVistaPrevia(params.local, params.visitante, params.partido);
  if (!equipos) return metadataBase;
  const titulo = `${equipos.local.name} vs ${equipos.visitante.name} · Pizarra táctica | Soy Reinaldo`;
  const query = new URLSearchParams();
  for (const clave of ["local", "visitante", "partido", "p"] as const) {
    if (params[clave] !== undefined) query.set(clave, params[clave]);
  }
  const imagen = `/pizarra/imagen?${query}`;
  return {
    ...metadataBase,
    title: titulo,
    openGraph: { title: titulo, images: [{ url: imagen, width: 1200, height: 630, alt: titulo }] },
    twitter: { card: "summary_large_image", title: titulo, images: [imagen] },
  };
}

/**
 * Pizarra táctica (20-oct, pedido del dueño): local y visitante con su
 * plantilla, formación, huecos "+" y fichas que se arrastran. Los equipos van
 * en la URL (?local=&visitante=) y solo valen los de `equiposPizarra` (de las
 * clasificaciones ya guardadas): así nadie gasta cuota pidiendo ids al azar.
 * Las plantillas las precalcula el cron; las que no, una llamada al día.
 *
 * Fase 3: `?partido=` (botón «Abrir en la pizarra» de la ficha) monta la
 * pizarra con las alineaciones reales. Solo partidos de nuestras
 * competiciones; partido y alineaciones salen de la misma caché que la ficha.
 */
const POS_API: Record<string, string> = { G: "Goalkeeper", D: "Defender", M: "Midfielder", F: "Attacker" };

export default async function PizarraPage({
  searchParams,
}: {
  searchParams: Promise<{ local?: string; visitante?: string; p?: string; partido?: string }>;
}) {
  const { local, visitante, p, partido } = await searchParams;
  const [grupos, {
    data: { user },
  }] = await Promise.all([equiposPizarra(), (await createClient()).auth.getUser()]);
  const porId = new Map<number, EquipoPizarra>(grupos.flatMap((g) => g.equipos.map((e) => [e.id, e])));

  // ¿Viene de un partido?
  const idPartido = Number(partido);
  const fixture = Number.isInteger(idPartido) && idPartido > 0 ? await getFixtureById(idPartido).catch(() => null) : null;
  const deLosNuestros = !!fixture && COMPETITIONS.some((c) => c.leagueId === fixture.league.id);
  const delPartido = deLosNuestros ? equiposEnEspanol(fixture!) : null;
  const alineaciones: LineupTeam[] = delPartido ? await getFixtureLineups(idPartido).catch(() => []) : [];

  const equipoDe = (v: string | undefined, lado: "home" | "away"): EquipoPizarra | null => {
    if (delPartido) {
      const t = delPartido.teams[lado];
      return { id: t.id, name: t.name, logo: t.logo };
    }
    const id = Number(v);
    return Number.isInteger(id) ? (porId.get(id) ?? null) : null;
  };
  const eqLocal = equipoDe(local, "home");
  const eqVisitante = equipoDe(visitante, "away");
  // Sin partido ni pizarra compartida: cada equipo arranca con su última
  // alineación titular (22-oct, pedido del dueño). Sale de la misma caché
  // que el calendario de los equipos y del archivo de partidos terminados.
  const ultimaAlineacion = async (e: EquipoPizarra | null): Promise<LineupTeam | null> => {
    if (!e || delPartido || p) return null;
    const { recent } = await getTeamFixtures(e.id, { last: 1, next: 0 }).catch(() => ({ recent: [] as Fixture[] }));
    const ultimo = recent[0];
    if (!ultimo) return null;
    return (await getFixtureLineups(ultimo.fixture.id).catch(() => [])).find((l) => l.teamId === e.id) ?? null;
  };
  const [ultLocal, ultVisitante] = await Promise.all([ultimaAlineacion(eqLocal), ultimaAlineacion(eqVisitante)]);
  const alineacionDe = (e: EquipoPizarra | null) =>
    e
      ? (alineaciones.find((l) => l.teamId === e.id) ??
        (e.id === eqLocal?.id ? ultLocal : e.id === eqVisitante?.id ? ultVisitante : null))
      : null;

  const conPlantilla = async (e: EquipoPizarra | null): Promise<EquipoConPlantilla | null> => {
    if (!e) return null;
    const plantilla: JugadorPizarra[] = (await getTeamSquad(e.id).catch(() => [] as SquadPlayer[])).map((j) => ({
      id: j.id,
      name: j.name,
      number: j.number,
      position: j.position,
      photo: j.photo,
    }));
    // Titulares y suplentes del partido que no estén en la plantilla
    // (fichajes recientes, canteranos): se añaden con su foto de la CDN.
    const ya = new Set(plantilla.map((j) => j.id));
    const al = alineacionDe(e);
    const extra = [...(al?.startXI ?? []), ...(al?.substitutes ?? [])]
      .filter((j: LineupPlayer) => !ya.has(j.id))
      .map((j) => ({
        id: j.id,
        name: j.name,
        number: j.number,
        position: POS_API[j.pos ?? ""] ?? null,
        photo: `https://media.api-sports.io/football/players/${j.id}.png`,
      }));
    return { ...e, plantilla: [...plantilla, ...extra] };
  };
  const [pl, pv] = await Promise.all([conPlantilla(eqLocal), conPlantilla(eqVisitante)]);
  // Un solo equipo (22-oct): basta con elegir uno; el otro lado queda vacío.
  const solo = !delPartido && !!(pl || pv) && !(pl && pv);
  const unico = pl ?? pv;
  const VACIO: EquipoConPlantilla = { id: 0, name: "", logo: "", plantilla: [] };

  // La pizarra con las alineaciones del partido (si ya están publicadas) o
  // con la última de cada equipo.
  let preparado: Estado | undefined;
  const aLocal = desdeAlineacion(alineacionDe(eqLocal), "local");
  const aVisitante = desdeAlineacion(alineacionDe(eqVisitante), "visitante");
  if (aLocal || aVisitante) {
    const e = estadoInicial();
    if (aLocal) {
      e.formacion.local = aLocal.formacion;
      e.once.local = aLocal.once;
      Object.assign(e.movidos, aLocal.movidos);
    }
    if (aVisitante) {
      e.formacion.visitante = aVisitante.formacion;
      e.once.visitante = aVisitante.once;
      Object.assign(e.movidos, aVisitante.movidos);
    }
    preparado = e;
  }
  // Un solo equipo: su última alineación, siempre en el lado local.
  let preparadoSolo: Estado | undefined;
  const aSolo = solo && unico ? desdeAlineacion(alineacionDe(unico), "local") : null;
  if (aSolo) {
    preparadoSolo = estadoInicial();
    preparadoSolo.formacion.local = aSolo.formacion;
    preparadoSolo.once.local = aSolo.once;
    Object.assign(preparadoSolo.movidos, aSolo.movidos);
  }

  // Equipos del partido que no están en la lista (p. ej. de una copa): se
  // enseñan en el selector para que se vea cuáles son.
  const gruposVista: GrupoEquipos[] =
    delPartido && [eqLocal, eqVisitante].some((x) => x && !porId.has(x.id))
      ? [{ liga: "partido", nombre: "Este partido", equipos: [eqLocal!, eqVisitante!] }, ...grupos]
      : grupos;

  return (
    <main className="page">
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="wrap">
          <p className="eyebrow">
            Análisis · <Link href="/pizarra/comunidad">Pizarras de la comunidad →</Link> ·{" "}
            <Link href="/pizarra/fotos">🖼️ Analiza tu jugada (fotos) →</Link>
          </p>
          <h1 className="feat__title" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", margin: "4px 0 6px" }}>
            Pizarra táctica
          </h1>
          <p style={{ color: "var(--text-dim)", margin: "0 0 18px", maxWidth: 640 }}>
            Elige los dos equipos y su formación, coloca a los jugadores en el campo y muévelos para
            explicar cómo puede ir el partido. Guarda etapas para animar la jugada y compártela en vídeo.
          </p>
          <SelectorEquipos grupos={gruposVista} local={eqLocal?.id ?? null} visitante={eqVisitante?.id ?? null} />
          {delPartido && !preparado && (
            <p className="pz-ayuda" style={{ marginTop: 10 }}>
              Las alineaciones de este partido aún no están publicadas (suelen salir una hora antes). Puedes
              montar la tuya.
            </p>
          )}
          {pl && pv ? (
            <Pizarra
              key={`${pl.id}-${pv.id}-${delPartido ? idPartido : ""}`}
              local={pl}
              visitante={pv}
              inicial={p}
              preparado={preparado}
              partido={delPartido ? idPartido : undefined}
              conectado={!!user}
            />
          ) : solo && unico ? (
            <>
              <p className="pz-ayuda" style={{ marginTop: 10 }}>
                Analizando solo a {unico.name}. Elige un rival arriba si quieres los dos equipos.
              </p>
              <Pizarra key={`solo-${unico.id}`} local={unico} visitante={VACIO} inicial={p} preparado={preparadoSolo} solo conectado={!!user} />
            </>
          ) : (
            <div className="panel" style={{ padding: 24, marginTop: 18, color: "var(--text-dim)", textAlign: "center" }}>
              Elige un equipo para empezar (o dos, para enfrentarlos).
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
