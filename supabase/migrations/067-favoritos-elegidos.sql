-- Selector de favoritos tras iniciar sesión (16-oct, pedido del dueño):
-- primero ligas y luego equipos. Esta marca dice que el usuario ya pasó por
-- él (eligiendo o saltándolo), para no volver a enseñárselo.
alter table public.profiles
  add column if not exists favoritos_elegidos_at timestamptz;

-- Quien ya tiene favoritos no necesita el selector.
update public.profiles p
set favoritos_elegidos_at = now()
where favoritos_elegidos_at is null
  and exists (select 1 from public.user_favorites f where f.user_id = p.id);
