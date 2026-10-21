-- Quiniela de la Champions (21-oct, pedido del dueño). Sus partidos viven en
-- lq_matches con competition = 'champions' y counts_for_scoring = false: así
-- todas las funciones de LaLiga (clasificación, jornadas, rachas, duelos),
-- que filtran por counts_for_scoring, los ignoran sin tocarlas. Los
-- pronósticos van a lq_predictions (misma RLS: cierre 30 min antes) y la
-- ingesta en vivo los puntúa como cualquier otro partido.
--
-- Clasificación propia, general (todo el que pronostica entra), con el
-- baremo de la liga pública: 5 el exacto y 2 el acierto. Se cuenta el
-- resultado del partido (con prórroga, sin penaltis), como en LaLiga.
-- Matchdays: 1-8 fase liga; 9 playoff, 10 octavos, 11 cuartos, 12 semis,
-- 13 final.

create or replace function public.lq_ranking_competicion(
  p_comp text,
  p_season int,
  p_exacto int default 5,
  p_acierto int default 2,
  p_desde smallint default 1,
  p_hasta smallint default 99
)
returns table(user_id uuid, nombre text, puntos int, exactos int, aciertos int, jugados int)
language sql stable security definer set search_path = public as $$
  select p.user_id,
         coalesce(nullif(pr.display_name, ''), pr.username, 'Anónimo') as nombre,
         sum(case
               when m.score_home = p.score_home and m.score_away = p.score_away then p_exacto
               when sign(m.score_home - m.score_away) = sign(p.score_home - p.score_away) then p_acierto
               else 0 end)::int,
         count(*) filter (where m.score_home = p.score_home and m.score_away = p.score_away)::int,
         count(*) filter (where not (m.score_home = p.score_home and m.score_away = p.score_away)
                            and sign(m.score_home - m.score_away) = sign(p.score_home - p.score_away))::int,
         count(*)::int
  from public.lq_predictions p
  join public.lq_matches m on m.id = p.match_id
  left join public.profiles pr on pr.id = p.user_id
  where m.competition = p_comp and m.season = p_season
    and m.finished and m.score_home is not null and m.score_away is not null
    and m.matchday between p_desde and p_hasta
  group by p.user_id, pr.display_name, pr.username
  order by 3 desc, 4 desc, 6 asc;
$$;
grant execute on function public.lq_ranking_competicion(text, int, int, int, smallint, smallint) to anon, authenticated;
