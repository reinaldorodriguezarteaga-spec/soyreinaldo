-- =============================================================================
-- Bloquear predicciones de partidos 1 HORA ANTES del kickoff
-- =============================================================================
-- Antes: se podía crear/editar/borrar la predicción hasta el kickoff (now()).
-- Ahora: el cierre es kickoff - 1h, para que nadie ajuste tras conocerse
-- alineaciones u otra info de última hora. Enforced a nivel RLS (no solo UI).
-- =============================================================================

drop policy if exists "predictions_write_own_before_kickoff" on public.predictions;
create policy "predictions_write_own_before_kickoff"
  on public.predictions for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.matches m
      where m.id = predictions.match_id
        and m.kickoff_at > now() + interval '1 hour'
    )
  );

drop policy if exists "predictions_update_own_before_kickoff" on public.predictions;
create policy "predictions_update_own_before_kickoff"
  on public.predictions for update
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.matches m
      where m.id = predictions.match_id
        and m.kickoff_at > now() + interval '1 hour'
    )
  );

drop policy if exists "predictions_delete_own_before_kickoff" on public.predictions;
create policy "predictions_delete_own_before_kickoff"
  on public.predictions for delete
  to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.matches m
      where m.id = predictions.match_id
        and m.kickoff_at > now() + interval '1 hour'
    )
  );
