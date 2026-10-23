-- Jugadores que no están en ninguna plantilla guardada (retirados, ligas que
-- no seguimos) y que alguien ha buscado en el tiki-taka o el comparador: el
-- servidor los trae de /players/profiles y los apunta aquí (23-oct, pedido
-- del dueño: «faltan Zambrotta, Pjanić, Arthur, Thuram…»). Sirve también para
-- validar ids: solo se consultan jugadores de plantillas, de la lista curada
-- o de esta tabla.
create table if not exists public.jugadores_api (
  id int primary key,
  nombre text not null,
  foto text,
  nacimiento date,
  creado timestamptz not null default now()
);
alter table public.jugadores_api enable row level security;
drop policy if exists jugadores_api_lectura on public.jugadores_api;
create policy jugadores_api_lectura on public.jugadores_api for select using (true);

create or replace function public.comparador_existe(p_id int)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.jugadores_api where id = p_id)
      or exists (
        select 1 from public.sports_cache s, jsonb_array_elements(s.data) p
        where s.cache_key like 'squad:%' and (p->>'id')::int = p_id
      );
$$;
