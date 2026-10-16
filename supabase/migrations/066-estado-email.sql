-- Estado de la cuenta de un email, para "Reenviar el correo de confirmación"
-- (/auth/reenviar). Sin cuenta, pendiente de confirmar o ya confirmada: así,
-- a quien ya confirmó le decimos que inicie sesión en vez de mandarle un
-- correo que no sirve. Solo la llama el servidor con la clave de servicio.

create or replace function public.estado_email(p_email text)
returns text
language sql
security definer
set search_path = ''
stable
as $$
  select case
    when u.id is null then 'sin_cuenta'
    when u.email_confirmed_at is null then 'pendiente'
    else 'confirmada'
  end
  from (select 1) as uno
  left join auth.users u on lower(u.email) = lower(trim(p_email))
  limit 1;
$$;

revoke all on function public.estado_email(text) from public, anon, authenticated;
grant execute on function public.estado_email(text) to service_role;
