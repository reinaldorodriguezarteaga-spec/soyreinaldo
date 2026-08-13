-- Picks especiales "de mitad de temporada" de la quiniela de clubes: Zamora
-- (portero menos goleado), máximo asistidor, MVP de la liga, equipo menos
-- goleado y equipo más goleador. 10 pts cada acierto.
--
-- A diferencia de campeón/pichichi/descensos (lq_season_picks, cierran con
-- el arranque de la jornada 1 vía lq_season_started), estos se deciden mejor
-- tras ver algo de forma — quedan abiertos hasta el arranque de la
-- **jornada 6** (lq_matchday_started). Por eso viven en una tabla aparte:
-- así cada una tiene su propio candado de RLS sin pisar el de la otra.
--
-- El resultado final lo pone el admin al acabar la temporada, igual que
-- champion_team/pichichi_name/relegated_teams — por eso se amplía la misma
-- lq_season_results en vez de crear una tabla de resultados nueva.

alter table public.lq_season_results
  add column if not exists best_gk_name      text,
  add column if not exists best_assist_name  text,
  add column if not exists best_defense_team int references public.lq_teams(id),
  add column if not exists best_attack_team  int references public.lq_teams(id),
  add column if not exists mvp_name          text;

create table if not exists public.lq_midseason_picks (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  competition       text not null default 'laliga',
  season            int  not null default 2026,
  best_gk_name      text,
  best_assist_name  text,
  best_defense_team int references public.lq_teams(id),
  best_attack_team  int references public.lq_teams(id),
  mvp_name          text,
  updated_at        timestamptz not null default now()
);
alter table public.lq_midseason_picks enable row level security;

create or replace function public.lq_matchday_started(p_comp text, p_season int, p_matchday int)
  returns boolean language sql stable security definer set search_path to 'public'
as $$
  select exists (
    select 1 from public.lq_matches
    where competition = p_comp and season = p_season and matchday = p_matchday
      and kickoff_at <= now()
  );
$$;

drop policy if exists lq_midseason_picks_write_own on public.lq_midseason_picks;
create policy lq_midseason_picks_write_own on public.lq_midseason_picks
  for all to authenticated
  using (user_id = auth.uid() and not public.lq_matchday_started('laliga', 2026, 6))
  with check (user_id = auth.uid() and not public.lq_matchday_started('laliga', 2026, 6));

drop policy if exists lq_midseason_picks_select_visible on public.lq_midseason_picks;
create policy lq_midseason_picks_select_visible on public.lq_midseason_picks
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin()
    or (public.lq_matchday_started('laliga', 2026, 6) and public.shares_league_with(user_id))
  );

drop trigger if exists lq_midseason_picks_touch on public.lq_midseason_picks;
create trigger lq_midseason_picks_touch before update on public.lq_midseason_picks
  for each row execute function public.lq_touch_updated_at();

-- lq_leaderboard: mismo shape de retorno que antes (no hace falta DROP),
-- solo se suman los 5 picks nuevos (10 pts c/u) a picks_points/total_points.
create or replace function public.lq_leaderboard(p_league_id uuid)
  returns table(user_id uuid, display_name text, prediction_points int,
                picks_points int, adjustment_points int, total_points int,
                exact_count int, partial_count int, predictions_made int)
  language sql stable security definer set search_path to 'public'
as $$
  with league_users as (
    select lm.user_id from public.league_members lm where lm.league_id = p_league_id
  ),
  prediction_scores as (
    select p.user_id,
      sum(case
            when m.finished and m.score_home = p.score_home and m.score_away = p.score_away then 3
            when m.finished and sign(m.score_home - m.score_away) = sign(p.score_home - p.score_away) then 1
            else 0 end) as pred_points,
      count(*) filter (where m.finished and m.score_home = p.score_home and m.score_away = p.score_away) as exacts,
      count(*) filter (where m.finished and not (m.score_home = p.score_home and m.score_away = p.score_away)
                         and sign(m.score_home - m.score_away) = sign(p.score_home - p.score_away)) as partials,
      count(*) as predictions_total
    from public.lq_predictions p
    join public.lq_matches m on m.id = p.match_id
    where p.user_id in (select user_id from league_users)
    group by p.user_id
  ),
  pick_scores as (
    select sp.user_id,
      ((case when sp.champion_team is not null and sp.champion_team = r.champion_team then 15 else 0 end)
      + (case when nullif(trim(sp.pichichi_name),'') is not null and r.pichichi_name is not null
                and public.norm_name(sp.pichichi_name) = public.norm_name(r.pichichi_name) then 10 else 0 end)
      + (5 * coalesce((
          select count(*) from (
            select unnest(sp.relegated_teams) intersect select unnest(r.relegated_teams)
          ) x), 0)))::int as pick_points
    from public.lq_season_picks sp
    cross join public.lq_season_results r
    where r.id = 1 and sp.user_id in (select user_id from league_users)
  ),
  midseason_scores as (
    select mp.user_id,
      ((case when nullif(trim(mp.best_gk_name),'') is not null and r.best_gk_name is not null
                and public.norm_name(mp.best_gk_name) = public.norm_name(r.best_gk_name) then 10 else 0 end)
      + (case when nullif(trim(mp.best_assist_name),'') is not null and r.best_assist_name is not null
                and public.norm_name(mp.best_assist_name) = public.norm_name(r.best_assist_name) then 10 else 0 end)
      + (case when nullif(trim(mp.mvp_name),'') is not null and r.mvp_name is not null
                and public.norm_name(mp.mvp_name) = public.norm_name(r.mvp_name) then 10 else 0 end)
      + (case when mp.best_defense_team is not null and mp.best_defense_team = r.best_defense_team then 10 else 0 end)
      + (case when mp.best_attack_team is not null and mp.best_attack_team = r.best_attack_team then 10 else 0 end)
      )::int as midseason_points
    from public.lq_midseason_picks mp
    cross join public.lq_season_results r
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
