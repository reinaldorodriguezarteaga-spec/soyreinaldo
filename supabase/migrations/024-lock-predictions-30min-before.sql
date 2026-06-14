-- =============================================================================
-- Bloquear predicciones de partidos 30 MINUTOS ANTES del kickoff
-- =============================================================================
-- Antes (migración 022): el cierre era kickoff - 1h.
-- Ahora: kickoff - 30min, para dar más margen a los usuarios sin renunciar a
-- evitar ajustes con la alineación ya conocida. Enforced a nivel RLS (no solo
-- UI). El front (partidos/page.tsx LOCK_LEAD_MS) usa el mismo umbral.
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
        and m.kickoff_at > now() + interval '30 minutes'
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
        and m.kickoff_at > now() + interval '30 minutes'
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
        and m.kickoff_at > now() + interval '30 minutes'
    )
  );
