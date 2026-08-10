-- RPC para la ingesta en vivo de la quiniela de clubes. Devuelve los partidos
-- de lq_matches a refrescar en cada tick (ya empezados o a punto, sin cerrar,
-- dentro de una ventana para no colgarse con partidos viejos). El id de
-- lq_matches ES el fixture id de API-Football, así que no hace falta backfill.
-- Ya aplicada en la BD el 2026-08-03 vía MCP; este archivo la versiona.
-- La consume /api/sports/ingest (mismo cron por minuto que el Mundial).
create or replace function public.lq_matches_pending_ingest()
  returns table(id int)
  language sql
  stable
  security definer
  set search_path to 'public'
as $$
  select m.id
  from public.lq_matches m
  where m.finished = false
    and m.kickoff_at <= now() + interval '5 minutes'
    and m.kickoff_at >= now() - interval '4 hours'
  order by m.kickoff_at
  limit 60;
$$;
