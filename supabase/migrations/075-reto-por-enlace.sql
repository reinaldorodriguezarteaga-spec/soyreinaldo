-- Invitar a un amigo a un duelo con un enlace (17-oct, pedido del dueño).
-- /reto/<usuario>?liga=<id>: quien lo abre (con sesión) acepta y el duelo
-- queda ya ACEPTADO para la próxima jornada. Si la liga es pública y aún no
-- está en ella, entra (como al jugar su primer pronóstico); en una liga
-- privada hay que ser miembro (se entra con su código).

create or replace function public.lq_aceptar_invitacion(p_league_id uuid, p_retador uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  yo uuid := auth.uid();
  j int := public.lq_jornada_retable();
  publica boolean;
  nuevo uuid;
begin
  if yo is null then raise exception 'sin_sesion'; end if;
  if p_retador = yo then raise exception 'a_ti_mismo'; end if;
  if j is null then raise exception 'sin_jornada'; end if;
  select is_public into publica from public.leagues where id = p_league_id and kind = 'clubs';
  if publica is null then raise exception 'no_miembro'; end if;
  if not exists (select 1 from public.league_members where league_id = p_league_id and user_id = p_retador) then
    raise exception 'no_miembro';
  end if;
  if not exists (select 1 from public.league_members where league_id = p_league_id and user_id = yo) then
    if not publica then raise exception 'no_miembro'; end if;
    insert into public.league_members (league_id, user_id) values (p_league_id, yo) on conflict do nothing;
  end if;
  insert into public.lq_duelos (league_id, matchday, retador, rival, estado, responded_at)
  values (p_league_id, j, p_retador, yo, 'aceptado', now())
  returning id into nuevo;
  return nuevo;
exception when unique_violation then
  raise exception 'ya_retado';
end;
$$;
grant execute on function public.lq_aceptar_invitacion(uuid, uuid) to authenticated;
