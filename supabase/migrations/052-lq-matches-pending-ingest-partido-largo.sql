-- lq_matches_pending_ingest() dejaba de considerar "pendiente" un partido a
-- las 4h de su kickoff_at, aunque siguiera en juego de verdad — pasó el
-- 16-sep con Barcelona-Racing Santander (kickoff 21:30, aún en el minuto 65
-- a la 01:29 del día siguiente): la ingesta dejó de pedirlo justo en ese
-- borde, se quedó marcado como "en juego, minuto 65" en `lq_matches` para
-- siempre porque `finished` nunca llegó a ponerse a true, y la ventana por
-- `kickoff_at` no vuelve a incluirlo nunca (no depende de si sigue en vivo).
--
-- Fix: además de la ventana por horario (para partidos que van a empezar o
-- ya deberían haber acabado hace poco), se sigue pidiendo cualquier partido
-- cuyo ÚLTIMO estado conocido sea "en juego" — así uno que se alargue de
-- verdad no se cae de la ingesta hasta que la API confirme que terminó. Tope
-- de 12h desde el kickoff para no pedir para siempre un partido con un
-- estado corrupto que nunca llegue a FT.
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
    and m.kickoff_at >= now() - interval '12 hours'
    and (
      (m.kickoff_at <= now() + interval '5 minutes'
       and m.kickoff_at >= now() - interval '4 hours')
      or m.status in ('1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE')
    )
  order by m.kickoff_at
  limit 60;
$$;
