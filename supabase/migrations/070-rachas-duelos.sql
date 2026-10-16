-- Rachas y duelos de la quiniela (16-oct, pedido del dueño).
--
-- RACHAS: se calculan en la web a partir de este historial (jornada, hora y
-- si acertó el signo) de los partidos YA empezados de los miembros de una
-- liga. No expone marcadores pronosticados: solo acierto sí/no de partidos
-- terminados, que ya se deduce de la clasificación.
--
-- DUELOS: retas a alguien de tu liga para la próxima jornada que aún no ha
-- empezado; acepta o rechaza hasta el primer partido. Gana quien más puntos
-- saque en esa jornada con el baremo de la liga. Al final de la temporada,
-- quien más duelos gane suma 40 puntos (ajuste en point_adjustments).
-- Todo se escribe por RPC (validan reglas); la tabla solo se lee.

create or replace function public.lq_historial_rachas(p_league_id uuid)
returns table(user_id uuid, matchday int, kickoff_at timestamptz, finished boolean, acierto boolean)
language sql stable security definer set search_path = public as $$
  select p.user_id, m.matchday, m.kickoff_at, m.finished,
         (m.finished and m.score_home is not null and m.score_away is not null
          and sign(m.score_home - m.score_away) = sign(p.score_home - p.score_away)) as acierto
  from public.lq_predictions p
  join public.lq_matches m on m.id = p.match_id
  where m.counts_for_scoring
    and m.kickoff_at <= now()
    and p.user_id in (select lm.user_id from public.league_members lm where lm.league_id = p_league_id);
$$;
grant execute on function public.lq_historial_rachas(uuid) to anon, authenticated;

create table if not exists public.lq_duelos (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  matchday int not null,
  retador uuid not null references auth.users(id) on delete cascade,
  rival uuid not null references auth.users(id) on delete cascade,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aceptado', 'rechazado')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (retador <> rival)
);
create index if not exists lq_duelos_liga_jornada on public.lq_duelos (league_id, matchday);
create unique index if not exists lq_duelos_pareja
  on public.lq_duelos (league_id, matchday, least(retador, rival), greatest(retador, rival));

alter table public.lq_duelos enable row level security;
drop policy if exists duelos_select_miembros on public.lq_duelos;
create policy duelos_select_miembros on public.lq_duelos for select to authenticated
  using (exists (select 1 from public.league_members lm
                 where lm.league_id = lq_duelos.league_id and lm.user_id = auth.uid()));

-- Próxima jornada que aún no ha empezado (su primer partido es futuro).
create or replace function public.lq_jornada_retable()
returns int language sql stable security definer set search_path = public as $$
  select m.matchday from public.lq_matches m
  where m.counts_for_scoring and coalesce(m.status, '') not in ('PST', 'CANC', 'ABD')
  group by m.matchday
  having min(m.kickoff_at) > now()
  order by min(m.kickoff_at)
  limit 1;
$$;
grant execute on function public.lq_jornada_retable() to anon, authenticated;

create or replace function public.lq_retar(p_league_id uuid, p_rival uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  yo uuid := auth.uid();
  j int := public.lq_jornada_retable();
  nuevo uuid;
begin
  if yo is null then raise exception 'sin_sesion'; end if;
  if p_rival = yo then raise exception 'a_ti_mismo'; end if;
  if j is null then raise exception 'sin_jornada'; end if;
  if not exists (select 1 from public.league_members where league_id = p_league_id and user_id = yo)
     or not exists (select 1 from public.league_members where league_id = p_league_id and user_id = p_rival) then
    raise exception 'no_miembro';
  end if;
  if (select count(*) from public.lq_duelos
      where league_id = p_league_id and matchday = j and retador = yo and estado <> 'rechazado') >= 3 then
    raise exception 'max_retos';
  end if;
  insert into public.lq_duelos (league_id, matchday, retador, rival)
  values (p_league_id, j, yo, p_rival)
  returning id into nuevo;
  return nuevo;
exception when unique_violation then
  raise exception 'ya_retado';
end;
$$;
grant execute on function public.lq_retar(uuid, uuid) to authenticated;

create or replace function public.lq_responder_duelo(p_id uuid, p_aceptar boolean)
returns void language plpgsql security definer set search_path = public as $$
declare d public.lq_duelos;
begin
  select * into d from public.lq_duelos where id = p_id;
  if d.id is null or d.rival <> auth.uid() or d.estado <> 'pendiente' then raise exception 'no_valido'; end if;
  if d.matchday is distinct from public.lq_jornada_retable() then raise exception 'cerrado'; end if;
  update public.lq_duelos
     set estado = case when p_aceptar then 'aceptado' else 'rechazado' end, responded_at = now()
   where id = p_id;
end;
$$;
grant execute on function public.lq_responder_duelo(uuid, boolean) to authenticated;

-- Quien reta puede retirar el reto mientras nadie lo haya aceptado.
create or replace function public.lq_retirar_duelo(p_id uuid)
returns void language sql security definer set search_path = public as $$
  delete from public.lq_duelos where id = p_id and retador = auth.uid() and estado = 'pendiente';
$$;
grant execute on function public.lq_retirar_duelo(uuid) to authenticated;

-- Duelos de una liga con los puntos de cada uno en su jornada (baremo de la
-- liga). `terminada`: todos los partidos que cuentan, jugados.
create or replace function public.lq_duelos_liga(p_league_id uuid)
returns table(id uuid, matchday int, retador uuid, retador_nombre text, rival uuid, rival_nombre text,
              estado text, pts_retador int, pts_rival int, terminada boolean, empezada boolean)
language sql stable security definer set search_path = public as $$
  with cfg as (
    select l.lq_points_exact as p_exact, l.lq_points_result as p_result from public.leagues l where l.id = p_league_id
  ),
  jornadas as (
    select m.matchday,
           bool_and(m.finished) filter (where coalesce(m.status, '') not in ('PST', 'CANC', 'ABD')) as terminada,
           min(m.kickoff_at) <= now() as empezada
    from public.lq_matches m where m.counts_for_scoring group by m.matchday
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
  )
  select d.id, d.matchday, d.retador, coalesce(pa.display_name, 'Sin nombre'), d.rival,
         coalesce(pb.display_name, 'Sin nombre'), d.estado,
         coalesce(xa.pts, 0), coalesce(xb.pts, 0),
         coalesce(j.terminada, false), coalesce(j.empezada, false)
  from public.lq_duelos d
  left join public.profiles pa on pa.id = d.retador
  left join public.profiles pb on pb.id = d.rival
  left join jornadas j on j.matchday = d.matchday
  left join puntos xa on xa.user_id = d.retador and xa.matchday = d.matchday
  left join puntos xb on xb.user_id = d.rival and xb.matchday = d.matchday
  where d.league_id = p_league_id
    and exists (select 1 from public.league_members lm where lm.league_id = p_league_id and lm.user_id = auth.uid())
  order by d.matchday desc, d.created_at;
$$;
grant execute on function public.lq_duelos_liga(uuid) to authenticated;
