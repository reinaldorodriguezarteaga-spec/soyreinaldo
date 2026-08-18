-- =============================================================================
-- Partidos que se ven pero no puntúan
-- =============================================================================
-- La jornada 1 de LaLiga 2026-27 se jugó antes de que la quiniela estuviera
-- en marcha y el dueño decidió que no contaba — pero los 10 jugadores ya
-- habían pronosticado (100 pronósticos) y los partidos se quedaron sin
-- marcador porque la ingesta estaba parada (ver migración 038).
--
-- Al rellenar esos resultados harían falta las dos cosas a la vez: que el
-- calendario los enseñe y que no den puntos. De ahí esta marca, que además
-- sirve para lo que venga (amistosos, jornadas anuladas, partidos de prueba).
-- =============================================================================

alter table public.lq_matches
  add column if not exists counts_for_scoring boolean not null default true;

comment on column public.lq_matches.counts_for_scoring is
  'false = el partido se ve con su marcador pero no suma en lq_leaderboard.';

update public.lq_matches
set counts_for_scoring = false
where competition = 'laliga' and season = 2026 and matchday = 1;

-- Misma función que en 037, con el filtro añadido en `prediction_scores`.
create or replace function public.lq_leaderboard(p_league_id uuid)
  returns table(user_id uuid, display_name text, prediction_points int,
                picks_points int, adjustment_points int, total_points int,
                exact_count int, partial_count int, predictions_made int)
  language sql stable security definer set search_path to 'public'
as $$
  with cfg as (
    select l.lq_points_exact     as p_exact,
           l.lq_points_result    as p_result,
           l.lq_points_champion  as p_champ,
           l.lq_points_pichichi  as p_pichi,
           l.lq_points_relegated as p_releg,
           l.lq_points_midseason as p_mid,
           l.lq_specials_enabled as specials
    from public.leagues l where l.id = p_league_id
  ),
  league_users as (
    select lm.user_id from public.league_members lm where lm.league_id = p_league_id
  ),
  prediction_scores as (
    select p.user_id,
      sum(case
            when m.finished and m.score_home = p.score_home and m.score_away = p.score_away then cfg.p_exact
            when m.finished and sign(m.score_home - m.score_away) = sign(p.score_home - p.score_away) then cfg.p_result
            else 0 end) as pred_points,
      count(*) filter (where m.finished and m.score_home = p.score_home and m.score_away = p.score_away) as exacts,
      count(*) filter (where m.finished and not (m.score_home = p.score_home and m.score_away = p.score_away)
                         and sign(m.score_home - m.score_away) = sign(p.score_home - p.score_away)) as partials,
      count(*) as predictions_total
    from public.lq_predictions p
    join public.lq_matches m on m.id = p.match_id
    cross join cfg
    where p.user_id in (select user_id from league_users)
      and m.counts_for_scoring          -- <- jornadas que no cuentan
    group by p.user_id
  ),
  pick_scores as (
    select sp.user_id,
      (case when not cfg.specials then 0 else
        (case when sp.champion_team is not null and sp.champion_team = r.champion_team then cfg.p_champ else 0 end)
      + (case when nullif(trim(sp.pichichi_name),'') is not null and r.pichichi_name is not null
                and public.norm_name(sp.pichichi_name) = public.norm_name(r.pichichi_name) then cfg.p_pichi else 0 end)
      + (cfg.p_releg * coalesce((
          select count(*) from (
            select unnest(sp.relegated_teams) intersect select unnest(r.relegated_teams)
          ) x), 0))
      end)::int as pick_points
    from public.lq_season_picks sp
    cross join public.lq_season_results r
    cross join cfg
    where r.id = 1 and sp.user_id in (select user_id from league_users)
  ),
  midseason_scores as (
    select mp.user_id,
      (case when not cfg.specials then 0 else
        (case when nullif(trim(mp.best_gk_name),'') is not null and r.best_gk_name is not null
                and public.norm_name(mp.best_gk_name) = public.norm_name(r.best_gk_name) then cfg.p_mid else 0 end)
      + (case when nullif(trim(mp.best_assist_name),'') is not null and r.best_assist_name is not null
                and public.norm_name(mp.best_assist_name) = public.norm_name(r.best_assist_name) then cfg.p_mid else 0 end)
      + (case when nullif(trim(mp.mvp_name),'') is not null and r.mvp_name is not null
                and public.norm_name(mp.mvp_name) = public.norm_name(r.mvp_name) then cfg.p_mid else 0 end)
      + (case when mp.best_defense_team is not null and mp.best_defense_team = r.best_defense_team then cfg.p_mid else 0 end)
      + (case when mp.best_attack_team is not null and mp.best_attack_team = r.best_attack_team then cfg.p_mid else 0 end)
      end)::int as midseason_points
    from public.lq_midseason_picks mp
    cross join public.lq_season_results r
    cross join cfg
    where r.id = 1 and mp.user_id in (select user_id from league_users)
  ),
  adjustments as (
    select pa.user_id, coalesce(sum(pa.delta),0)::int as adj_points
    from public.point_adjustments pa
    where pa.league_id = p_league_id
    group by pa.user_id
  )
  select lu.user_id,
    coalesce(prof.display_name,'Sin nombre') as display_name,
    coalesce(ps.pred_points,0)::int as prediction_points,
    (coalesce(pk.pick_points,0) + coalesce(ms.midseason_points,0))::int as picks_points,
    coalesce(adj.adj_points,0)::int as adjustment_points,
    (coalesce(ps.pred_points,0) + coalesce(pk.pick_points,0) + coalesce(ms.midseason_points,0)
      + coalesce(adj.adj_points,0))::int as total_points,
    coalesce(ps.exacts,0)::int as exact_count,
    coalesce(ps.partials,0)::int as partial_count,
    coalesce(ps.predictions_total,0)::int as predictions_made
  from league_users lu
  left join public.profiles prof on prof.id = lu.user_id
  left join prediction_scores ps on ps.user_id = lu.user_id
  left join pick_scores pk on pk.user_id = lu.user_id
  left join midseason_scores ms on ms.user_id = lu.user_id
  left join adjustments adj on adj.user_id = lu.user_id
  order by total_points desc, display_name asc;
$$;
