-- Quiniela de CLUBES (LaLiga ahora, Champions después), paralela a la del
-- Mundial (que queda intacta). Ya aplicada en la BD el 2026-08-03 vía MCP;
-- este archivo la versiona. La liga pública "Quiniela LaLiga 2026-27"
-- (código LALIGA2627, is_public=true, kind='clubs') se creó con un insert
-- aparte, y los fixtures se siembran con scripts/seed-liga-quiniela.mjs.

-- 1) Marca de tipo en la tabla compartida `leagues`.
alter table public.leagues
  add column if not exists kind text not null default 'mundial';
alter table public.leagues drop constraint if exists leagues_kind_check;
alter table public.leagues add constraint leagues_kind_check check (kind in ('mundial','clubs'));

-- 2) Clubes (id de API-Football, escudo por URL).
create table if not exists public.lq_teams (
  id   int primary key,
  name text not null,
  logo text
);
alter table public.lq_teams enable row level security;
drop policy if exists lq_teams_read on public.lq_teams;
create policy lq_teams_read on public.lq_teams for select using (true);

-- 3) Partidos de la quiniela de clubes.
create table if not exists public.lq_matches (
  id             int primary key,          -- fixture id de API-Football
  competition    text not null,            -- 'laliga' | 'champions' | ...
  season         int  not null,
  matchday       smallint,                 -- jornada (null en rondas KO)
  round          text,                     -- string crudo de la API
  team_home      int not null references public.lq_teams(id),
  team_away      int not null references public.lq_teams(id),
  kickoff_at     timestamptz not null,
  score_home     smallint,
  score_away     smallint,
  status         text,
  live_minute    smallint,
  finished       boolean not null default false,
  last_polled_at timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists lq_matches_comp_season_md_idx on public.lq_matches (competition, season, matchday);
create index if not exists lq_matches_kickoff_idx on public.lq_matches (kickoff_at);
create index if not exists lq_matches_finished_idx on public.lq_matches (finished);
alter table public.lq_matches enable row level security;
drop policy if exists lq_matches_read on public.lq_matches;
create policy lq_matches_read on public.lq_matches for select using (true);

-- 4) Predicciones (marcador exacto) con candado de 30 min por RLS.
create table if not exists public.lq_predictions (
  user_id    uuid not null references auth.users(id) on delete cascade,
  match_id   int  not null references public.lq_matches(id) on delete cascade,
  score_home smallint not null check (score_home >= 0),
  score_away smallint not null check (score_away >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, match_id)
);
alter table public.lq_predictions enable row level security;

drop policy if exists lq_pred_insert_before_kickoff on public.lq_predictions;
create policy lq_pred_insert_before_kickoff on public.lq_predictions
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.lq_matches m
                where m.id = match_id and m.kickoff_at > now() + interval '30 minutes')
  );

drop policy if exists lq_pred_update_before_kickoff on public.lq_predictions;
create policy lq_pred_update_before_kickoff on public.lq_predictions
  for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.lq_matches m
                where m.id = match_id and m.kickoff_at > now() + interval '30 minutes')
  );

drop policy if exists lq_pred_delete_before_kickoff on public.lq_predictions;
create policy lq_pred_delete_before_kickoff on public.lq_predictions
  for delete to authenticated
  using (
    user_id = auth.uid()
    and exists (select 1 from public.lq_matches m
                where m.id = match_id and m.kickoff_at > now() + interval '30 minutes')
  );

drop policy if exists lq_pred_select_visible on public.lq_predictions;
create policy lq_pred_select_visible on public.lq_predictions
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin()
    or ( exists (select 1 from public.lq_matches m
                 where m.id = match_id and m.kickoff_at <= now())
         and public.shares_league_with(user_id) )
  );

-- 5) touch updated_at.
create or replace function public.lq_touch_updated_at() returns trigger
  language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists lq_matches_touch on public.lq_matches;
create trigger lq_matches_touch before update on public.lq_matches
  for each row execute function public.lq_touch_updated_at();
drop trigger if exists lq_predictions_touch on public.lq_predictions;
create trigger lq_predictions_touch before update on public.lq_predictions
  for each row execute function public.lq_touch_updated_at();

-- 6) Ranking de liga de clubes (scoring 3 exacto / 1 resultado; sin picks especiales todavía).
create or replace function public.lq_leaderboard(p_league_id uuid)
  returns table(user_id uuid, display_name text, prediction_points int,
                adjustment_points int, total_points int,
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
  adjustments as (
    select pa.user_id, coalesce(sum(pa.delta),0)::int as adj_points
    from public.point_adjustments pa
    where pa.league_id = p_league_id
    group by pa.user_id
  )
  select lu.user_id,
    coalesce(prof.display_name,'Sin nombre') as display_name,
    coalesce(ps.pred_points,0)::int as prediction_points,
    coalesce(adj.adj_points,0)::int as adjustment_points,
    (coalesce(ps.pred_points,0)+coalesce(adj.adj_points,0))::int as total_points,
    coalesce(ps.exacts,0)::int as exact_count,
    coalesce(ps.partials,0)::int as partial_count,
    coalesce(ps.predictions_total,0)::int as predictions_made
  from league_users lu
  left join public.profiles prof on prof.id = lu.user_id
  left join prediction_scores ps on ps.user_id = lu.user_id
  left join adjustments adj on adj.user_id = lu.user_id
  order by total_points desc, display_name asc;
$$;

-- 7) Unión sin fricción a ligas públicas (un toque, sin código).
create or replace function public.join_public_league(p_league_id uuid)
  returns public.league_members language plpgsql as $$
declare v_member public.league_members;
begin
  if auth.uid() is null then
    raise exception 'Tienes que iniciar sesión para entrar a una liga';
  end if;
  if not exists (select 1 from public.leagues where id = p_league_id and is_public) then
    raise exception 'Esa liga no es pública' using errcode = 'P0002';
  end if;
  insert into public.league_members (league_id, user_id)
  values (p_league_id, auth.uid())
  on conflict do nothing
  returning * into v_member;
  if v_member is null then
    select * into v_member from public.league_members
    where league_id = p_league_id and user_id = auth.uid();
  end if;
  return v_member;
end $$;
