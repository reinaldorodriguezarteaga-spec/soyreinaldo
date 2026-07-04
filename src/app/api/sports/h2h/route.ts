import { NextResponse } from "next/server";
import { getHeadToHead, isFinal } from "@/lib/sports/api-football";

export const runtime = "nodejs";

export type H2HMatch = {
  id: number;
  date: string;
  league: string;
  leagueLogo: string | null;
  home: { id: number; name: string; logo: string; goals: number | null };
  away: { id: number; name: string; logo: string; goals: number | null };
  finished: boolean;
};

export type H2HData = {
  summary: { aWins: number; bWins: number; draws: number; played: number };
  matches: H2HMatch[];
};

/**
 * Enfrentamientos históricos entre dos equipos:
 *   GET /api/sports/h2h?a=1530&b=1531  → H2HData
 * `a` y `b` son ids de equipo de API-Football (el local y el visitante del
 * partido). El resumen (victorias/empates) se calcula desde la perspectiva de
 * `a`. Cargado bajo demanda al abrir la pestaña "Cara a cara".
 */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const a = parseInt(sp.get("a") ?? "", 10);
  const b = parseInt(sp.get("b") ?? "", 10);
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return NextResponse.json({ error: "bad params" }, { status: 400 });
  }

  try {
    const fixtures = await getHeadToHead(a, b, { last: 20 });

    let aWins = 0;
    let bWins = 0;
    let draws = 0;
    let played = 0;

    const matches: H2HMatch[] = fixtures.map((f) => {
      const done = isFinal(f);
      const gh = f.goals.home;
      const ga = f.goals.away;
      if (done && gh != null && ga != null) {
        played += 1;
        const homeIsA = f.teams.home.id === a;
        if (gh === ga) draws += 1;
        else {
          const homeWon = gh > ga;
          const aWon = homeIsA ? homeWon : !homeWon;
          if (aWon) aWins += 1;
          else bWins += 1;
        }
      }
      return {
        id: f.fixture.id,
        date: f.fixture.date,
        league: f.league.name,
        leagueLogo: f.league.logo ?? null,
        home: {
          id: f.teams.home.id,
          name: f.teams.home.name,
          logo: f.teams.home.logo,
          goals: f.goals.home,
        },
        away: {
          id: f.teams.away.id,
          name: f.teams.away.name,
          logo: f.teams.away.logo,
          goals: f.goals.away,
        },
        finished: done,
      };
    });

    const data: H2HData = {
      summary: { aWins, bWins, draws, played },
      matches,
    };
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { summary: { aWins: 0, bWins: 0, draws: 0, played: 0 }, matches: [] },
      { status: 200 },
    );
  }
}
