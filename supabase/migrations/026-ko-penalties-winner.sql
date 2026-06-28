-- =============================================================================
-- Eliminatorias decididas por PENALTIS: propagar el ganador automáticamente
-- =============================================================================
-- Hasta ahora propagate_ko_result() (migración 007) solo propagaba cuando había
-- ganador por goles; en un empate (KO a penaltis) se quedaba ciego y el admin
-- tenía que meter el ganador a mano. Pero API-Football SÍ da el resultado de la
-- tanda (score.penalty) y el ganador del fixture. Aquí:
--   1) Añadimos penalty_home / penalty_away a matches (los rellena la ingesta).
--   2) El trigger usa los penaltis como desempate cuando los goles están igualados.
--   3) El trigger también se dispara al actualizarse las columnas de penaltis,
--      por si la tanda llega en un tick posterior al del marcador.
-- =============================================================================

alter table public.matches
  add column if not exists penalty_home smallint,
  add column if not exists penalty_away smallint;

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
  elsif NEW.penalty_home is not null
        and NEW.penalty_away is not null
        and NEW.penalty_home <> NEW.penalty_away then
    -- Empate en los 90/120 min: lo decide la tanda de penaltis (API-Football).
    if NEW.penalty_home > NEW.penalty_away then
      v_winner := NEW.team_home;
      v_loser := NEW.team_away;
    else
      v_winner := NEW.team_away;
      v_loser := NEW.team_home;
    end if;
  else
    -- Empatado y sin tanda registrada todavía: no propagamos (llegará en el
    -- siguiente tick de ingesta con los penaltis, que re-dispara el trigger).
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

-- Recreamos el trigger añadiendo las columnas de penaltis a la lista de UPDATE OF,
-- para que una tanda que llegue en un tick posterior también dispare la propagación.
drop trigger if exists trg_propagate_ko_result on public.matches;
create trigger trg_propagate_ko_result
  after update of finished, score_home, score_away, penalty_home, penalty_away
  on public.matches
  for each row
  execute function public.propagate_ko_result();
