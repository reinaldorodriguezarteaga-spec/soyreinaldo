-- Encuestas en la ficha del partido (17-oct, pedido del dueño).
--  - 'mvp': "¿Quién fue el mejor del partido?", la crea sola la ficha al
--    terminar el partido con los 5 mejor valorados (una por partido).
--  - 'libre': las crea el admin (Reinaldo) en directo: "¿Penalti o no?".
-- Votar exige sesión: un voto por persona y encuesta (se puede cambiar
-- mientras esté abierta). Los resultados son públicos (solo recuentos).

create table if not exists public.encuestas (
  id uuid primary key default gen_random_uuid(),
  fixture_id int not null,
  tipo text not null default 'libre' check (tipo in ('mvp', 'libre')),
  pregunta text not null check (char_length(pregunta) between 3 and 140),
  opciones jsonb not null,           -- [{"id":"a","texto":"Sí"}, ...]
  cerrada boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists encuestas_fixture on public.encuestas (fixture_id, created_at);
create unique index if not exists encuestas_mvp_unica on public.encuestas (fixture_id) where tipo = 'mvp';

create table if not exists public.encuesta_votos (
  encuesta_id uuid not null references public.encuestas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  opcion text not null,
  created_at timestamptz not null default now(),
  primary key (encuesta_id, user_id)
);

alter table public.encuestas enable row level security;
alter table public.encuesta_votos enable row level security;

drop policy if exists encuestas_select_todos on public.encuestas;
create policy encuestas_select_todos on public.encuestas for select using (true);
drop policy if exists encuestas_admin on public.encuestas;
create policy encuestas_admin on public.encuestas for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

drop policy if exists votos_select_propio on public.encuesta_votos;
create policy votos_select_propio on public.encuesta_votos for select to authenticated
  using (user_id = auth.uid());

-- Votar (o cambiar el voto) valida que la encuesta esté abierta y que la
-- opción exista.
create or replace function public.votar_encuesta(p_encuesta uuid, p_opcion text)
returns void language plpgsql security definer set search_path = public as $$
declare e public.encuestas;
begin
  if auth.uid() is null then raise exception 'sin_sesion'; end if;
  select * into e from public.encuestas where id = p_encuesta;
  if e.id is null or e.cerrada then raise exception 'cerrada'; end if;
  if not exists (select 1 from jsonb_array_elements(e.opciones) o where o->>'id' = p_opcion) then
    raise exception 'opcion';
  end if;
  insert into public.encuesta_votos (encuesta_id, user_id, opcion) values (p_encuesta, auth.uid(), p_opcion)
  on conflict (encuesta_id, user_id) do update set opcion = excluded.opcion, created_at = now();
end;
$$;
grant execute on function public.votar_encuesta(uuid, text) to authenticated;

-- Recuento público de las encuestas de un partido.
create or replace function public.resultados_encuestas(p_fixture int)
returns table(encuesta_id uuid, opcion text, votos int)
language sql stable security definer set search_path = public as $$
  select v.encuesta_id, v.opcion, count(*)::int
  from public.encuesta_votos v
  join public.encuestas e on e.id = v.encuesta_id
  where e.fixture_id = p_fixture
  group by v.encuesta_id, v.opcion;
$$;
grant execute on function public.resultados_encuestas(int) to anon, authenticated;
