-- =============================================================================
-- Quinielas privadas anunciadas en el selector, desde el panel de la liga
-- =============================================================================
-- Hasta ahora la lista de privadas que se anuncian en /quiniela-liga (tarjeta
-- con candado para quien aún no es miembro) vivía en el código
-- (`FEATURED_PRIVATE_CODES`): quitar la de Pacha el 2-nov costó un PR. Ahora
-- es una columna que se cambia desde la gestión de la liga.
--
-- Solo el admin del sitio puede anunciar: el selector lo ve todo el mundo y
-- un admin de liga cualquiera no debería poder colgarse ahí.
--
-- Idempotente.
-- =============================================================================

alter table public.leagues
  add column if not exists anunciada boolean not null default false;

-- Lo que enseña la tarjeta: lo mismo que get_league_public_preview, nada del
-- código (que es la llave de entrada).
create or replace function public.ligas_anunciadas()
returns table (
  id uuid,
  name text,
  description text,
  member_count int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    l.id,
    l.name,
    l.description,
    (select count(*)::int from public.league_members m where m.league_id = l.id)
  from public.leagues l
  where l.anunciada and not l.is_public and l.kind = 'clubs'
  order by l.created_at;
$$;

revoke all on function public.ligas_anunciadas() from public;
grant execute on function public.ligas_anunciadas() to anon, authenticated;

create or replace function public.liga_set_anunciada(p_league_id uuid, p_anunciada boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo el admin del sitio puede anunciar ligas' using errcode = '42501';
  end if;
  update public.leagues set anunciada = coalesce(p_anunciada, false) where id = p_league_id;
  if not found then
    raise exception 'Liga no encontrada' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.liga_set_anunciada(uuid, boolean) from public;
grant execute on function public.liga_set_anunciada(uuid, boolean) to authenticated;
