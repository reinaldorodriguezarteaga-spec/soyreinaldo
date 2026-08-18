-- =============================================================================
-- Cada pick especial, su propia puntuación
-- =============================================================================
-- `lq_points_midseason` era un solo número para CINCO premios distintos
-- (Zamora, máximo asistidor, MVP, equipo menos goleado, equipo más goleador):
-- en el panel salía una sola casilla, "cada pick de media temporada", y no
-- había forma de valorar unos más que otros. Se parten en cinco.
-- =============================================================================

alter table public.leagues
  add column if not exists lq_points_gk      smallint,
  add column if not exists lq_points_assist  smallint,
  add column if not exists lq_points_mvp     smallint,
  add column if not exists lq_points_defense smallint,
  add column if not exists lq_points_attack  smallint;

-- Arrancan con lo que valía el número único, así nadie nota el cambio.
update public.leagues
set lq_points_gk      = coalesce(lq_points_gk, lq_points_midseason),
    lq_points_assist  = coalesce(lq_points_assist, lq_points_midseason),
    lq_points_mvp     = coalesce(lq_points_mvp, lq_points_midseason),
    lq_points_defense = coalesce(lq_points_defense, lq_points_midseason),
    lq_points_attack  = coalesce(lq_points_attack, lq_points_midseason);

alter table public.leagues
  alter column lq_points_gk      set default 10,
  alter column lq_points_assist  set default 10,
  alter column lq_points_mvp     set default 10,
  alter column lq_points_defense set default 10,
  alter column lq_points_attack  set default 10;

alter table public.leagues
  alter column lq_points_gk      set not null,
  alter column lq_points_assist  set not null,
  alter column lq_points_mvp     set not null,
  alter column lq_points_defense set not null,
  alter column lq_points_attack  set not null;

alter table public.leagues drop column if exists lq_points_midseason;

alter table public.leagues drop constraint if exists leagues_lq_points_check;
alter table public.leagues add constraint leagues_lq_points_check check (
  lq_points_exact     between 0 and 100 and
  lq_points_result    between 0 and 100 and
  lq_points_champion  between 0 and 100 and
  lq_points_pichichi  between 0 and 100 and
  lq_points_relegated between 0 and 100 and
  lq_points_gk        between 0 and 100 and
  lq_points_assist    between 0 and 100 and
  lq_points_mvp       between 0 and 100 and
  lq_points_defense   between 0 and 100 and
  lq_points_attack    between 0 and 100
);

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
           l.lq_points_gk        as p_gk,
           l.lq_points_assist    as p_assist,
           l.lq_points_mvp       as p_mvp,
           l.lq_points_defense   as p_def,
           l.lq_points_attack    as p_att,
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
      and m.counts_for_scoring
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
                and public.norm_name(mp.best_gk_name) = public.norm_name(r.best_gk_name) then cfg.p_gk else 0 end)
      + (case when nullif(trim(mp.best_assist_name),'') is not null and r.best_assist_name is not null
                and public.norm_name(mp.best_assist_name) = public.norm_name(r.best_assist_name) then cfg.p_assist else 0 end)
      + (case when nullif(trim(mp.mvp_name),'') is not null and r.mvp_name is not null
                and public.norm_name(mp.mvp_name) = public.norm_name(r.mvp_name) then cfg.p_mvp else 0 end)
      + (case when mp.best_defense_team is not null and mp.best_defense_team = r.best_defense_team then cfg.p_def else 0 end)
      + (case when mp.best_attack_team is not null and mp.best_attack_team = r.best_attack_team then cfg.p_att else 0 end)
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

drop function if exists public.league_admin_update_rules(uuid, int, int, int, int, int, int, boolean);

create or replace function public.league_admin_update_rules(
  p_league_id uuid,
  p_exact     int,
  p_result    int,
  p_champion  int,
  p_pichichi  int,
  p_relegated int,
  p_gk        int,
  p_assist    int,
  p_mvp       int,
  p_defense   int,
  p_attack    int,
  p_specials  boolean
)
returns public.leagues
language plpgsql
security definer
set search_path = public
as $$
declare v_league public.leagues;
begin
  if not (public.is_admin() or public.is_league_admin(p_league_id)) then
    raise exception 'No mandas en esta liga' using errcode = '42501';
  end if;

  update public.leagues
  set lq_points_exact     = greatest(0, least(100, coalesce(p_exact, lq_points_exact))),
      lq_points_result    = greatest(0, least(100, coalesce(p_result, lq_points_result))),
      lq_points_champion  = greatest(0, least(100, coalesce(p_champion, lq_points_champion))),
      lq_points_pichichi  = greatest(0, least(100, coalesce(p_pichichi, lq_points_pichichi))),
      lq_points_relegated = greatest(0, least(100, coalesce(p_relegated, lq_points_relegated))),
      lq_points_gk        = greatest(0, least(100, coalesce(p_gk, lq_points_gk))),
      lq_points_assist    = greatest(0, least(100, coalesce(p_assist, lq_points_assist))),
      lq_points_mvp       = greatest(0, least(100, coalesce(p_mvp, lq_points_mvp))),
      lq_points_defense   = greatest(0, least(100, coalesce(p_defense, lq_points_defense))),
      lq_points_attack    = greatest(0, least(100, coalesce(p_attack, lq_points_attack))),
      lq_specials_enabled = coalesce(p_specials, lq_specials_enabled)
  where id = p_league_id
  returning * into v_league;

  if v_league is null then
    raise exception 'Liga no encontrada' using errcode = 'P0002';
  end if;
  return v_league;
end;
$$;

revoke all on function public.league_admin_update_rules(uuid, int, int, int, int, int, int, int, int, int, int, boolean) from public;
grant execute on function public.league_admin_update_rules(uuid, int, int, int, int, int, int, int, int, int, int, boolean) to authenticated;
