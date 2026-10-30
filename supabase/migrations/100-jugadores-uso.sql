-- Buscador de jugadores por relevancia (30-oct, pedido del dueño: «más
-- conocidos arriba»). Cuántas veces se ha acertado una casilla del
-- tiki-taka-toe con cada jugador: los que la gente conoce y usa suben.
create table if not exists public.jugadores_uso (
  id int primary key,
  usos int not null default 0
);
alter table public.jugadores_uso enable row level security;
drop policy if exists "jugadores_uso lectura" on public.jugadores_uso;
create policy "jugadores_uso lectura" on public.jugadores_uso for select using (true);

-- Solo el servidor (service role) suma: nadie lo infla desde el navegador.
create or replace function public.sumar_uso_jugador(p_id int)
returns void language sql security definer set search_path = public as $$
  insert into public.jugadores_uso (id, usos) values (p_id, 1)
  on conflict (id) do update set usos = jugadores_uso.usos + 1;
$$;
revoke execute on function public.sumar_uso_jugador(int) from public, anon, authenticated;
