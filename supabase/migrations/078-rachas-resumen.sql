-- Rachas sin el tope de 1.000 filas (18-oct): `lq_historial_rachas` devolvía
-- una fila por pronóstico (1.163 en la liga pública a la jornada 9) y la API
-- de Supabase corta en 1.000, así que a algunos les faltaban las últimas
-- jornadas y su racha salía 0 (el dueño, con todas jugadas). Aquí, una fila
-- por jugador: las jornadas en que pronosticó algún partido ya empezado y la
-- secuencia de aciertos de los partidos terminados, en orden de hora.
create or replace function public.lq_rachas_resumen(p_league_id uuid)
returns table(user_id uuid, jornadas int[], aciertos boolean[])
language sql stable security definer set search_path = public as $$
  with h as (
    select p.user_id, m.id as match_id, m.matchday, m.kickoff_at, m.finished,
           (m.finished and m.score_home is not null and m.score_away is not null
            and sign(m.score_home - m.score_away) = sign(p.score_home - p.score_away)) as acierto
    from public.lq_predictions p
    join public.lq_matches m on m.id = p.match_id
    where m.counts_for_scoring
      and m.kickoff_at <= now()
      and p.user_id in (select lm.user_id from public.league_members lm where lm.league_id = p_league_id)
  )
  select h.user_id,
         array_agg(distinct h.matchday),
         coalesce(array_agg(h.acierto order by h.kickoff_at, h.match_id) filter (where h.finished), '{}')
  from h
  group by h.user_id;
$$;
grant execute on function public.lq_rachas_resumen(uuid) to anon, authenticated;
