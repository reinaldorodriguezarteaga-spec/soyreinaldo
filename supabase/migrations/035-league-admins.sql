-- =============================================================================
-- Admins POR LIGA (no admins globales del sitio)
-- =============================================================================
-- Hasta ahora solo existía `profiles.is_admin` (admin de todo soyreinaldo.com).
-- Para poder ceder una liga a un tercero — p.ej. la quiniela de Pacha y su
-- comunidad — hace falta un rol acotado: manda en SU liga y en nada más.
--
-- Un admin de liga puede: ver a sus miembros, expulsarlos, ajustar puntos y
-- editar nombre/descripción/código. NO puede tocar `is_public` ni `kind`
-- (eso decide si la liga sale listada públicamente y sobre qué compite), ni
-- ver ni tocar nada de otras ligas.
-- =============================================================================

-- 1) Rol dentro de la liga.
alter table public.league_members
  add column if not exists role text not null default 'member';
alter table public.league_members drop constraint if exists league_members_role_check;
alter table public.league_members add constraint league_members_role_check
  check (role in ('member','admin'));

create index if not exists idx_league_members_admins
  on public.league_members(league_id) where role = 'admin';

-- 2) Helper. SECURITY DEFINER para no recursar sobre la RLS de league_members
--    cuando se usa dentro de las policies de esa misma tabla.
create or replace function public.is_league_admin(p_league_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.league_members
    where league_id = p_league_id
      and user_id = auth.uid()
      and role = 'admin'
  );
$$;

-- 3) Expulsar: el admin de liga puede echar a miembros normales de SU liga.
--    No puede echar a otro admin (ni a sí mismo por esta vía); salirse uno
--    mismo sigue permitido por `user_id = auth.uid()`.
drop policy if exists "members_delete_self_or_admin" on public.league_members;
create policy "members_delete_self_or_admin"
  on public.league_members for delete
  to authenticated using (
    user_id = auth.uid()
    or public.is_admin()
    or (public.is_league_admin(league_id) and role <> 'admin')
  );

-- 4) Una liga nunca se queda sin admin (evita ligas huérfanas si el admin se
--    sale o se degrada a sí mismo). El admin global siempre puede rescatarla.
create or replace function public.guard_last_league_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_left int;
begin
  if old.role <> 'admin' then return coalesce(new, old); end if;
  if tg_op = 'UPDATE' and new.role = 'admin' then return new; end if;

  select count(*) into v_left
  from public.league_members
  where league_id = old.league_id and role = 'admin'
    and not (user_id = old.user_id);

  if v_left = 0 and not public.is_admin() then
    raise exception 'La liga se quedaría sin admin. Nombra otro antes.'
      using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_guard_last_league_admin on public.league_members;
create trigger trg_guard_last_league_admin
  before delete or update of role on public.league_members
  for each row execute function public.guard_last_league_admin();

-- 5) Ajustes de puntos: el admin de liga puede aplicarlos en SU liga.
drop policy if exists "adj_admin_write" on public.point_adjustments;
create policy "adj_admin_write"
  on public.point_adjustments for all
  to authenticated
  using (public.is_admin() or public.is_league_admin(league_id))
  with check (public.is_admin() or public.is_league_admin(league_id));

-- 6) Editar la liga. Vía RPC en vez de policy porque hay columnas vetadas
--    (`is_public`, `kind`, `created_by`) que una policy no sabe proteger por
--    separado: aquí solo se tocan las tres que sí puede cambiar.
create or replace function public.league_admin_update_meta(
  p_league_id   uuid,
  p_name        text,
  p_description text,
  p_code        text
)
returns public.leagues
language plpgsql
security definer
set search_path = public
as $$
declare v_league public.leagues;
begin
  if not (public.is_admin() or public.is_league_admin(p_league_id)) then
    raise exception 'No mandas en esta liga' using errcode = '42501';
  end if;

  if p_name is null or length(trim(p_name)) < 2 then
    raise exception 'El nombre debe tener al menos 2 caracteres';
  end if;
  if p_code is null or length(trim(p_code)) < 4 or trim(p_code) !~ '^[A-Za-z0-9-]+$' then
    raise exception 'Código inválido (mín. 4 caracteres: letras, números o guiones)';
  end if;

  update public.leagues
  set name        = trim(p_name),
      description = nullif(trim(coalesce(p_description, '')), ''),
      code        = trim(p_code)   -- el trigger lo pasa a mayúsculas
  where id = p_league_id
  returning * into v_league;

  if v_league is null then
    raise exception 'Liga no encontrada' using errcode = 'P0002';
  end if;
  return v_league;
exception
  when unique_violation then
    raise exception 'Ya existe otra liga con el código %', upper(trim(p_code))
      using errcode = '23505';
end;
$$;

revoke all on function public.league_admin_update_meta(uuid, text, text, text) from public;
grant execute on function public.league_admin_update_meta(uuid, text, text, text) to authenticated;

-- 7) La preview pública de /unirse necesita saber a qué quiniela lleva el
--    código para mandar al invitado al sitio correcto (Mundial vs clubes).
drop function if exists public.get_league_public_preview(text);
create function public.get_league_public_preview(p_code text)
returns table (
  id uuid,
  name text,
  description text,
  member_count int,
  kind text,
  is_public boolean
)
language sql
security definer
set search_path = public
as $$
  select
    l.id,
    l.name,
    l.description,
    (select count(*)::int from public.league_members m where m.league_id = l.id) as member_count,
    l.kind,
    l.is_public
  from public.leagues l
  where l.code = upper(trim(p_code));
$$;

revoke all on function public.get_league_public_preview(text) from public;
grant execute on function public.get_league_public_preview(text) to anon, authenticated;

-- 8) Alta sin fricción SOLO para quien no tiene ya liga de clubes.
--    Antes, pronosticar te metía siempre en la liga pública; eso mezclaría a
--    la comunidad de Pacha con la clasificación general. Ahora la liga
--    pública es el destino por defecto únicamente de quien llega sin liga.
create or replace function public.lq_ensure_league()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_league_id uuid;
begin
  if auth.uid() is null then return null; end if;

  select lm.league_id into v_league_id
  from public.league_members lm
  join public.leagues l on l.id = lm.league_id
  where lm.user_id = auth.uid() and l.kind = 'clubs'
  order by l.is_public, l.created_at
  limit 1;

  if v_league_id is not null then return v_league_id; end if;

  select id into v_league_id
  from public.leagues
  where kind = 'clubs' and is_public
  order by created_at
  limit 1;

  if v_league_id is null then return null; end if;

  insert into public.league_members (league_id, user_id)
  values (v_league_id, auth.uid())
  on conflict do nothing;

  return v_league_id;
end;
$$;

revoke all on function public.lq_ensure_league() from public;
grant execute on function public.lq_ensure_league() to authenticated;
