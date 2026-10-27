import "server-only";
import { clienteServicio } from "./jornada-datos";
import { textoExactos } from "./chat";

/**
 * Mensajes automáticos del chat de la quiniela (27-oct): lo que más
 * conversación genera. Nunca rompen lo que los llama: cualquier fallo se
 * traga.
 */

const nombreDe = (p?: { display_name: string | null; username: string | null } | null) =>
  p?.display_name || p?.username || "Alguien";

export async function mensajeSistema(leagueId: string, texto: string): Promise<void> {
  const db = clienteServicio();
  if (!db) return;
  await db.from("lq_chat").insert({ league_id: leagueId, tipo: "sistema", texto });
}

/**
 * Al terminar un partido de LaLiga: en cada liga, quién clavó el marcador
 * exacto. Un mensaje por liga, no uno por persona.
 */
export async function anunciarExactos(matchId: number): Promise<void> {
  try {
    const db = clienteServicio();
    if (!db) return;
    const { data: m } = await db
      .from("lq_matches")
      .select("score_home, score_away, counts_for_scoring, home:team_home(name), away:team_away(name)")
      .eq("id", matchId)
      .maybeSingle<{
        score_home: number | null;
        score_away: number | null;
        counts_for_scoring: boolean;
        home: { name: string } | null;
        away: { name: string } | null;
      }>();
    // La Champions es otra quiniela (counts_for_scoring = false).
    if (!m || !m.counts_for_scoring || m.score_home == null || m.score_away == null) return;
    const { data: aciertos } = await db
      .from("lq_predictions")
      .select("user_id")
      .eq("match_id", matchId)
      .eq("score_home", m.score_home)
      .eq("score_away", m.score_away);
    const ids = (aciertos ?? []).map((a: { user_id: string }) => a.user_id);
    if (ids.length === 0) return;
    const [{ data: miembros }, { data: perfiles }] = await Promise.all([
      db.from("league_members").select("league_id, user_id, leagues!inner(kind)").in("user_id", ids).eq("leagues.kind", "clubs"),
      db.from("profiles").select("id, display_name, username").in("id", ids),
    ]);
    const nombre = new Map(
      ((perfiles ?? []) as { id: string; display_name: string | null; username: string | null }[]).map((p) => [p.id, nombreDe(p)]),
    );
    const porLiga = new Map<string, string[]>();
    for (const r of (miembros ?? []) as { league_id: string; user_id: string }[]) {
      porLiga.set(r.league_id, [...(porLiga.get(r.league_id) ?? []), nombre.get(r.user_id) ?? "Alguien"]);
    }
    const local = m.home?.name ?? "Local";
    const visitante = m.away?.name ?? "Visitante";
    await Promise.all(
      [...porLiga].map(([liga, nombres]) =>
        mensajeSistema(liga, textoExactos(local, visitante, m.score_home!, m.score_away!, nombres.sort())),
      ),
    );
  } catch {
    // El chat nunca rompe la ingesta.
  }
}

/** «⚔️ Ana reta a Luis en la jornada 11». */
export async function anunciarReto(dueloId: string, aceptado = false): Promise<void> {
  try {
    const db = clienteServicio();
    if (!db) return;
    const { data: d } = await db
      .from("lq_duelos")
      .select("league_id, matchday, retador, rival")
      .eq("id", dueloId)
      .maybeSingle<{ league_id: string; matchday: number; retador: string; rival: string }>();
    if (!d) return;
    const { data: perfiles } = await db.from("profiles").select("id, display_name, username").in("id", [d.retador, d.rival]);
    const p = (id: string) => nombreDe((perfiles ?? []).find((x: { id: string }) => x.id === id));
    await mensajeSistema(
      d.league_id,
      aceptado
        ? `🤝 ${p(d.rival)} acepta el duelo de ${p(d.retador)} en la jornada ${d.matchday}. ¡Que gane el mejor!`
        : `⚔️ ${p(d.retador)} reta a ${p(d.rival)} en la jornada ${d.matchday}. ¿Aceptará?`,
    );
  } catch {
    // Igual que arriba.
  }
}
