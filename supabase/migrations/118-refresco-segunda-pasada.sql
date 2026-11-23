-- Segunda pasada del refresco tras partido (23-nov-2026).
-- La primera va ~40 min después del pitido y API-Football aún no ha sumado
-- el partido a las estadísticas de temporada de los jugadores (Fermín seguía
-- con 11 partidos y 7 goles tras marcar al Villarreal). La segunda, a partir
-- de 8 h del inicio, las vuelve a pedir ya cerradas.
alter table public.refrescos_post_partido
  add column if not exists segunda_at timestamptz;

-- Lo ya refrescado hace tiempo no necesita la segunda pasada.
update public.refrescos_post_partido
  set segunda_at = hecho_at
  where segunda_at is null and hecho_at < now() - interval '36 hours';
