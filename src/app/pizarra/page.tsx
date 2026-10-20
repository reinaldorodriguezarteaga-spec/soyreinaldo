import type { Metadata } from "next";
import { getTeamSquad, type SquadPlayer } from "@/lib/sports/api-football";
import { equiposPizarra, type EquipoPizarra } from "@/lib/pizarra/equipos";
import Pizarra, { type EquipoConPlantilla } from "./pizarra";
import SelectorEquipos from "./selector-equipos";

export const metadata: Metadata = {
  title: "Pizarra táctica: monta las alineaciones y analiza el partido | Soy Reinaldo",
  description:
    "Elige dos equipos, su formación y coloca a los jugadores en el campo. Muévelos para simular jugadas y comparte la pizarra como imagen.",
  alternates: { canonical: "/pizarra" },
};

/**
 * Pizarra táctica (20-oct, pedido del dueño): local y visitante con su
 * plantilla, formación, huecos "+" y fichas que se arrastran. Los equipos van
 * en la URL (?local=&visitante=) y solo valen los de `equiposPizarra` (de las
 * clasificaciones ya guardadas): así nadie gasta cuota pidiendo ids al azar.
 * Las plantillas las precalcula el cron; las que no, una llamada al día.
 */
export default async function PizarraPage({
  searchParams,
}: {
  searchParams: Promise<{ local?: string; visitante?: string; p?: string }>;
}) {
  const { local, visitante, p } = await searchParams;
  const grupos = await equiposPizarra();
  const porId = new Map<number, EquipoPizarra>(grupos.flatMap((g) => g.equipos.map((e) => [e.id, e])));
  const equipoDe = (v?: string) => {
    const id = Number(v);
    return Number.isInteger(id) ? (porId.get(id) ?? null) : null;
  };
  const eqLocal = equipoDe(local);
  const eqVisitante = equipoDe(visitante);

  const conPlantilla = async (e: EquipoPizarra | null): Promise<EquipoConPlantilla | null> => {
    if (!e) return null;
    const plantilla = await getTeamSquad(e.id).catch(() => [] as SquadPlayer[]);
    return {
      ...e,
      plantilla: plantilla.map((p) => ({ id: p.id, name: p.name, number: p.number, position: p.position, photo: p.photo })),
    };
  };
  const [pl, pv] = await Promise.all([conPlantilla(eqLocal), conPlantilla(eqVisitante)]);

  return (
    <main className="page">
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="wrap">
          <p className="eyebrow">Análisis</p>
          <h1 className="feat__title" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", margin: "4px 0 6px" }}>
            Pizarra táctica
          </h1>
          <p style={{ color: "var(--text-dim)", margin: "0 0 18px", maxWidth: 640 }}>
            Elige los dos equipos y su formación, coloca a los jugadores en el campo y muévelos para
            explicar cómo puede ir el partido.
          </p>
          <SelectorEquipos grupos={grupos} local={eqLocal?.id ?? null} visitante={eqVisitante?.id ?? null} />
          {pl && pv ? (
            <Pizarra key={`${pl.id}-${pv.id}`} local={pl} visitante={pv} inicial={p} />
          ) : (
            <div className="panel" style={{ padding: 24, marginTop: 18, color: "var(--text-dim)", textAlign: "center" }}>
              Elige el equipo local y el visitante para empezar.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
