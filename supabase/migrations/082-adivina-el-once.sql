-- «Adivina el once» (21-oct, pedido del dueño): antes de cada partido del
-- Barça, cada usuario apuesta el once titular. Al salir la alineación
-- oficial se cuenta cuántos acertó (+1 si clava la formación).
--
-- Escribe solo el servidor (server action con service role, que valida
-- sesión, plazo, formación y plantilla); el usuario solo lee lo suyo. La
-- clasificación y los más elegidos salen por funciones públicas.

create table if not exists public.once_predicciones (
  fixture_id int not null,
  team_id int not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  formacion text not null,
  jugadores int[] not null check (cardinality(jugadores) = 11),
  kickoff_at timestamptz not null,
  aciertos int,
  formacion_ok boolean,
  puntos int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (fixture_id, team_id, user_id)
);
create index if not exists once_pred_pendientes on public.once_predicciones (kickoff_at) where puntos is null;
create index if not exists once_pred_usuario on public.once_predicciones (user_id, kickoff_at desc);

alter table public.once_predicciones enable row level security;
drop policy if exists once_pred_select_propio on public.once_predicciones;
create policy once_pred_select_propio on public.once_predicciones for select to authenticated
  using (user_id = auth.uid());

-- Clasificación de la temporada de un equipo: puntos, partidos y aciertos.
create or replace function public.once_clasificacion(p_team int, p_desde timestamptz, p_limite int default 50)
returns table(user_id uuid, nombre text, puntos int, partidos int, aciertos int)
language sql stable security definer set search_path = public as $$
  select o.user_id,
         coalesce(nullif(p.display_name, ''), p.username, 'Anónimo') as nombre,
         sum(o.puntos)::int, count(*)::int, sum(o.aciertos)::int
  from public.once_predicciones o
  left join public.profiles p on p.id = o.user_id
  where o.team_id = p_team and o.kickoff_at >= p_desde and o.puntos is not null
  group by o.user_id, p.display_name, p.username
  order by 3 desc, 5 desc, 4 asc
  limit p_limite;
$$;
grant execute on function public.once_clasificacion(int, timestamptz, int) to anon, authenticated;

-- Los más elegidos de un partido (cuántas veces sale cada jugador) y el
-- total de predicciones: lo ve todo el mundo, sin saber quién votó qué.
create or replace function public.once_mas_elegidos(p_fixture int, p_team int)
returns table(jugador int, veces int, total int)
language sql stable security definer set search_path = public as $$
  with t as (
    select count(*)::int n from public.once_predicciones where fixture_id = p_fixture and team_id = p_team
  )
  select j, count(*)::int, (select n from t)
  from public.once_predicciones o, unnest(o.jugadores) j
  where o.fixture_id = p_fixture and o.team_id = p_team
  group by j
  order by 2 desc;
$$;
grant execute on function public.once_mas_elegidos(int, int) to anon, authenticated;
