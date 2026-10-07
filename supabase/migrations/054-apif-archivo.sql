-- Archivo permanente de respuestas de API-Football (7-oct-2026).
--
-- Con la cuota del día agotada, la web se quedaba sin NADA: tablas vacías,
-- fichas en blanco. Aquí se guarda, por URL exacta de la API:
--  * para siempre (final = true) lo que ya no puede cambiar: un partido
--    terminado hace más de 6 h (ficha, eventos, alineaciones, estadísticas,
--    notas) y cualquier dato de una temporada ya cerrada. Esas URLs dejan de
--    pedirse a la API: sale de aquí.
--  * la última respuesta buena (final = false) del resto (estadísticas de la
--    temporada en curso, palmarés, plantillas…), que solo se usa si la API
--    falla o hay que ahorrar cuota.
-- Lo EN DIRECTO (partidos en juego, ventanas del día) no entra nunca.
--
-- Solo lo toca el servidor con la service role: RLS activa y sin políticas.
create table if not exists public.apif_archivo (
  url text primary key,
  respuesta jsonb not null,
  final boolean not null default false,
  actualizado timestamptz not null default now()
);

alter table public.apif_archivo enable row level security;
