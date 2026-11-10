-- =============================================================================
-- Juego «Ahorcado» en el ranking de /juegos (10-nov-2026, pedido del dueño)
-- =============================================================================
-- Adivinar a un futbolista letra a letra sabiendo su liga. Su reto del día
-- suma puntos como los demás juegos: hay que admitir 'ahorcado' en `juego`.
--
-- Idempotente.
-- =============================================================================

alter table public.juego_resultados drop constraint if exists juego_resultados_juego_check;
alter table public.juego_resultados
  add constraint juego_resultados_juego_check
  check (juego in ('equipo', 'jugador', 'tikitaka', 'leyenda', 'masomenos', 'top10', 'ahorcado'));
