-- =============================================================================
-- Jugadores más buscados (4-nov-2026, pedido del dueño)
-- =============================================================================
-- El buscador ponía a los jugadores en el orden del API: «lamine» no sacaba
-- a Lamine Yamal hasta escribir el nombre entero. Ahora cuenta cada clic en
-- un jugador del buscador (la ruta /jugador/[id] llama a `jugador_buscado`
-- con la service role) y ordena por eso. Con el buscador vacío se enseñan
-- los más buscados. Arranca con las estrellas de siempre para que el
-- ranking no salga vacío el primer día (ids comprobados en las plantillas
-- de `sports_cache` y en `goat_base`).
--
-- Idempotente.
-- =============================================================================

create table if not exists public.jugadores_buscados (
  id int primary key,
  nombre text,
  foto text,
  visitas int not null default 0,
  actualizado timestamptz not null default now()
);

alter table public.jugadores_buscados enable row level security;

drop policy if exists jugadores_buscados_lectura on public.jugadores_buscados;
create policy jugadores_buscados_lectura on public.jugadores_buscados
  for select to anon, authenticated using (true);

-- Suma un clic. El nombre, si aún no lo tenemos, sale de las plantillas
-- cacheadas; un jugador que no está en ellas cuenta igual, pero sin nombre
-- no entra en la lista de «más buscados».
create or replace function public.jugador_buscado(p_id int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre text;
begin
  select p->>'name' into v_nombre
  from public.sports_cache s, jsonb_array_elements(s.data) p
  where s.cache_key like 'squad:%' and (p->>'id')::int = p_id
  limit 1;

  insert into public.jugadores_buscados (id, nombre, foto, visitas)
  values (p_id, v_nombre, 'https://media.api-sports.io/football/players/' || p_id || '.png', 1)
  on conflict (id) do update
    set visitas = jugadores_buscados.visitas + 1,
        nombre = coalesce(jugadores_buscados.nombre, excluded.nombre),
        actualizado = now();
end;
$$;

revoke all on function public.jugador_buscado(int) from public, anon, authenticated;
grant execute on function public.jugador_buscado(int) to service_role;

insert into public.jugadores_buscados (id, nombre, foto, visitas)
select v.id, v.nombre, 'https://media.api-sports.io/football/players/' || v.id || '.png', v.visitas
from (values
  (386828, 'Lamine Yamal', 40),
  (278, 'Kylian Mbappé', 38),
  (154, 'Lionel Messi', 37),
  (874, 'Cristiano Ronaldo', 36),
  (762, 'Vinícius Júnior', 34),
  (133609, 'Pedri', 33),
  (1496, 'Raphinha', 32),
  (129718, 'Jude Bellingham', 31),
  (1100, 'Erling Haaland', 30),
  (521, 'Robert Lewandowski', 28),
  (296667, 'Gavi', 26),
  (1323, 'Dani Olmo', 25),
  (306, 'Mohamed Salah', 24),
  (153, 'Ousmane Dembélé', 23),
  (6009, 'Julián Álvarez', 22),
  (56, 'Antoine Griezmann', 21),
  (217, 'Lautaro Martínez', 20),
  (181812, 'Jamal Musiala', 19)
) as v(id, nombre, visitas)
on conflict (id) do nothing;
