-- =============================================================================
-- Fix: usuarios nuevos no pueden unirse a una liga
-- =============================================================================
-- La policy "members_select_own_leagues" usaba `is_league_member(league_id)`,
-- una función SECURITY DEFINER STABLE que no ve la fila recién insertada en
-- la misma transacción. La RPC `join_league_by_code` hace
-- `INSERT ... RETURNING * INTO v_member`. El RETURNING dispara una SELECT que
-- pide a la policy permitir leer el row recién creado. Como is_league_member
-- aún devuelve FALSE para esa liga, la SELECT se rechaza y aborta el
-- INSERT entero con un genérico "new row violates row-level security policy".
--
-- Reinaldo nunca lo vio porque ya estaba en todas las ligas → la función
-- devolvía TRUE y la policy pasaba.
--
-- Fix: añadir un OR `user_id = auth.uid()` para que el usuario siempre pueda
-- ver SU PROPIA fila de membresía. Mantenemos `is_league_member` para que un
-- usuario también vea las filas de OTROS usuarios de las ligas a las que
-- pertenece (necesario para el ranking).
-- =============================================================================

drop policy if exists "members_select_own_leagues" on public.league_members;

create policy "members_select_own_leagues"
  on public.league_members for select
  to authenticated using (
    public.is_admin()
    or user_id = auth.uid()
    or public.is_league_member(league_id)
  );

-- Limpieza: borrar funciones de debug que añadí investigando el bug.
drop function if exists public.debug_uid();
drop function if exists public.debug_join_attempt();
drop function if exists public.debug_try_insert(uuid);
