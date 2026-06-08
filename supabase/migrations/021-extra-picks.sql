-- =============================================================================
-- Nuevos picks especiales + recuperar "equipo más goleador" + picks_made
-- =============================================================================
-- Picks nuevos (jugadores → texto, comparados sin acentos/mayúsculas; equipos
-- y puesto → código FIFA, comparación exacta):
--   balon_oro            (mejor jugador)        10 pts
--   top_scoring_team     (equipo más goleador)  10 pts  [columna ya existía]
--   guante_oro           (mejor portero)         7 pts
--   jugador_revelacion   (joven revelación)      7 pts
--   tercer_lugar         (3er puesto, equipo)    7 pts
--   max_asistidor        (máximo asistente)      5 pts
-- =============================================================================

alter table public.user_picks
  add column if not exists balon_oro text,
  add column if not exists guante_oro text,
  add column if not exists jugador_revelacion text,
  add column if not exists tercer_lugar text references public.teams(id) on delete set null,
  add column if not exists max_asistidor text;

alter table public.tournament_results
  add column if not exists balon_oro text,
  add column if not exists guante_oro text,
  add column if not exists jugador_revelacion text,
  add column if not exists tercer_lugar text references public.teams(id) on delete set null,
  add column if not exists max_asistidor text;

-- Leaderboard con todo el scoring + picks_made (nº de picks especiales hechos)
drop function if exists public.league_leaderboard(uuid);
create function public.league_leaderboard(p_league_id uuid)
returns table (
  user_id uuid,
  display_name text,
  prediction_points int,
  picks_points int,
  adjustment_points int,
  total_points int,
  exact_count int,
  partial_count int,
  predictions_made int,
  picks_made int
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
          and not (m.score_home = p.score_home and m.score_away = p.score_away)
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
      -- conteo de picks hechos (para mostrar quién los completó)
      (
        (up.champion_team is not null)::int
        + (up.runner_up_team is not null)::int
        + (up.tercer_lugar is not null)::int
        + (up.top_scoring_team is not null)::int
        + (nullif(trim(up.pichichi_name), '') is not null)::int
        + (nullif(trim(up.final_scorer_name), '') is not null)::int
        + (nullif(trim(up.balon_oro), '') is not null)::int
        + (nullif(trim(up.guante_oro), '') is not null)::int
        + (nullif(trim(up.jugador_revelacion), '') is not null)::int
        + (nullif(trim(up.max_asistidor), '') is not null)::int
      ) as picks_done,
      (case when up.champion_team is not null
              and up.champion_team = tr.champion_team then 20 else 0 end)
      + (case when up.runner_up_team is not null
                and up.runner_up_team = tr.runner_up_team then 5 else 0 end)
      + (case when up.tercer_lugar is not null
                and up.tercer_lugar = tr.tercer_lugar then 7 else 0 end)
      + (case when up.top_scoring_team is not null
                and up.top_scoring_team = tr.top_scoring_team then 10 else 0 end)
      + (case when up.pichichi_name is not null
                and tr.pichichi_name is not null
                and public.norm_name(up.pichichi_name) = public.norm_name(tr.pichichi_name)
                then 10 else 0 end)
      + (case when up.pichichi_name is not null
                and tr.pichichi_name is not null
                and public.norm_name(up.pichichi_name) = public.norm_name(tr.pichichi_name)
                and up.pichichi_predicted_goals is not null
                and up.pichichi_predicted_goals = tr.pichichi_actual_goals
                then 5 else 0 end)
      + (case when up.final_scorer_name is not null
                and tr.final_scorer_names is not null
                and exists (
                  select 1 from unnest(tr.final_scorer_names) fsn
                  where public.norm_name(fsn) = public.norm_name(up.final_scorer_name)
                ) then 8 else 0 end)
      + (case when nullif(trim(up.balon_oro),'') is not null
                and tr.balon_oro is not null
                and public.norm_name(up.balon_oro) = public.norm_name(tr.balon_oro)
                then 10 else 0 end)
      + (case when nullif(trim(up.guante_oro),'') is not null
                and tr.guante_oro is not null
                and public.norm_name(up.guante_oro) = public.norm_name(tr.guante_oro)
                then 7 else 0 end)
      + (case when nullif(trim(up.jugador_revelacion),'') is not null
                and tr.jugador_revelacion is not null
                and public.norm_name(up.jugador_revelacion) = public.norm_name(tr.jugador_revelacion)
                then 7 else 0 end)
      + (case when nullif(trim(up.max_asistidor),'') is not null
                and tr.max_asistidor is not null
                and public.norm_name(up.max_asistidor) = public.norm_name(tr.max_asistidor)
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
    (coalesce(ps.pred_points,0) + coalesce(pks.pick_points,0) + coalesce(adj.adj_points,0))::int as total_points,
    coalesce(ps.exacts, 0)::int as exact_count,
    coalesce(ps.partials, 0)::int as partial_count,
    coalesce(ps.predictions_total, 0)::int as predictions_made,
    coalesce(pks.picks_done, 0)::int as picks_made
  from league_users lu
  left join public.profiles prof on prof.id = lu.user_id
  left join prediction_scores ps on ps.user_id = lu.user_id
  left join pick_scores pks on pks.user_id = lu.user_id
  left join adjustments adj on adj.user_id = lu.user_id
  order by total_points desc, display_name asc;
$$;
