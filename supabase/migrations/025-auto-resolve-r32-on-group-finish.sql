-- =============================================================================
-- Auto-resolver dieciseisavos (R32) al cerrarse partidos de la fase de grupos
-- =============================================================================
-- Hasta ahora resolve_r32() solo se ejecutaba a mano (botón de admin "Resolver
-- bracket"). Esto añade un trigger que la llama SOLA cada vez que un partido de
-- fase de grupos pasa a finalizado: en cuanto un grupo queda matemáticamente
-- decidido, sus 1º/2º (placeholders directos tipo "1A"/"2B") se rellenan en los
-- cruces de R32 sin intervención.
--
-- OJO — lo que ESTO NO hace (sigue siendo manual, a propósito):
--   * Los "mejores terceros" (placeholders compuestos "3A/B/C/D/F", etc.) NO se
--     resuelven aquí: requieren los 12 grupos cerrados + la tabla de
--     combinaciones FIFA, que se asigna desde /admin/bracket-manual.
--   * La propagación KO->KO (ganador del R32 al octavo, etc.) ya la hace el
--     trigger trg_propagate_ko_result (migración 007).
--
-- Sin recursión: resolve_r32() solo hace UPDATE de team_home/team_away; este
-- trigger se dispara únicamente con UPDATE OF finished/score_home/score_away, así
-- que rellenar equipos no vuelve a dispararlo (ni a trg_propagate_ko_result).
-- =============================================================================

create or replace function public.auto_resolve_r32_after_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Solo nos interesa cuando se CIERRA un partido de fase de grupos.
  if NEW.finished is true
     and NEW.phase in ('group_md1', 'group_md2', 'group_md3') then
    perform public.resolve_r32();
  end if;
  return null;  -- AFTER trigger: el valor de retorno se ignora
end;
$$;

drop trigger if exists trg_auto_resolve_r32 on public.matches;
create trigger trg_auto_resolve_r32
  after update of finished, score_home, score_away on public.matches
  for each row
  when (
    NEW.finished is true
    and NEW.phase in ('group_md1', 'group_md2', 'group_md3')
  )
  execute function public.auto_resolve_r32_after_group();
