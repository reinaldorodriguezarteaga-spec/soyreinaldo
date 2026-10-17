-- Premio de duelos automático (17-oct, pedido del dueño): al acabar la
-- temporada, quien más duelos haya ganado en cada liga suma 40 puntos a la
-- general (un ajuste en point_adjustments, visible como los demás).
--
-- Desempate: más ganados, luego mejor diferencia (ganados - perdidos). Si
-- siguen empatados, el premio es para todos ellos. Se da UNA vez por liga y
-- temporada (se busca el ajuste por su motivo antes de insertar).
-- Lo lanza pg_cron cada mañana; mientras quede algún partido de la
-- temporada por jugar (sin contar aplazados ni cancelados) no hace nada.

create or replace function public.lq_tabla_duelos(p_league_id uuid)
returns table(user_id uuid, ganados int, empatados int, perdidos int)
language sql stable security definer set search_path = public as $$
  with cfg as (
    select l.lq_points_exact as p_exact, l.lq_points_result as p_result from public.leagues l where l.id = p_league_id
  ),
  terminadas as (
    select m.matchday from public.lq_matches m where m.counts_for_scoring
    group by m.matchday
    having bool_and(m.finished) filter (where coalesce(m.status, '') not in ('PST', 'CANC', 'ABD'))
  ),
  puntos as (
    select p.user_id, m.matchday,
      sum(case
            when m.score_home = p.score_home and m.score_away = p.score_away then cfg.p_exact
            when sign(m.score_home - m.score_away) = sign(p.score_home - p.score_away) then cfg.p_result
            else 0 end)::int as pts
    from public.lq_predictions p
    join public.lq_matches m on m.id = p.match_id
    cross join cfg
    where m.finished and m.counts_for_scoring and m.score_home is not null and m.score_away is not null
    group by p.user_id, m.matchday
  ),
  resultados as (
    select d.retador, d.rival, coalesce(a.pts, 0) as pa, coalesce(b.pts, 0) as pb
    from public.lq_duelos d
    join terminadas t on t.matchday = d.matchday
    left join puntos a on a.user_id = d.retador and a.matchday = d.matchday
    left join puntos b on b.user_id = d.rival and b.matchday = d.matchday
    where d.league_id = p_league_id and d.estado = 'aceptado'
  ),
  lados as (
    select retador as u, sign(pa - pb) as s from resultados
    union all
    select rival as u, sign(pb - pa) as s from resultados
  )
  select u, (count(*) filter (where s > 0))::int, (count(*) filter (where s = 0))::int, (count(*) filter (where s < 0))::int
  from lados group by u;
$$;
revoke all on function public.lq_tabla_duelos(uuid) from public, anon, authenticated;

create or replace function public.lq_premiar_duelos(p_puntos int default 40)
returns int language plpgsql security definer set search_path = public as $$
declare
  temporada int;
  motivo text;
  liga uuid;
  dados int := 0;
begin
  -- ¿Queda algo por jugar? Entonces aún no.
  if exists (
    select 1 from public.lq_matches m
    where m.counts_for_scoring and not m.finished
      and coalesce(m.status, '') not in ('PST', 'CANC', 'ABD')
  ) then
    return 0;
  end if;
  select max(m.season) into temporada from public.lq_matches m where m.counts_for_scoring;
  if temporada is null then return 0; end if;
  motivo := format('🏆 Campeón de duelos %s-%s', temporada, right((temporada + 1)::text, 2));

  for liga in select distinct d.league_id from public.lq_duelos d where d.estado = 'aceptado' loop
    if exists (select 1 from public.point_adjustments pa where pa.league_id = liga and pa.reason = motivo) then
      continue;
    end if;
    insert into public.point_adjustments (league_id, user_id, delta, reason)
    select liga, t.user_id, p_puntos, motivo
    from public.lq_tabla_duelos(liga) t
    where t.ganados > 0
      and (t.ganados, t.ganados - t.perdidos) = (
        select x.ganados, x.ganados - x.perdidos from public.lq_tabla_duelos(liga) x
        order by x.ganados desc, x.ganados - x.perdidos desc limit 1
      );
    get diagnostics dados = row_count;
  end loop;
  return dados;
end;
$$;
revoke all on function public.lq_premiar_duelos(int) from public, anon, authenticated;

select cron.unschedule('premio-duelos') where exists (select 1 from cron.job where jobname = 'premio-duelos');
select cron.schedule('premio-duelos', '20 6 * * *', $job$ select public.lq_premiar_duelos(40); $job$);
