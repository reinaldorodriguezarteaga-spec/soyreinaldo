-- El dueño pidió unificar el candado de TODOS los picks especiales: campeón,
-- pichichi y descensos (antes bloqueaban al arrancar la jornada 1, vía
-- lq_season_started) pasan a cerrar en el mismo momento que los picks de
-- mitad de temporada (migración 032) — al arrancar la JORNADA 6, no la 1.
-- Reactiva de paso los picks de los usuarios que ya habían quedado
-- bloqueados por el candado viejo (jornada 1, 15-ago) sin necesidad de
-- tocar ninguna fila — es solo una condición de RLS.

drop policy if exists lq_picks_write_own on public.lq_season_picks;
create policy lq_picks_write_own on public.lq_season_picks
  for all to authenticated
  using (user_id = auth.uid() and not public.lq_matchday_started('laliga', 2026, 6))
  with check (user_id = auth.uid() and not public.lq_matchday_started('laliga', 2026, 6));

drop policy if exists lq_picks_select_visible on public.lq_season_picks;
create policy lq_picks_select_visible on public.lq_season_picks
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin()
    or (public.lq_matchday_started('laliga', 2026, 6) and public.shares_league_with(user_id))
  );
