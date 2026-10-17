-- Medallas de los pronósticos (17-oct, pedido del dueño). Se calculan en la
-- web a partir de este resumen por jugador y jornada (solo partidos
-- terminados que puntúan, baremo de la liga). Mismos datos que ya se ven en
-- la clasificación por jornada: no expone pronósticos.

create or replace function public.lq_jornadas_jugador(p_league_id uuid)
returns table(user_id uuid, matchday int, puntos int, exactos int, signos int, jugados int,
              partidos int, terminada boolean)
language sql stable security definer set search_path = public as $$
  with cfg as (
    select l.lq_points_exact as p_exact, l.lq_points_result as p_result from public.leagues l where l.id = p_league_id
  ),
  jornadas as (
    select m.matchday,
           (count(*) filter (where m.finished and m.score_home is not null))::int as partidos,
           coalesce(bool_and(m.finished) filter (where coalesce(m.status, '') not in ('PST', 'CANC', 'ABD')), false) as terminada
    from public.lq_matches m where m.counts_for_scoring group by m.matchday
  )
  select p.user_id, m.matchday,
    sum(case
          when m.score_home = p.score_home and m.score_away = p.score_away then cfg.p_exact
          when sign(m.score_home - m.score_away) = sign(p.score_home - p.score_away) then cfg.p_result
          else 0 end)::int,
    (count(*) filter (where m.score_home = p.score_home and m.score_away = p.score_away))::int,
    (count(*) filter (where sign(m.score_home - m.score_away) = sign(p.score_home - p.score_away)))::int,
    count(*)::int,
    j.partidos, j.terminada
  from public.lq_predictions p
  join public.lq_matches m on m.id = p.match_id
  join jornadas j on j.matchday = m.matchday
  cross join cfg
  where m.counts_for_scoring and m.finished and m.score_home is not null and m.score_away is not null
    and p.user_id in (select lm.user_id from public.league_members lm where lm.league_id = p_league_id)
  group by p.user_id, m.matchday, j.partidos, j.terminada;
$$;
grant execute on function public.lq_jornadas_jugador(uuid) to anon, authenticated;
