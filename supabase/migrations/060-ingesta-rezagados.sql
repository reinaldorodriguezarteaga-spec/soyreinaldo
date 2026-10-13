-- 060 · La ingesta de la quiniela recupera los partidos que se le escapan
-- (13-oct-2026).
--
-- Hasta ahora un partido solo se seguía durante las 4 h siguientes a su
-- inicio. El 12-oct un robot agotó la cuota de API-Football justo en esas
-- horas y el Levante–Sevilla (3-3) se quedó "sin empezar" para siempre: la
-- jornada 8 de la quiniela no se cerraba. Ahora, pasadas esas 4 h, el partido
-- se sigue pidiendo cada 30 min hasta 48 h (en la misma llamada por lotes,
-- sin coste extra). Aplazados, suspendidos y cancelados no se piden: los
-- recoloca el cron de fechas.

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
    and coalesce(m.status, '') not in ('PST', 'ABD', 'CANC')
    and m.kickoff_at <= now() + interval '5 minutes'
    and (
      m.kickoff_at >= now() - interval '4 hours'
      or (
        m.kickoff_at >= now() - interval '48 hours'
        and (m.last_polled_at is null or m.last_polled_at < now() - interval '30 minutes')
      )
    )
  order by m.kickoff_at
  limit 60;
$$;
