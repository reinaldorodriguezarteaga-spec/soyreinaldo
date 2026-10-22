-- Ranking de los juegos (22-oct, pedido del dueño: que la gente vuelva). Cada
-- reto del día terminado con sesión deja una fila con sus puntos; cuenta la
-- primera partida del día (en ¿Más o menos?, la mejor). Escribe solo el
-- servidor (server action con service role, que valida juego, día y tope de
-- puntos); el usuario lee lo suyo y la clasificación sale por función pública.

create table if not exists public.juego_resultados (
  user_id uuid not null references auth.users(id) on delete cascade,
  juego text not null check (juego in ('equipo', 'jugador', 'tikitaka', 'leyenda', 'masomenos')),
  dia int not null check (dia > 0),
  nivel text not null check (nivel in ('facil', 'medio', 'dificil')),
  puntos int not null check (puntos between 0 and 1000),
  created_at timestamptz not null default now(),
  primary key (user_id, juego, dia)
);
create index if not exists juego_resultados_fecha on public.juego_resultados (created_at desc);

alter table public.juego_resultados enable row level security;
drop policy if exists juego_resultados_propios on public.juego_resultados;
create policy juego_resultados_propios on public.juego_resultados for select to authenticated
  using (user_id = auth.uid());

-- Clasificación desde un día (1 = siempre; la semana la calcula la web).
create or replace function public.juegos_ranking(p_desde_dia int, p_limite int default 50)
returns table(user_id uuid, nombre text, puntos int, partidas int)
language sql stable security definer set search_path = public as $$
  select r.user_id,
         coalesce(nullif(p.display_name, ''), p.username, 'Anónimo'),
         sum(r.puntos)::int,
         count(*)::int
  from public.juego_resultados r
  left join public.profiles p on p.id = r.user_id
  where r.dia >= p_desde_dia
  group by r.user_id, p.display_name, p.username
  order by 3 desc, 4 asc
  limit p_limite;
$$;
grant execute on function public.juegos_ranking(int, int) to anon, authenticated;
