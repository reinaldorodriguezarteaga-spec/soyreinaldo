-- Quiniela: "¿Le ganas a Reinaldo?" y clasificación por jornada (7-oct-2026).

-- El anfitrión de la quiniela: la cuenta del dueño (username soyreinaldo).
create or replace function public.lq_anfitrion_id()
  returns uuid language sql immutable
as $$ select '399661dd-1b61-406b-a6ec-2e15e147a1dc'::uuid $$;

-- 1. Pronósticos del anfitrión para una lista de partidos. Misma regla que
--    para cualquier jugador (RLS de lq_predictions): el MARCADOR solo desde
--    el pitido inicial; antes, únicamente si ya ha pronosticado (para el
--    "Reinaldo ya ha pronosticado ✓"). Pública: es contenido de la quiniela.
create or replace function public.lq_pronosticos_anfitrion(p_match_ids int[])
  returns table(match_id int, hecho boolean, score_home smallint, score_away smallint)
  language sql stable security definer set search_path to 'public'
as $$
  select m.id,
         p.user_id is not null,
         case when m.kickoff_at <= now() then p.score_home end,
         case when m.kickoff_at <= now() then p.score_away end
  from public.lq_matches m
  left join public.lq_predictions p
    on p.match_id = m.id and p.user_id = public.lq_anfitrion_id()
  where m.id = any(p_match_ids);
$$;
grant execute on function public.lq_pronosticos_anfitrion(int[]) to anon, authenticated;

-- 2. Clasificación de UNA jornada para una liga: solo partidos terminados
--    que cuentan, con el baremo de esa liga (mismas reglas que
--    lq_leaderboard; sin picks especiales, que no son de jornada). Mismo
--    acceso que lq_leaderboard.
create or replace function public.lq_ranking_jornada(p_league_id uuid, p_matchday int)
  returns table(user_id uuid, display_name text, puntos int, exactos int, aciertos int, jugados int)
  language sql stable security definer set search_path to 'public'
as $$
  with cfg as (
    select l.lq_points_exact as p_exact, l.lq_points_result as p_result
    from public.leagues l where l.id = p_league_id
  ),
  miembros as (
    select lm.user_id from public.league_members lm where lm.league_id = p_league_id
  ),
  puntos as (
    select p.user_id,
      sum(case
            when m.score_home = p.score_home and m.score_away = p.score_away then cfg.p_exact
            when sign(m.score_home - m.score_away) = sign(p.score_home - p.score_away) then cfg.p_result
            else 0 end)::int as puntos,
      count(*) filter (where m.score_home = p.score_home and m.score_away = p.score_away)::int as exactos,
      count(*) filter (where not (m.score_home = p.score_home and m.score_away = p.score_away)
                         and sign(m.score_home - m.score_away) = sign(p.score_home - p.score_away))::int as aciertos,
      count(*)::int as jugados
    from public.lq_predictions p
    join public.lq_matches m on m.id = p.match_id
    cross join cfg
    where p.user_id in (select user_id from miembros)
      and m.matchday = p_matchday
      and m.finished and m.counts_for_scoring
      and m.score_home is not null and m.score_away is not null
    group by p.user_id
  )
  select pu.user_id, coalesce(pr.display_name, 'Sin nombre'), pu.puntos, pu.exactos, pu.aciertos, pu.jugados
  from puntos pu
  left join public.profiles pr on pr.id = pu.user_id
  order by pu.puntos desc, pu.exactos desc, pr.display_name;
$$;
grant execute on function public.lq_ranking_jornada(uuid, int) to anon, authenticated;
