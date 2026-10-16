-- "Mi equipo" (16-oct, pedido del dueño): de entre los equipos favoritos,
-- el principal. Lo pinta la tarjeta de la portada (próximo partido, último
-- resultado y puesto). La liga va aparte porque la clasificación se busca
-- por competición, y un equipo se elige desde su liga.

alter table public.profiles
  add column if not exists mi_equipo_id integer,
  add column if not exists mi_equipo_liga text;
