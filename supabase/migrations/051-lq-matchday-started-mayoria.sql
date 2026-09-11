-- Bug reportado por el dueño (8-sep-2026): los picks especiales de la
-- quiniela-liga (campeón/pichichi/descensos + los de mitad de temporada)
-- llevaban un rato bloqueados sin que la jornada 6 hubiera arrancado de
-- verdad. Causa: lq_matchday_started() (migraciones 032 y 038) consideraba
-- "arrancada" una jornada en cuanto CUALQUIER partido suyo tenía
-- kickoff_at <= now() — y LaLiga a veces adelanta UN partido suelto de la
-- jornada siguiente varios días antes del resto (aquí, Real Sociedad-Celta,
-- jornada 6, jugado el 3-sep mientras el resto de la jornada 6 es del
-- 15 al 17-sep) para liberar el fin de semana a un equipo con partido
-- europeo entre semana. Ese único partido adelantado bastaba para que la
-- función devolviera true y cerrara los picks de TODO el mundo diez días
-- antes de que la jornada 6 empezara de verdad.
--
-- Fix: exigir MAYORÍA de los partidos de esa jornada ya empezados, no solo
-- uno. Un partido suelto reprogramado ya no dispara el candado; la jornada
-- 6 real (el grueso del fin de semana del 15-17 sep) sí lo hará en cuanto
-- arranque. Solo tiene un punto de definición (esta función) — las
-- políticas de 032/038 y la RPC que llama picks/page.tsx no cambian, todas
-- la usan tal cual.
--
-- NOTA: esta migración ya estaba aplicada en producción desde el 8-sep
-- (CREATE OR REPLACE FUNCTION, sin downtime) — el bug bloqueaba usuarios
-- reales y no podía esperar al ciclo de PR. Este commit solo pone el
-- archivo en el historial del repo; no cambia nada en la base de datos.
create or replace function public.lq_matchday_started(p_comp text, p_season int, p_matchday int)
  returns boolean language sql stable security definer set search_path to 'public'
as $$
  select coalesce(
    count(*) filter (where kickoff_at <= now()) > count(*) / 2,
    false
  )
  from public.lq_matches
  where competition = p_comp and season = p_season and matchday = p_matchday;
$$;
