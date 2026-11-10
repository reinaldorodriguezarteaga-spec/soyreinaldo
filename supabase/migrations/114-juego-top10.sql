-- =============================================================================
-- Juego «Top 10» en el ranking de /juegos (10-nov-2026, pedido del dueño)
-- =============================================================================
-- Los 10 jugadores con más minutos, goles o asistencias de un gran equipo en
-- una temporada. Su reto del día suma puntos como los demás juegos: hay que
-- admitir 'top10' en la columna `juego`.
--
-- Idempotente.
-- =============================================================================

alter table public.juego_resultados drop constraint if exists juego_resultados_juego_check;
alter table public.juego_resultados
  add constraint juego_resultados_juego_check
  check (juego in ('equipo', 'jugador', 'tikitaka', 'leyenda', 'masomenos', 'top10'));
