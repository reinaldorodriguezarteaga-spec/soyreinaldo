-- 063 · Boletín semanal programado (13-oct-2026, aprobado por el dueño tras
-- recibir la prueba). Viernes a las 09:00 UTC (10:00 en España en invierno,
-- 11:00 en verano) y repesca el sábado a la misma hora: solo envía a quien
-- se quedara sin él si el límite diario de Resend cortó el viernes
-- (boletin_envios evita repetir dentro de la misma semana).

select cron.unschedule('boletin') where exists (
  select 1 from cron.job where jobname = 'boletin');
select cron.schedule(
  'boletin',
  '0 9 * * 5,6',
  $job$
    select net.http_get(
      url := 'https://www.soyreinaldo.com/api/cron/boletin',
      headers := jsonb_build_object('Authorization', 'Bearer ' || s.decrypted_secret),
      timeout_milliseconds := 290000
    )
    from vault.decrypted_secrets s
    where s.name = 'ingest_cron_secret';
  $job$
);
