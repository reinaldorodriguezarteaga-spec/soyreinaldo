-- ⚠️ Aplicar DESPUÉS de desplegar el código que trae
-- /api/cron/recordatorio-quiniela (si no, el cron llamaría a un 404).
--
-- 1. Vigilante cada 3 h (antes 6): el 7-oct la cuota de API-Football llevaba
--    10 días agotándose cada tarde sin que nadie se enterase; ahora el
--    vigilante también mira el ritmo de la cuota y las tablas vacías, y con
--    6 h el aviso podía llegar tarde.
-- 2. Recordatorio de la quiniela: una vez al día, 08:00 UTC (10:00 en España
--    en verano, 09:00 en invierno), con los partidos de las próximas 24 h que
--    cada jugador no ha pronosticado.

select cron.unschedule('vigilante') where exists (
  select 1 from cron.job where jobname = 'vigilante');
select cron.schedule(
  'vigilante',
  '41 */3 * * *',
  $job$
    select net.http_get(
      url := 'https://www.soyreinaldo.com/api/cron/vigilante',
      headers := jsonb_build_object('Authorization', 'Bearer ' || s.decrypted_secret),
      timeout_milliseconds := 55000
    )
    from vault.decrypted_secrets s
    where s.name = 'ingest_cron_secret';
  $job$
);

select cron.unschedule('recordatorio-quiniela') where exists (
  select 1 from cron.job where jobname = 'recordatorio-quiniela');
select cron.schedule(
  'recordatorio-quiniela',
  '0 8 * * *',
  $job$
    select net.http_get(
      url := 'https://www.soyreinaldo.com/api/cron/recordatorio-quiniela',
      headers := jsonb_build_object('Authorization', 'Bearer ' || s.decrypted_secret),
      timeout_milliseconds := 55000
    )
    from vault.decrypted_secrets s
    where s.name = 'ingest_cron_secret';
  $job$
);

-- 3. Resumen de jornada (07:30 UTC): cuando una jornada termina, a cada
--    jugador sus puntos, su puesto y el enlace a su tarjeta para compartir.
--    Una vez por jornada (tabla lq_resumenes_enviados, migración 056).
select cron.unschedule('resumen-jornada') where exists (
  select 1 from cron.job where jobname = 'resumen-jornada');
select cron.schedule(
  'resumen-jornada',
  '30 7 * * *',
  $job$
    select net.http_get(
      url := 'https://www.soyreinaldo.com/api/cron/resumen-jornada',
      headers := jsonb_build_object('Authorization', 'Bearer ' || s.decrypted_secret),
      timeout_milliseconds := 55000
    )
    from vault.decrypted_secrets s
    where s.name = 'ingest_cron_secret';
  $job$
);
