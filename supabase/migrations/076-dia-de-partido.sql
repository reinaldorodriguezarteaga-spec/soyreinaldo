-- "Hoy juega tu equipo" (17-oct): aviso push diario a las 09:30 UTC
-- (11:30 en España en horario de verano) a quien tiene "Mi equipo" y juega
-- ese día. Ver src/app/api/cron/dia-de-partido/route.ts.
select cron.unschedule('dia-de-partido') where exists (select 1 from cron.job where jobname = 'dia-de-partido');
select cron.schedule(
  'dia-de-partido',
  '30 9 * * *',
  $job$
    select net.http_get(
      url := 'https://www.soyreinaldo.com/api/cron/dia-de-partido',
      headers := jsonb_build_object('Authorization', 'Bearer ' || s.decrypted_secret),
      timeout_milliseconds := 55000
    )
    from vault.decrypted_secrets s
    where s.name = 'ingest_cron_secret';
  $job$
);
