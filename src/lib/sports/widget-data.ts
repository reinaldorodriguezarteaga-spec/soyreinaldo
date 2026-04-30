import {
  TEAM_IDS,
  getRelevantFixtureForTeam,
  getWorldCupFixturesForDay,
  isFinal,
  isLive,
  isWorldCupActive,
  type Fixture,
} from "./api-football";

export type WidgetMode = "wc" | "clubs";

export type WidgetData = {
  mode: WidgetMode;
  fixtures: Fixture[];
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

export async function getWidgetData(): Promise<WidgetData> {
  if (isWorldCupActive()) {
    const fixtures = orderForDisplay(await getWorldCupFixturesForDay(new Date()));
    return { mode: "wc", fixtures, needsPolling: shouldPoll(fixtures) };
  }

  const [barca, madrid] = await Promise.all([
    getRelevantFixtureForTeam(TEAM_IDS.barcelona),
    getRelevantFixtureForTeam(TEAM_IDS.realMadrid),
  ]);

  // Si Barça y Madrid juegan el mismo partido (Clásico), evitamos pintarlo dos
  // veces.
  const seen = new Set<number>();
  const fixtures: Fixture[] = [];
  for (const f of [barca, madrid]) {
    if (!f) continue;
    if (seen.has(f.fixture.id)) continue;
    seen.add(f.fixture.id);
    fixtures.push(f);
  }
  return { mode: "clubs", fixtures, needsPolling: shouldPoll(fixtures) };
}
