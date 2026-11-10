-- =============================================================================
-- Cinco juegos nuevos en el ranking de /juegos (10-nov-2026, pedido del dueño)
-- =============================================================================
-- Futbolista misterioso, Escudo borroso, Foto oculta, Agrupa los cuatro y
-- Cronología. Sus retos del día suman puntos como los demás.
--
-- Idempotente.
-- =============================================================================

alter table public.juego_resultados drop constraint if exists juego_resultados_juego_check;
alter table public.juego_resultados
  add constraint juego_resultados_juego_check
  check (juego in (
    'equipo', 'jugador', 'tikitaka', 'leyenda', 'masomenos', 'top10', 'ahorcado',
    'misterioso', 'escudo', 'foto', 'agrupa', 'cronologia'
  ));
