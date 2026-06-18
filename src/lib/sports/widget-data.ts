import {
  TEAM_IDS,
  getFixtureGoalsAndCards,
  getRelevantFixtureForTeam,
  getWorldCupFixturesWindow,
  isFinal,
  isLive,
  isWorldCupActive,
  type Fixture,
  type FixtureCard,
  type FixtureGoal,
} from "./api-football";

export type WidgetMode = "wc" | "clubs";

/** Goles y expulsiones de un partido, para pintarlos en la tarjeta. */
export type FixtureEvents = { goals: FixtureGoal[]; reds: FixtureCard[] };

/** Un fixture con sus eventos adjuntos (null si no está en juego ni terminado). */
export type WcFixture = Fixture & { ev: FixtureEvents | null };

export type WidgetData = {
  mode: WidgetMode;
  fixtures: WcFixture[];
  /** True if some fixture is live or starts within ~30 min — gate cliente para polling. */
  needsPolling: boolean;
};

const POLL_LEAD_MS = 30 * 60 * 1000; // 30 min antes del kickoff

function shouldPoll(fixtures: Fixture[]): boolean {
  const now = Date.now();
  return fixtures.some((f) => {
    if (isLive(f)) return true;
    if (isFinal(f)) return false;
    const ko = new Date(f.fixture.date).getTime();
    return ko - now < POLL_LEAD_MS && ko - now > -3 * 60 * 60 * 1000;
  });
}

function orderForDisplay(fixtures: Fixture[]): Fixture[] {
  return [...fixtures].sort((a, b) => {
    const score = (f: Fixture) => (isLive(f) ? 0 : isFinal(f) ? 2 : 1);
    const s = score(a) - score(b);
    if (s !== 0) return s;
    return new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime();
  });
}

/**
 * Adjunta goles y expulsiones a los partidos en juego/terminados. Los demás
 * (próximos) van con `ev: null`. Caché corta para los live (25s), larga para
 * los terminados (600s).
 */
export async function attachEvents(fixtures: Fixture[]): Promise<WcFixture[]> {
  return Promise.all(
    fixtures.map(async (f): Promise<WcFixture> => {
      if (!isLive(f) && !isFinal(f)) return { ...f, ev: null };
      try {
        // Deriva de los eventos completos (misma caché que los goleadores):
        // fresco para los live (30s) y largo para los terminados (1 día).
        const { goals, reds } = await getFixtureGoalsAndCards(
          f.fixture.id,
          isFinal(f),
        );
        return { ...f, ev: { goals, reds } };
      } catch {
        return { ...f, ev: null };
      }
    }),
  );
}

export async function getWidgetData(): Promise<WidgetData> {
  if (isWorldCupActive()) {
    const fixtures = await attachEvents(
      orderForDisplay(await getWorldCupFixturesWindow()),
    );
    return { mode: "wc", fixtures, needsPolling: shouldPoll(fixtures) };
  }

  const [barca, madrid] = await Promise.all([
    getRelevantFixtureForTeam(TEAM_IDS.barcelona),
    getRelevantFixtureForTeam(TEAM_IDS.realMadrid),
  ]);

  // Si Barça y Madrid juegan el mismo partido (Clásico), evitamos pintarlo dos
  // veces.
  const seen = new Set<number>();
  const base: Fixture[] = [];
  for (const f of [barca, madrid]) {
    if (!f) continue;
    if (seen.has(f.fixture.id)) continue;
    seen.add(f.fixture.id);
    base.push(f);
  }
  const fixtures = await attachEvents(base);
  return { mode: "clubs", fixtures, needsPolling: shouldPoll(fixtures) };
}
