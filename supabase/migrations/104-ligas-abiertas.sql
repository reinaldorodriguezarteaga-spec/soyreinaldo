-- =============================================================================
-- Ligas abiertas: privadas en lo técnico, pero cualquiera entra de un toque
-- =============================================================================
-- `is_public` significa «la general» (la de los Conos): el código da por hecho
-- que solo hay una (enlaces sin ?liga=, baremo de la portada). Para que la
-- «Postquiniela by CarBarça» sea pública (pedido del dueño, 3-nov) sin pisar
-- eso, una columna aparte: `abierta`. Su tarjeta del selector sale sin candado
-- y con «Unirme», y para eso `ligas_anunciadas` devuelve su código (en las
-- cerradas sigue sin devolverlo: es la llave).
--
-- Idempotente.
-- =============================================================================

alter table public.leagues
  add column if not exists abierta boolean not null default false;

-- Cambia el tipo de vuelta: hay que borrarla antes.
drop function if exists public.ligas_anunciadas();

create function public.ligas_anunciadas()
returns table (
  id uuid,
  name text,
  description text,
  member_count int,
  abierta boolean,
  code text
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
    (select count(*)::int from public.league_members m where m.league_id = l.id),
    l.abierta,
    case when l.abierta then l.code end
  from public.leagues l
  where l.anunciada and not l.is_public and l.kind = 'clubs'
  order by l.created_at;
$$;

revoke all on function public.ligas_anunciadas() from public;
grant execute on function public.ligas_anunciadas() to anon, authenticated;

update public.leagues
set abierta = true, anunciada = true
where id = '47cb3129-621e-4936-8a09-d4e202672ad2'; -- Postquiniela by CarBarça
