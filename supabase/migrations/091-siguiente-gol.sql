-- «¿Quién marca el siguiente gol?» (23-oct, predicción en directo). Una fila
-- por pronóstico; se resuelve leyendo los goles del partido (lib/partido/
-- siguiente-gol.ts), no aquí. Escribe solo el servidor (server action con
-- service role, que pone el minuto del directo: el usuario no lo elige).

create table if not exists public.siguiente_gol (
  id bigserial primary key,
  fixture_id int not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  minuto int not null check (minuto between 0 and 130),
  eleccion text not null check (eleccion in ('local', 'visitante', 'nadie')),
  created_at timestamptz not null default now(),
  unique (fixture_id, user_id, minuto)
);
create index if not exists siguiente_gol_partido on public.siguiente_gol (fixture_id, minuto);

alter table public.siguiente_gol enable row level security;
drop policy if exists siguiente_gol_propios on public.siguiente_gol;
create policy siguiente_gol_propios on public.siguiente_gol for select to authenticated
  using (user_id = auth.uid());

-- Qué dice la afición desde el último gol (los pronósticos aún abiertos).
create or replace function public.siguiente_gol_reparto(p_fixture int, p_desde int)
returns table(eleccion text, votos int)
language sql stable security definer set search_path = public as $$
  select eleccion, count(*)::int
  from public.siguiente_gol
  where fixture_id = p_fixture and minuto >= p_desde
  group by eleccion;
$$;
grant execute on function public.siguiente_gol_reparto(int, int) to anon, authenticated;
