-- =============================================================================
-- Entrar a una liga privada con su código volvía a fallar (3-nov-2026)
-- =============================================================================
-- `join_league_by_code` corría con los permisos del usuario, y desde que la
-- RLS de `leagues` solo enseña las ligas públicas o las tuyas (arreglo del
-- código expuesto, 18-ago), quien aún no es miembro de una privada no la
-- «veía»: «El código POSTQUINIELA no existe». Pasa a security definer, como
-- `get_league_public_preview`: busca la liga por el código exacto y mete
-- SOLO a quien llama (auth.uid()); no devuelve nada de otras ligas.
--
-- Idempotente.
-- =============================================================================

create or replace function public.join_league_by_code(p_code text)
returns public.league_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_league_id uuid;
  v_member public.league_members;
begin
  if auth.uid() is null then
    raise exception 'Tienes que iniciar sesión para entrar a una liga';
  end if;

  select id into v_league_id
  from public.leagues
  where code = upper(trim(p_code));

  if v_league_id is null then
    raise exception 'El código % no existe', p_code using errcode = 'P0002';
  end if;

  insert into public.league_members (league_id, user_id)
  values (v_league_id, auth.uid())
  on conflict do nothing
  returning * into v_member;

  if v_member is null then
    select * into v_member
    from public.league_members
    where league_id = v_league_id and user_id = auth.uid();
  end if;

  return v_member;
end;
$$;

revoke all on function public.join_league_by_code(text) from public;
grant execute on function public.join_league_by_code(text) to authenticated;
