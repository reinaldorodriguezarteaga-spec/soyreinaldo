-- Aviso diario del reto de los juegos (25-nov-2026, pedido del dueño).
-- A las 9:00 UTC (10:00 en invierno en España, 11:00 en verano) push con el
-- juego que toca hoy a quien tenga avisos (web o app), no se haya dado de baja
-- de los recordatorios y NO jugara ayer: a los que sí jugaron ya les llega el
-- de la racha a las 18:00 UTC (migración 090), y así nadie recibe dos.
create or replace function public.juegos_aviso_reto(p_hoy int)
returns table(user_id uuid)
language sql stable security definer set search_path = public as $$
  select p.id
  from public.profiles p
  where coalesce(p.wants_reminders, true)
    and (
      exists (select 1 from public.push_dispositivos d where d.user_id = p.id)
      or exists (select 1 from public.push_subscriptions s where s.user_id = p.id)
    )
    and not exists (
      select 1 from public.juego_resultados r
      where r.user_id = p.id and r.dia in (p_hoy - 1, p_hoy)
    );
$$;
revoke all on function public.juegos_aviso_reto(int) from public, anon, authenticated;

select cron.unschedule('reto-del-dia') where exists (select 1 from cron.job where jobname = 'reto-del-dia');
select cron.schedule(
  'reto-del-dia',
  '0 9 * * *',
  $job$
    select net.http_get(
      url := 'https://www.soyreinaldo.com/api/cron/reto-del-dia',
      headers := jsonb_build_object('Authorization', 'Bearer ' || s.decrypted_secret),
      timeout_milliseconds := 55000
    )
    from vault.decrypted_secrets s
    where s.name = 'ingest_cron_secret';
  $job$
);
