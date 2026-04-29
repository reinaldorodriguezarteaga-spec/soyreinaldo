-- =============================================================================
-- Fix: resolve_direct_placeholder solo debe resolver si el grupo está completo
-- =============================================================================
-- Antes: si llamabas a resolve_r32() con un grupo sin jugar, devolvía el
-- equipo alfabéticamente primero (porque group_standings usa nombre como
-- último tiebreaker). Ahora exige que los 6 partidos del grupo estén
-- finalizados.
-- =============================================================================

create or replace function public.resolve_direct_placeholder(p_placeholder text)
returns text
language plpgsql
stable
as $$
declare
  v_pos int;
  v_group text;
  v_team text;
  v_finished int;
begin
  if p_placeholder !~ '^[1-3][A-L]$' then
    return null;
  end if;
  v_pos := substring(p_placeholder from 1 for 1)::int;
  v_group := substring(p_placeholder from 2 for 1);

  -- Solo resolver si los 6 partidos del grupo están finalizados.
  select count(*) filter (where finished) into v_finished
  from public.matches
  where group_letter = v_group;

  if v_finished < 6 then
    return null;
  end if;

  select s.team_id into v_team
  from public.group_standings(v_group) s
  where s.rank = v_pos;

  return v_team;
end;
$$;
