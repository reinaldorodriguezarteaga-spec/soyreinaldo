-- =============================================================================
-- Función de scoring + leaderboard por liga
-- =============================================================================
-- Puntos por pronóstico:
--   resultado exacto       3
--   solo ganador / empate  1
--   fallo                  0
-- Puntos por picks especiales:
--   campeón                20
--   subcampeón              5
--   pichichi (nombre)      10
--   pichichi + goles       +5 extra
--   goleador en la final    8
--   total hat-tricks        5
-- Más los ajustes de puntos por liga (penalty/bonus).
-- =============================================================================

create extension if not exists unaccent;

-- Normaliza nombres para comparar (lowercase + sin acentos + sin espacios extra)
create or replace function public.norm_name(t text)
returns text
language sql
immutable
parallel safe
as $$
  select lower(trim(regexp_replace(unaccent(coalesce(t, '')), '\s+', ' ', 'g')));
$$;


-- Tabla con la leaderboard de una liga
create or replace function public.league_leaderboard(p_league_id uuid)
returns table (
  user_id uuid,
  display_name text,
  prediction_points int,
  picks_points int,
  adjustment_points int,
  total_points int,
  exact_count int,
  partial_count int,
  predictions_made int
)
language sql
stable
security definer
set search_path = public
as $$
  with league_users as (
    select lm.user_id
    from public.league_members lm
    where lm.league_id = p_league_id
  ),
  prediction_scores as (
    select
      p.user_id,
      sum(
        case
          when m.finished
            and m.score_home = p.score_home
            and m.score_away = p.score_away then 3
          when m.finished
            and sign(m.score_home - m.score_away) = sign(p.score_home - p.score_away)
            then 1
          else 0
        end
      ) as pred_points,
      count(*) filter (
        where m.finished
          and m.score_home = p.score_home
          and m.score_away = p.score_away
      ) as exacts,
      count(*) filter (
        where m.finished
          and not (
            m.score_home = p.score_home and m.score_away = p.score_away
          )
          and sign(m.score_home - m.score_away) = sign(p.score_home - p.score_away)
      ) as partials,
      count(*) as predictions_total
    from public.predictions p
    join public.matches m on m.id = p.match_id
    where p.user_id in (select user_id from league_users)
    group by p.user_id
  ),
  pick_scores as (
    select
      up.user_id,
      (case when up.champion_team is not null
              and up.champion_team = tr.champion_team then 20 else 0 end)
      + (case when up.runner_up_team is not null
                and up.runner_up_team = tr.runner_up_team then 5 else 0 end)
      + (case when up.pichichi_name is not null
                and tr.pichichi_name is not null
                and public.norm_name(up.pichichi_name)
                  = public.norm_name(tr.pichichi_name) then 10 else 0 end)
      + (case when up.pichichi_name is not null
                and tr.pichichi_name is not null
                and public.norm_name(up.pichichi_name)
                  = public.norm_name(tr.pichichi_name)
                and up.pichichi_predicted_goals is not null
                and up.pichichi_predicted_goals = tr.pichichi_actual_goals
                then 5 else 0 end)
      + (case when up.final_scorer_name is not null
                and tr.final_scorer_names is not null
                and exists (
                  select 1 from unnest(tr.final_scorer_names) fsn
                  where public.norm_name(fsn)
                    = public.norm_name(up.final_scorer_name)
                ) then 8 else 0 end)
      + (case when up.hat_tricks_count is not null
                and tr.hat_tricks_count is not null
                and up.hat_tricks_count = tr.hat_tricks_count
                then 5 else 0 end)
      as pick_points
    from public.user_picks up
    cross join public.tournament_results tr
    where tr.id = 1 and up.user_id in (select user_id from league_users)
  ),
  adjustments as (
    select pa.user_id, coalesce(sum(pa.delta), 0)::int as adj_points
    from public.point_adjustments pa
    where pa.league_id = p_league_id
    group by pa.user_id
  )
  select
    lu.user_id,
    coalesce(prof.display_name, 'Sin nombre') as display_name,
    coalesce(ps.pred_points, 0)::int as prediction_points,
    coalesce(pks.pick_points, 0)::int as picks_points,
    coalesce(adj.adj_points, 0)::int as adjustment_points,
    (
      coalesce(ps.pred_points, 0) +
      coalesce(pks.pick_points, 0) +
      coalesce(adj.adj_points, 0)
    )::int as total_points,
    coalesce(ps.exacts, 0)::int as exact_count,
    coalesce(ps.partials, 0)::int as partial_count,
    coalesce(ps.predictions_total, 0)::int as predictions_made
  from league_users lu
  left join public.profiles prof on prof.id = lu.user_id
  left join prediction_scores ps on ps.user_id = lu.user_id
  left join pick_scores pks on pks.user_id = lu.user_id
  left join adjustments adj on adj.user_id = lu.user_id
  order by total_points desc, display_name asc;
$$;
