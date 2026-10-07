-- Quiniela: "lo que pronostica la comunidad" y control de resúmenes de jornada.

-- 1. Reparto de pronósticos de un partido (ficha del partido). La RLS de
--    lq_predictions oculta los pronósticos ajenos hasta el pitido inicial para
--    que nadie copie: esta función solo devuelve TOTALES, y el marcador más
--    repetido únicamente cuando el partido ya ha empezado. Pública a propósito
--    (anon incluido): es contenido de la ficha y no expone a nadie.
create or replace function public.lq_pronostico_comunidad(p_match_id int)
  returns table(total int, local int, empate int, visitante int, marcador text, marcador_n int)
  language sql stable security definer set search_path to 'public'
as $$
  with p as (
    select score_home, score_away from public.lq_predictions where match_id = p_match_id
  ),
  empezado as (
    select coalesce((select kickoff_at <= now() from public.lq_matches where id = p_match_id), false) as si
  ),
  top as (
    select score_home || '-' || score_away as m, count(*)::int as n
    from p group by score_home, score_away
    order by count(*) desc, score_home + score_away, score_home desc
    limit 1
  )
  select
    (select count(*) from p)::int,
    (select count(*) from p where score_home > score_away)::int,
    (select count(*) from p where score_home = score_away)::int,
    (select count(*) from p where score_home < score_away)::int,
    case when (select si from empezado) then (select m from top) end,
    case when (select si from empezado) then (select n from top) end;
$$;
grant execute on function public.lq_pronostico_comunidad(int) to anon, authenticated;

-- 2. Resúmenes de jornada ya enviados (cron recordatorio-quiniela): uno por
--    jornada, aunque el cron corra varias veces. Solo servidor.
create table if not exists public.lq_resumenes_enviados (
  competition text not null,
  season int not null,
  matchday smallint not null,
  enviado_at timestamptz not null default now(),
  primary key (competition, season, matchday)
);
alter table public.lq_resumenes_enviados enable row level security;
