-- Selecciones especiales de temporada de la quiniela de clubes: campeón (15),
-- pichichi (10) y 3 descendidos (5 c/u). Editables hasta el arranque de LaLiga;
-- luego se bloquean por RLS. Ya aplicada en la BD el 2026-08-03 vía MCP.

create table if not exists public.lq_season_picks (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  competition     text not null default 'laliga',
  season          int  not null default 2026,
  champion_team   int references public.lq_teams(id),
  pichichi_name   text,
  relegated_teams int[] not null default '{}',
  updated_at      timestamptz not null default now()
);
alter table public.lq_season_picks enable row level security;

create table if not exists public.lq_season_results (
  id              smallint primary key default 1 check (id = 1),
  champion_team   int references public.lq_teams(id),
  pichichi_name   text,
  relegated_teams int[] not null default '{}'
);
alter table public.lq_season_results enable row level security;
insert into public.lq_season_results (id) values (1) on conflict do nothing;

create or replace function public.lq_season_started(p_comp text, p_season int)
  returns boolean language sql stable security definer set search_path to 'public'
as $$
  select exists (
    select 1 from public.lq_matches
    where competition = p_comp and season = p_season and kickoff_at <= now()
  );
$$;

drop policy if exists lq_picks_write_own on public.lq_season_picks;
create policy lq_picks_write_own on public.lq_season_picks
  for all to authenticated
  using (user_id = auth.uid() and not public.lq_season_started('laliga', 2026))
  with check (user_id = auth.uid() and not public.lq_season_started('laliga', 2026));

drop policy if exists lq_picks_select_visible on public.lq_season_picks;
create policy lq_picks_select_visible on public.lq_season_picks
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin()
    or (public.lq_season_started('laliga', 2026) and public.shares_league_with(user_id))
  );

drop policy if exists lq_results_read on public.lq_season_results;
create policy lq_results_read on public.lq_season_results for select using (true);
drop policy if exists lq_results_admin_write on public.lq_season_results;
create policy lq_results_admin_write on public.lq_season_results
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop trigger if exists lq_season_picks_touch on public.lq_season_picks;
create trigger lq_season_picks_touch before update on public.lq_season_picks
  for each row execute function public.lq_touch_updated_at();

-- lq_leaderboard: se recrea con picks_points (cambia la firma → DROP antes).
drop function if exists public.lq_leaderboard(uuid);
create function public.lq_leaderboard(p_league_id uuid)
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
  adjustments as (
    select pa.user_id, coalesce(sum(pa.delta),0)::int as adj_points
    from public.point_adjustments pa
    where pa.league_id = p_league_id
    group by pa.user_id
  )
  select lu.user_id,
    coalesce(prof.display_name,'Sin nombre') as display_name,
    coalesce(ps.pred_points,0)::int as prediction_points,
    coalesce(pk.pick_points,0)::int as picks_points,
    coalesce(adj.adj_points,0)::int as adjustment_points,
    (coalesce(ps.pred_points,0)+coalesce(pk.pick_points,0)+coalesce(adj.adj_points,0))::int as total_points,
    coalesce(ps.exacts,0)::int as exact_count,
    coalesce(ps.partials,0)::int as partial_count,
    coalesce(ps.predictions_total,0)::int as predictions_made
  from league_users lu
  left join public.profiles prof on prof.id = lu.user_id
  left join prediction_scores ps on ps.user_id = lu.user_id
  left join pick_scores pk on pk.user_id = lu.user_id
  left join adjustments adj on adj.user_id = lu.user_id
  order by total_points desc, display_name asc;
$$;
