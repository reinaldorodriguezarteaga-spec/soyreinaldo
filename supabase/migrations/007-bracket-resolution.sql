-- =============================================================================
-- Bracket auto-resolution
-- =============================================================================
-- 1) group_standings(letter): tabla con la clasificación de un grupo
-- 2) resolve_direct_placeholder('1A','2B',...): devuelve el team_id
-- 3) resolve_r32(): rellena team_home/team_away en los R32 que tengan
--    placeholders directos. Devuelve cuántos slots resolvió.
-- 4) Trigger propagate_ko_result: cuando un KO se finaliza con un ganador
--    claro, rellena W{id} y L{id} en partidos posteriores.
-- =============================================================================

-- Clasificación de un grupo (cualquiera, A..L). Si los partidos aún no se han
-- jugado todos, devuelve los datos con lo que haya, pero el rank ya cuenta.
create or replace function public.group_standings(p_group_letter text)
returns table (
  team_id text,
  team_name text,
  flag text,
  played int,
  won int,
  drawn int,
  lost int,
  goals_for int,
  goals_against int,
  goal_diff int,
  points int,
  rank int
)
language sql
stable
as $$
  with team_matches as (
    select
      m.team_home as t_id,
      m.score_home as gf,
      m.score_away as ga,
      case
        when m.score_home > m.score_away then 3
        when m.score_home = m.score_away then 1
        else 0
      end as pts,
      (m.score_home > m.score_away)::int as w,
      (m.score_home = m.score_away)::int as d,
      (m.score_home < m.score_away)::int as l
    from public.matches m
    where m.group_letter = p_group_letter
      and m.finished and m.score_home is not null and m.score_away is not null
    union all
    select
      m.team_away,
      m.score_away,
      m.score_home,
      case
        when m.score_away > m.score_home then 3
        when m.score_away = m.score_home then 1
        else 0
      end,
      (m.score_away > m.score_home)::int,
      (m.score_away = m.score_home)::int,
      (m.score_away < m.score_home)::int
    from public.matches m
    where m.group_letter = p_group_letter
      and m.finished and m.score_home is not null and m.score_away is not null
  ),
  agg as (
    select
      tm.t_id,
      count(*)::int as played,
      sum(tm.w)::int as won,
      sum(tm.d)::int as drawn,
      sum(tm.l)::int as lost,
      sum(tm.gf)::int as gf,
      sum(tm.ga)::int as ga,
      sum(tm.pts)::int as pts
    from team_matches tm
    group by tm.t_id
  ),
  team_list as (
    select t.id, t.name, t.flag_emoji
    from public.teams t
    where t.group_letter = p_group_letter
  )
  select
    tl.id,
    tl.name,
    tl.flag_emoji,
    coalesce(a.played, 0),
    coalesce(a.won, 0),
    coalesce(a.drawn, 0),
    coalesce(a.lost, 0),
    coalesce(a.gf, 0),
    coalesce(a.ga, 0),
    coalesce(a.gf - a.ga, 0),
    coalesce(a.pts, 0),
    row_number() over (
      order by
        coalesce(a.pts, 0) desc,
        coalesce(a.gf - a.ga, 0) desc,
        coalesce(a.gf, 0) desc,
        tl.name asc
    )::int as rank
  from team_list tl
  left join agg a on a.t_id = tl.id;
$$;


-- Resuelve un placeholder directo "1A".."3L" al team_id correspondiente.
-- Si el formato no es directo (p.ej. "3A/B/C/D/F", "W74"), devuelve null.
create or replace function public.resolve_direct_placeholder(p_placeholder text)
returns text
language plpgsql
stable
as $$
declare
  v_pos int;
  v_group text;
  v_team text;
begin
  if p_placeholder !~ '^[1-3][A-L]$' then
    return null;
  end if;
  v_pos := substring(p_placeholder from 1 for 1)::int;
  v_group := substring(p_placeholder from 2 for 1);

  select s.team_id into v_team
  from public.group_standings(v_group) s
  where s.rank = v_pos;

  return v_team;
end;
$$;


-- Recorre los partidos R32 con team_home / team_away nulos y rellena los que
-- pueda con placeholder directo. Devuelve cuántas asignaciones hizo.
create or replace function public.resolve_r32()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  m record;
  v_team text;
  v_count int := 0;
begin
  for m in
    select id, team_home, team_away,
           team_home_placeholder, team_away_placeholder
    from public.matches
    where phase = 'r32'
  loop
    if m.team_home is null and m.team_home_placeholder is not null then
      v_team := public.resolve_direct_placeholder(m.team_home_placeholder);
      if v_team is not null then
        update public.matches set team_home = v_team where id = m.id;
        v_count := v_count + 1;
      end if;
    end if;

    if m.team_away is null and m.team_away_placeholder is not null then
      v_team := public.resolve_direct_placeholder(m.team_away_placeholder);
      if v_team is not null then
        update public.matches set team_away = v_team where id = m.id;
        v_count := v_count + 1;
      end if;
    end if;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.resolve_r32() from public;
grant execute on function public.resolve_r32() to authenticated;


-- Trigger: cuando un partido pasa a finalizado con un resultado claro,
-- propaga el ganador (W{id}) y el perdedor (L{id}) a los partidos posteriores.
create or replace function public.propagate_ko_result()
returns trigger
language plpgsql
as $$
declare
  v_winner text;
  v_loser text;
  v_id_str text;
begin
  if NEW.finished is not true then
    return NEW;
  end if;
  if NEW.score_home is null or NEW.score_away is null then
    return NEW;
  end if;
  if NEW.team_home is null or NEW.team_away is null then
    return NEW;
  end if;

  if NEW.score_home > NEW.score_away then
    v_winner := NEW.team_home;
    v_loser := NEW.team_away;
  elsif NEW.score_away > NEW.score_home then
    v_winner := NEW.team_away;
    v_loser := NEW.team_home;
  else
    -- Empate en KO: el admin debe definir manualmente el ganador
    -- (penaltis no se modelan en score_home/away). No propagamos.
    return NEW;
  end if;

  v_id_str := NEW.id::text;

  update public.matches
  set team_home = v_winner
  where team_home is null and team_home_placeholder = 'W' || v_id_str;

  update public.matches
  set team_away = v_winner
  where team_away is null and team_away_placeholder = 'W' || v_id_str;

  update public.matches
  set team_home = v_loser
  where team_home is null and team_home_placeholder = 'L' || v_id_str;

  update public.matches
  set team_away = v_loser
  where team_away is null and team_away_placeholder = 'L' || v_id_str;

  return NEW;
end;
$$;

drop trigger if exists trg_propagate_ko_result on public.matches;
create trigger trg_propagate_ko_result
  after update of finished, score_home, score_away on public.matches
  for each row
  execute function public.propagate_ko_result();
