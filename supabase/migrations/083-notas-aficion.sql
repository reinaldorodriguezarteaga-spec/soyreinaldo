-- «Pon nota a los jugadores» (21-oct, pedido del dueño): al terminar el
-- partido, cada aficionado puntúa del 1 al 10 a los que jugaron y la ficha
-- enseña la media de la afición junto a la nota de la API.
--
-- Cada uno escribe y lee solo lo suyo (RLS); las medias son públicas por
-- función. Qué jugadores y hasta cuándo se puede votar lo valida la server
-- action.

create table if not exists public.notas_aficion (
  fixture_id int not null,
  player_id int not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  nota smallint not null check (nota between 1 and 10),
  created_at timestamptz not null default now(),
  primary key (fixture_id, player_id, user_id)
);
create index if not exists notas_aficion_fixture on public.notas_aficion (fixture_id);

alter table public.notas_aficion enable row level security;
drop policy if exists notas_aficion_propias on public.notas_aficion;
create policy notas_aficion_propias on public.notas_aficion for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.notas_aficion_partido(p_fixture int)
returns table(player_id int, media numeric, votos int)
language sql stable security definer set search_path = public as $$
  select player_id, round(avg(nota)::numeric, 1), count(*)::int
  from public.notas_aficion
  where fixture_id = p_fixture
  group by player_id;
$$;
grant execute on function public.notas_aficion_partido(int) to anon, authenticated;
