-- =============================================================================
-- Excepción puntual: el partido 103 (3er lugar, Francia-Inglaterra, 18-jul
-- 23:00 CEST) se bloquea AL EMPEZAR (kickoff), no 30 min antes como el resto.
-- Pedido del dueño solo para este partido concreto ("solo por hoy"). El resto
-- de partidos (incluida la final, 104) sigue con el margen de 30 min de la
-- migración 024. Si se necesitara repetir esto para otro partido puntual,
-- añadir su id al CASE en vez de tocar el margen general.
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
        and m.kickoff_at > now() + (case when m.id = 103 then interval '0 minutes' else interval '30 minutes' end)
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
        and m.kickoff_at > now() + (case when m.id = 103 then interval '0 minutes' else interval '30 minutes' end)
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
        and m.kickoff_at > now() + (case when m.id = 103 then interval '0 minutes' else interval '30 minutes' end)
    )
  );
