-- =============================================================================
-- Restringir visibilidad de predicciones y picks a miembros de ligas comunes
-- =============================================================================
-- Antes: cualquier usuario autenticado veía las predicciones del resto una vez
--        empezado el partido. Esto exponía picks de gente que no comparte
--        ninguna liga contigo.
--
-- Ahora: solo los miembros de tus ligas pueden ver tus picks/predicciones
--        (siempre que el partido haya empezado). Tú ves los tuyos siempre. El
--        admin ve todo.
-- =============================================================================

-- Función helper: ¿comparto alguna liga con este otro usuario?
create or replace function public.shares_league_with(p_other_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.league_members lm_viewer
    join public.league_members lm_other
      on lm_other.league_id = lm_viewer.league_id
    where lm_viewer.user_id = auth.uid()
      and lm_other.user_id = p_other_user
  );
$$;

-- PREDICTIONS: reemplazar la policy de SELECT
drop policy if exists "predictions_select_own_or_started" on public.predictions;
create policy "predictions_select_visible"
  on public.predictions for select
  to authenticated using (
    user_id = auth.uid()
    or public.is_admin()
    or (
      exists (
        select 1 from public.matches m
        where m.id = predictions.match_id and m.kickoff_at <= now()
      )
      and public.shares_league_with(predictions.user_id)
    )
  );

-- USER_PICKS: idem
drop policy if exists "picks_select_own_or_started" on public.user_picks;
create policy "picks_select_visible"
  on public.user_picks for select
  to authenticated using (
    user_id = auth.uid()
    or public.is_admin()
    or (public.tournament_started() and public.shares_league_with(user_id))
  );
